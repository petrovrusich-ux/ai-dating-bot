'''
Business: Handle YooKassa webhook notifications for payment status updates
Args: event with httpMethod, body containing payment notification
      context with request_id attribute
Returns: Success confirmation or error
'''

import json
import os
import psycopg2
from typing import Dict, Any
from datetime import datetime, timedelta

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
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
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    body_data = json.loads(event.get('body', '{}'))
    
    event_type = body_data.get('event')
    payment_obj = body_data.get('object', {})
    payment_id = payment_obj.get('id')
    status = payment_obj.get('status')
    metadata = payment_obj.get('metadata', {})
    
    if not payment_id or not status:
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Missing payment data'}),
            'isBase64Encoded': False
        }
    
    db_url = os.environ.get('DATABASE_URL')
    if not db_url:
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'status': 'ok'}),
            'isBase64Encoded': False
        }
    
    try:
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        
        cur.execute(
            "UPDATE t_p77610913_ai_dating_bot.payments SET status = %s, updated_at = CURRENT_TIMESTAMP WHERE payment_id = %s",
            (status, payment_id)
        )
        
        if status == 'succeeded' and event_type == 'payment.succeeded':
            user_id = metadata.get('user_id')
            plan_type = metadata.get('plan_type')
            girl_id = metadata.get('girl_id')
            
            if user_id and plan_type:
                if plan_type in ['flirt', 'intimate']:
                    end_date = datetime.now() + timedelta(days=30)
                    cur.execute(
                        "INSERT INTO t_p77610913_ai_dating_bot.subscriptions (user_id, subscription_type, end_date) VALUES (%s, %s, %s)",
                        (user_id, plan_type, end_date)
                    )
                elif plan_type in ['one_girl', 'all_girls']:
                    cur.execute(
                        "INSERT INTO t_p77610913_ai_dating_bot.purchases (user_id, purchase_type, girl_id) VALUES (%s, %s, %s)",
                        (user_id, plan_type, girl_id)
                    )
        
        conn.commit()
        cur.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'status': 'ok'}),
            'isBase64Encoded': False
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }
