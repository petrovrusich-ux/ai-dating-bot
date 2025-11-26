'''
Business: Create payment for subscription or one-time purchase via YooKassa
Args: event with httpMethod, body containing plan_type, amount, user_id
      context with request_id attribute
Returns: Payment confirmation URL or error
'''

import json
import os
import uuid
import base64
import psycopg2
from typing import Dict, Any
from urllib.request import Request, urlopen
from urllib.error import HTTPError

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
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
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    body_data = json.loads(event.get('body', '{}'))
    plan_type = body_data.get('plan_type')
    amount = body_data.get('amount')
    user_id = body_data.get('user_id', 'anonymous')
    girl_id = body_data.get('girl_id')
    
    db_url = os.environ.get('DATABASE_URL')
    conn = None
    
    try:
        if db_url:
            conn = psycopg2.connect(db_url)
            cur = conn.cursor()
            
            cur.execute(
                "INSERT INTO t_p77610913_ai_dating_bot.users (user_id) VALUES (%s) ON CONFLICT (user_id) DO UPDATE SET last_active = CURRENT_TIMESTAMP",
                (user_id,)
            )
            conn.commit()
            cur.close()
    except Exception as e:
        if conn:
            conn.rollback()
        pass
    
    if not plan_type or not amount:
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Missing plan_type or amount'}),
            'isBase64Encoded': False
        }
    
    shop_id = os.environ.get('YOOKASSA_SHOP_ID')
    secret_key = os.environ.get('YOOKASSA_SECRET_KEY')
    
    payment_id = str(uuid.uuid4())
    
    if db_url and conn:
        try:
            cur = conn.cursor()
            cur.execute(
                "INSERT INTO t_p77610913_ai_dating_bot.payments (user_id, payment_id, plan_type, amount, status, payment_url) VALUES (%s, %s, %s, %s, %s, %s)",
                (user_id, payment_id, plan_type, float(amount), 'pending', 'demo' if not shop_id else 'processing')
            )
            conn.commit()
            cur.close()
        except Exception as e:
            if conn:
                conn.rollback()
    
    if not shop_id or not secret_key:
        if conn:
            conn.close()
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'payment_url': 'https://demo.yookassa.ru/test-payment',
                'payment_id': payment_id,
                'status': 'pending',
                'demo_mode': True
            }),
            'isBase64Encoded': False
        }
    
    plan_descriptions = {
        'flirt': 'Подписка "Флирт" на 1 месяц',
        'intimate': 'Подписка "Интим" на 1 месяц',
        'one_girl': f'Разблокировка одной девушки (NSFW)',
        'all_girls': 'Разблокировка всех девушек (NSFW)'
    }
    
    description = plan_descriptions.get(plan_type, 'AI Romance подписка')
    
    idempotence_key = str(uuid.uuid4())
    
    payment_data = {
        'amount': {
            'value': f'{amount:.2f}',
            'currency': 'RUB'
        },
        'confirmation': {
            'type': 'redirect',
            'return_url': f'{event.get("headers", {}).get("origin", "https://app.example.com")}/payment/success'
        },
        'capture': True,
        'description': description,
        'metadata': {
            'user_id': user_id,
            'plan_type': plan_type,
            'girl_id': girl_id or 'all'
        }
    }
    
    auth_string = f'{shop_id}:{secret_key}'
    auth_bytes = auth_string.encode('utf-8')
    auth_b64 = base64.b64encode(auth_bytes).decode('utf-8')
    
    headers = {
        'Authorization': f'Basic {auth_b64}',
        'Idempotence-Key': idempotence_key,
        'Content-Type': 'application/json'
    }
    
    req = Request(
        'https://api.yookassa.ru/v3/payments',
        data=json.dumps(payment_data).encode('utf-8'),
        headers=headers,
        method='POST'
    )
    
    try:
        with urlopen(req) as response:
            response_data = json.loads(response.read().decode('utf-8'))
            
            confirmation_url = response_data.get('confirmation', {}).get('confirmation_url')
            yookassa_payment_id = response_data.get('id')
            
            if db_url and conn:
                try:
                    cur = conn.cursor()
                    cur.execute(
                        "UPDATE t_p77610913_ai_dating_bot.payments SET payment_id = %s, payment_url = %s, status = %s, updated_at = CURRENT_TIMESTAMP WHERE payment_id = %s",
                        (yookassa_payment_id, confirmation_url, response_data.get('status'), payment_id)
                    )
                    conn.commit()
                    cur.close()
                except Exception:
                    if conn:
                        conn.rollback()
            
            if conn:
                conn.close()
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'payment_url': confirmation_url,
                    'payment_id': yookassa_payment_id,
                    'status': response_data.get('status')
                }),
                'isBase64Encoded': False
            }
    except HTTPError as e:
        error_body = e.read().decode('utf-8')
        if conn:
            conn.close()
        return {
            'statusCode': e.code,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': 'Payment creation failed',
                'details': error_body
            }),
            'isBase64Encoded': False
        }