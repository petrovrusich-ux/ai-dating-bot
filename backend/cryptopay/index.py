'''
Бизнес: Создание счета на оплату через CryptoBot с автоконвертацией рублей в USDT
Параметры: event с httpMethod, body содержит plan_type, amount_rub, user_id
          context с атрибутом request_id
Возвращает: URL для оплаты или ошибку
Updated: 2025-12-11 - token refresh trigger
'''

import json
import os
import hmac
import hashlib
import psycopg2
from typing import Dict, Any
from urllib.request import Request, urlopen
from urllib.error import HTTPError

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    # CORS preflight
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    # Обработка webhook от CryptoBot
    if method == 'POST' and event.get('headers', {}).get('crypto-pay-api-signature'):
        return handle_webhook(event, context)
    
    # Создание счета
    if method == 'POST':
        return create_invoice(event, context)
    
    return {
        'statusCode': 405,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({'error': 'Method not allowed'}),
        'isBase64Encoded': False
    }


def create_invoice(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    body_data = json.loads(event.get('body', '{}'))
    plan_type = body_data.get('plan_type')
    amount_rub = body_data.get('amount_rub')
    user_id = body_data.get('user_id', 'anonymous')
    
    if not plan_type or not amount_rub:
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Missing plan_type or amount_rub'}),
            'isBase64Encoded': False
        }
    
    # ВРЕМЕННО: хардкод токена для теста
    api_token = '499519:AArlZTORgms9BUY61Le0JtLlRUR92vJnwbA'
    # api_token = os.environ.get('CRYPTOBOT_API_TOKEN')
    if not api_token:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'CryptoBot API token not configured'}),
            'isBase64Encoded': False
        }
    
    plan_descriptions = {
        'flirt': 'Подписка Флирт - 1 неделя',
        'intimate': 'Подписка Интим - 1 неделя',
        'one_girl': 'Одна девушка - 24 часа',
        'all_girls': 'Все девушки - 24 часа'
    }
    
    description = plan_descriptions.get(plan_type, 'AI Romance подписка')
    
    # Создаем invoice через CryptoBot API (используем GET с query params)
    from urllib.parse import urlencode
    
    # Попробуем POST с JSON телом согласно документации
    invoice_data = {
        'asset': 'USDT',
        'amount': str(amount_rub),
        'description': description,
        'paid_btn_name': 'viewItem',
        'paid_btn_url': f'{event.get("headers", {}).get("origin", "https://app.example.com")}/payment/success',
        'payload': json.dumps({'user_id': user_id, 'plan_type': plan_type})
    }
    
    url = 'https://pay.crypt.bot/api/createInvoice'
    
    headers = {
        'Crypto-Pay-API-Token': api_token,
        'Content-Type': 'application/json'
    }
    
    body = json.dumps(invoice_data).encode('utf-8')
    req = Request(url, data=body, headers=headers, method='POST')
    
    try:
        print(f'Sending to CryptoBot: {url}')
        with urlopen(req) as response:
            response_data = json.loads(response.read().decode('utf-8'))
            print(f'CryptoBot response: {response_data}')
            
            if not response_data.get('ok'):
                print(f'CryptoBot error: {response_data}')
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({
                        'error': 'CryptoBot API error',
                        'details': response_data.get('error')
                    }),
                    'isBase64Encoded': False
                }
            
            result = response_data.get('result', {})
            invoice_id = result.get('invoice_id')
            pay_url = result.get('pay_url')
            
            # Сохраняем в БД
            db_url = os.environ.get('DATABASE_URL')
            if db_url:
                try:
                    conn = psycopg2.connect(db_url)
                    cur = conn.cursor()
                    cur.execute(
                        "INSERT INTO t_p77610913_ai_dating_bot.payments (user_id, payment_id, plan_type, amount, status, payment_url) VALUES (%s, %s, %s, %s, %s, %s)",
                        (user_id, str(invoice_id), plan_type, float(amount_rub), 'pending', pay_url)
                    )
                    conn.commit()
                    cur.close()
                    conn.close()
                except Exception:
                    pass
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'payment_url': pay_url,
                    'invoice_id': invoice_id,
                    'status': result.get('status')
                }),
                'isBase64Encoded': False
            }
    except HTTPError as e:
        error_body = e.read().decode('utf-8')
        print(f'HTTPError: {e.code} - {error_body}')
        return {
            'statusCode': e.code,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': 'Invoice creation failed',
                'details': error_body,
                'status_code': e.code
            }),
            'isBase64Encoded': False
        }
    except Exception as e:
        print(f'Exception: {str(e)}')
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': 'Unexpected error',
                'details': str(e)
            }),
            'isBase64Encoded': False
        }


def handle_webhook(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    body = event.get('body', '')
    signature = event.get('headers', {}).get('crypto-pay-api-signature')
    # ВРЕМЕННО: хардкод токена для теста
    api_token = '499519:AArlZTORgms9BUY61Le0JtLlRUR92vJnwbA'
    # api_token = os.environ.get('CRYPTOBOT_API_TOKEN')
    
    # Проверяем подпись
    secret = hashlib.sha256(api_token.encode()).digest()
    check_string = body
    expected_signature = hmac.new(secret, check_string.encode(), hashlib.sha256).hexdigest()
    
    if signature != expected_signature:
        return {
            'statusCode': 403,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Invalid signature'}),
            'isBase64Encoded': False
        }
    
    # Обрабатываем webhook
    webhook_data = json.loads(body)
    update_type = webhook_data.get('update_type')
    payload_data = webhook_data.get('payload', {})
    
    if update_type == 'invoice_paid':
        invoice_id = payload_data.get('invoice_id')
        status = payload_data.get('status')
        payload_str = payload_data.get('payload', '{}')
        
        try:
            payload_obj = json.loads(payload_str)
            user_id = payload_obj.get('user_id')
            plan_type = payload_obj.get('plan_type')
        except:
            user_id = 'unknown'
            plan_type = 'unknown'
        
        # Обновляем статус в БД
        db_url = os.environ.get('DATABASE_URL')
        if db_url:
            try:
                conn = psycopg2.connect(db_url)
                cur = conn.cursor()
                cur.execute(
                    "UPDATE t_p77610913_ai_dating_bot.payments SET status = %s, updated_at = CURRENT_TIMESTAMP WHERE payment_id = %s",
                    (status, str(invoice_id))
                )
                
                # Активируем подписку
                if status == 'paid':
                    if plan_type == 'flirt':
                        cur.execute(
                            "UPDATE t_p77610913_ai_dating_bot.users SET subscription_type = 'flirt', subscription_expires = CURRENT_TIMESTAMP + interval '7 days' WHERE user_id = %s",
                            (user_id,)
                        )
                    elif plan_type == 'intimate':
                        cur.execute(
                            "UPDATE t_p77610913_ai_dating_bot.users SET subscription_type = 'intimate', subscription_expires = CURRENT_TIMESTAMP + interval '7 days' WHERE user_id = %s",
                            (user_id,)
                        )
                
                conn.commit()
                cur.close()
                conn.close()
            except Exception:
                pass
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json'},
        'body': json.dumps({'ok': True}),
        'isBase64Encoded': False
    }