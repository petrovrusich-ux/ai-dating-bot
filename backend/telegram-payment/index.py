import json
import os
import urllib.request
import urllib.parse
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Создаёт Telegram invoice для оплаты через Stars и обрабатывает webhook успешных платежей
    '''
    method = event.get('httpMethod', 'POST')
    
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
    
    bot_token = os.environ.get('TELEGRAM_BOT_TOKEN')
    if not bot_token:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Bot token not configured'}),
            'isBase64Encoded': False
        }
    
    if method == 'POST':
        body_data = json.loads(event.get('body', '{}'))
        action = body_data.get('action', 'create_invoice')
        
        if action == 'webhook':
            update = body_data.get('update', {})
            if 'pre_checkout_query' in update:
                query_id = update['pre_checkout_query']['id']
                answer_url = f'https://api.telegram.org/bot{bot_token}/answerPreCheckoutQuery'
                answer_data = json.dumps({'ok': True, 'pre_checkout_query_id': query_id}).encode()
                
                req = urllib.request.Request(
                    answer_url,
                    data=answer_data,
                    headers={'Content-Type': 'application/json'}
                )
                urllib.request.urlopen(req)
                
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'status': 'ok'}),
                'isBase64Encoded': False
            }
        
        telegram_id = body_data.get('telegram_id')
        plan_type = body_data.get('plan_type', 'flirt')
        
        if not telegram_id:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'telegram_id required'}),
                'isBase64Encoded': False
            }
        
        prices = {
            'flirt': {'amount': 1, 'title': 'Тариф Флирт', 'description': '20 базовых + флирт сообщения'},
            'intimate': {'amount': 2, 'title': 'Тариф Интим', 'description': '20 базовых + флирт + интим сообщения'}
        }
        
        plan = prices.get(plan_type, prices['flirt'])
        
        invoice_payload = {
            'title': plan['title'],
            'description': plan['description'],
            'payload': json.dumps({'plan_type': plan_type, 'telegram_id': telegram_id}),
            'currency': 'XTR',
            'prices': [{'label': plan['title'], 'amount': plan['amount']}]
        }
        
        api_url = f'https://api.telegram.org/bot{bot_token}/createInvoiceLink'
        invoice_data = json.dumps(invoice_payload).encode()
        
        req = urllib.request.Request(
            api_url,
            data=invoice_data,
            headers={'Content-Type': 'application/json'}
        )
        
        response = urllib.request.urlopen(req)
        result = json.loads(response.read().decode())
        
        if result.get('ok'):
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'invoice_link': result['result']}),
                'isBase64Encoded': False
            }
        else:
            return {
                'statusCode': 500,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': result.get('description', 'Failed to create invoice')}),
                'isBase64Encoded': False
            }
    
    return {
        'statusCode': 405,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': 'Method not allowed'}),
        'isBase64Encoded': False
    }
