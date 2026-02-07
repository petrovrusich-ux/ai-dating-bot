import json
import os
import requests
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Создание платежа через Platega.io
    Принимает: user_id, plan_type (flirt/intimate), amount
    Возвращает: payment_url для редиректа пользователя
    '''
    method: str = event.get('httpMethod', 'POST')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    try:
        body_data = json.loads(event.get('body', '{}'))
        user_id: str = body_data.get('user_id')
        plan_type: str = body_data.get('plan_type')
        girl_id: str = body_data.get('girl_id', '')
        
        print(f'DEBUG: Received plan_type={plan_type}, user_id={user_id}, girl_id={girl_id}')
        
        if not user_id or not plan_type:
            return {
                'statusCode': 400,
                'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Missing user_id or plan_type'}),
                'isBase64Encoded': False
            }
        
        # Определяем сумму в зависимости от плана
        prices = {
            'flirt': 1490,
            'intimate': 2390,
            'one_girl': 590,
            'all_girls': 990,
            'all_girls_day': 990,
            'one_girl_day': 590
        }
        amount = prices.get(plan_type, 20)
        print(f'DEBUG: Price for {plan_type} = {amount}')
        
        merchant_id = os.environ['PLATEGA_MERCHANT_ID']
        api_key = os.environ['PLATEGA_API_KEY']
        
        # Создаём платёж через Platega API
        platega_url = 'https://app.platega.io/transaction/process'
        headers = {
            'X-MerchantId': merchant_id,
            'X-Secret': api_key,
            'Content-Type': 'application/json'
        }
        
        # Формируем payload с girl_id для one_girl
        order_payload = f'{user_id}_{plan_type}'
        if girl_id and plan_type in ['one_girl', 'one_girl_day']:
            order_payload += f'_{girl_id}'
        order_payload += f'_{context.request_id}'
        
        payload = {
            'paymentMethod': 2,
            'paymentDetails': {
                'amount': amount,
                'currency': 'RUB'
            },
            'description': f'Подписка {plan_type}',
            'return': f'https://airomance.ru/?payment=success&plan={plan_type}&user={user_id}',
            'failedUrl': 'https://airomance.ru/?payment=failed',
            'payload': order_payload
        }
        
        response = requests.post(platega_url, json=payload, headers=headers, timeout=10)
        response_data = response.json()
        
        if response.status_code == 200 and response_data.get('redirect'):
            return {
                'statusCode': 200,
                'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
                'body': json.dumps({
                    'payment_url': response_data['redirect'],
                    'transaction_id': response_data.get('transactionId')
                }),
                'isBase64Encoded': False
            }
        else:
            return {
                'statusCode': 500,
                'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Failed to create payment', 'details': response_data}),
                'isBase64Encoded': False
            }
            
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }