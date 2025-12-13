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
        
        # Platega отправляет данные о транзакции
        transaction_id = body_data.get('transaction_id')
        status = body_data.get('status')
        order_id = body_data.get('order_id')
        
        if not all([transaction_id, status, order_id]):
            return {
                'statusCode': 400,
                'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Missing required fields'}),
                'isBase64Encoded': False
            }
        
        # Если платёж успешен
        if status == 'success' or status == 'completed':
            # Парсим order_id (формат: user_id_plan_type_request_id)
            parts = order_id.split('_')
            if len(parts) >= 2:
                user_id = parts[0]
                plan_type = parts[1]
                
                # Подключаемся к БД и активируем подписку
                conn = psycopg2.connect(os.environ['DATABASE_URL'])
                cur = conn.cursor()
                
                try:
                    # Обновляем или создаём подписку
                    if plan_type == 'flirt':
                        cur.execute('''
                            INSERT INTO t_p77610913_ai_dating_bot.user_subscriptions (user_id, flirt, updated_at)
                            VALUES (%s, TRUE, CURRENT_TIMESTAMP)
                            ON CONFLICT (user_id)
                            DO UPDATE SET flirt = TRUE, updated_at = CURRENT_TIMESTAMP
                        ''', (user_id,))
                    elif plan_type == 'intimate':
                        cur.execute('''
                            INSERT INTO t_p77610913_ai_dating_bot.user_subscriptions (user_id, intimate, updated_at)
                            VALUES (%s, TRUE, CURRENT_TIMESTAMP)
                            ON CONFLICT (user_id)
                            DO UPDATE SET intimate = TRUE, updated_at = CURRENT_TIMESTAMP
                        ''', (user_id,))
                    elif plan_type in ['one_girl', 'one_girl_day']:
                        cur.execute('''
                            INSERT INTO t_p77610913_ai_dating_bot.user_subscriptions (user_id, one_girl, one_girl_expires_at, updated_at)
                            VALUES (%s, TRUE, CURRENT_TIMESTAMP + INTERVAL '1 day', CURRENT_TIMESTAMP)
                            ON CONFLICT (user_id)
                            DO UPDATE SET one_girl = TRUE, one_girl_expires_at = CURRENT_TIMESTAMP + INTERVAL '1 day', updated_at = CURRENT_TIMESTAMP
                        ''', (user_id,))
                    elif plan_type in ['all_girls', 'all_girls_day']:
                        cur.execute('''
                            INSERT INTO t_p77610913_ai_dating_bot.user_subscriptions (user_id, all_girls, all_girls_expires_at, updated_at)
                            VALUES (%s, TRUE, CURRENT_TIMESTAMP + INTERVAL '1 day', CURRENT_TIMESTAMP)
                            ON CONFLICT (user_id)
                            DO UPDATE SET all_girls = TRUE, all_girls_expires_at = CURRENT_TIMESTAMP + INTERVAL '1 day', updated_at = CURRENT_TIMESTAMP
                        ''', (user_id,))
                    
                    conn.commit()
                    
                    return {
                        'statusCode': 200,
                        'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
                        'body': json.dumps({'success': True, 'message': 'Subscription activated'}),
                        'isBase64Encoded': False
                    }
                    
                finally:
                    cur.close()
                    conn.close()
        
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