import json
import os
import psycopg2
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Webhook для обработки уведомлений от Platega.io о статусе платежа
    Принимает: данные о транзакции от Platega
    Обновляет: статус подписки пользователя в БД
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
        
        # Логируем все данные от Platega для отладки
        print(f'DEBUG WEBHOOK: Full body_data = {json.dumps(body_data)}')
        print(f'DEBUG WEBHOOK: All keys = {list(body_data.keys())}')
        
        # Platega отправляет: id, status (CONFIRMED), payload
        transaction_id = body_data.get('id') or body_data.get('transaction_id') or body_data.get('transactionId')
        status = body_data.get('status') or body_data.get('transactionStatus')
        order_id = body_data.get('payload') or body_data.get('order_id')
        
        print(f'DEBUG WEBHOOK: transaction_id={transaction_id}, status={status}, order_id={order_id}')
        
        if not status or not order_id:
            print(f'DEBUG WEBHOOK: Missing fields! transaction_id={transaction_id}, status={status}, order_id={order_id}')
            return {
                'statusCode': 400,
                'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Missing required fields', 'received': body_data}),
                'isBase64Encoded': False
            }
        
        # Если платёж успешен (CONFIRMED - это успешная оплата в Platega)
        if status in ['success', 'completed', 'COMPLETED', 'SUCCESS', 'CONFIRMED']:
            print(f'DEBUG WEBHOOK: Payment successful! Processing order_id={order_id}')
            # Парсим order_id
            # Формат: user_id_plan_type_[girl_id_]request_id
            # one_girl: user_123_one_girl_girl456_req789
            # all_girls: user_123_all_girls_req789
            parts = order_id.split('_')
            print(f'DEBUG WEBHOOK: Parsed parts = {parts}')
            if len(parts) >= 2:
                user_id = parts[0]
                girl_id = None
                
                # Определяем plan_type и girl_id
                if len(parts) >= 3 and parts[1] in ['one', 'all']:
                    plan_type = f'{parts[1]}_{parts[2]}'
                    # Для one_girl есть girl_id перед request_id
                    if parts[1] == 'one' and len(parts) >= 5:
                        girl_id = parts[3]
                else:
                    plan_type = parts[1]
                print(f'DEBUG WEBHOOK: user_id={user_id}, plan_type={plan_type}, girl_id={girl_id}')
                
                # Подключаемся к БД и активируем подписку
                conn = psycopg2.connect(os.environ['DATABASE_URL'])
                cur = conn.cursor()
                
                try:
                    # Обновляем подписку в правильной таблице (subscriptions, не user_subscriptions)
                    print(f'DEBUG WEBHOOK: Activating {plan_type} for user {user_id}')
                    
                    # Проверяем, есть ли запись для пользователя
                    cur.execute('SELECT id FROM t_p77610913_ai_dating_bot.subscriptions WHERE user_id = %s', (user_id,))
                    exists = cur.fetchone()
                    
                    if plan_type == 'flirt':
                        if exists:
                            cur.execute("UPDATE t_p77610913_ai_dating_bot.subscriptions SET flirt = TRUE, end_date = CURRENT_TIMESTAMP + INTERVAL '7 days' WHERE user_id = %s", (user_id,))
                        else:
                            cur.execute('''
                                INSERT INTO t_p77610913_ai_dating_bot.subscriptions 
                                (user_id, subscription_type, start_date, end_date, is_active, flirt, intimate, premium, created_at)
                                VALUES (%s, 'paid', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '7 days', TRUE, TRUE, FALSE, FALSE, CURRENT_TIMESTAMP)
                            ''', (user_id,))
                    elif plan_type == 'intimate':
                        if exists:
                            cur.execute("UPDATE t_p77610913_ai_dating_bot.subscriptions SET intimate = TRUE, end_date = CURRENT_TIMESTAMP + INTERVAL '7 days' WHERE user_id = %s", (user_id,))
                        else:
                            cur.execute('''
                                INSERT INTO t_p77610913_ai_dating_bot.subscriptions 
                                (user_id, subscription_type, start_date, end_date, is_active, flirt, intimate, premium, created_at)
                                VALUES (%s, 'paid', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '7 days', TRUE, FALSE, TRUE, FALSE, CURRENT_TIMESTAMP)
                            ''', (user_id,))
                    elif plan_type in ['one_girl', 'one_girl_day']:
                        cur.execute('''
                            INSERT INTO t_p77610913_ai_dating_bot.purchases (user_id, purchase_type, girl_id, expires_at, purchased_at)
                            VALUES (%s, 'one_girl', %s, CURRENT_TIMESTAMP + INTERVAL '1 day', CURRENT_TIMESTAMP)
                        ''', (user_id, girl_id))
                    elif plan_type in ['all_girls', 'all_girls_day']:
                        cur.execute('''
                            INSERT INTO t_p77610913_ai_dating_bot.purchases (user_id, purchase_type, expires_at, purchased_at)
                            VALUES (%s, 'all_girls', CURRENT_TIMESTAMP + INTERVAL '1 day', CURRENT_TIMESTAMP)
                        ''', (user_id,))
                    
                    conn.commit()
                    print(f'DEBUG WEBHOOK: Successfully activated subscription!')
                    
                    return {
                        'statusCode': 200,
                        'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
                        'body': json.dumps({'success': True, 'message': 'Subscription activated'}),
                        'isBase64Encoded': False
                    }
                    
                finally:
                    cur.close()
                    conn.close()
            else:
                print(f'DEBUG WEBHOOK: Not enough parts in order_id: {parts}')
        else:
            print(f'DEBUG WEBHOOK: Payment status is not successful: {status}')
        
        # Для других статусов просто подтверждаем получение
        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
            'body': json.dumps({'success': True, 'message': 'Webhook received'}),
            'isBase64Encoded': False
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }