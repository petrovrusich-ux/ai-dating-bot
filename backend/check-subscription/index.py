'''
Business: Check user subscription status and return active plans
Args: event with httpMethod, queryStringParameters containing user_id
      context with request_id attribute
Returns: User subscription info with active plans and expiry dates
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
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    if method != 'GET':
        return {
            'statusCode': 405,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    params = event.get('queryStringParameters', {})
    user_id = params.get('user_id') if params else None
    
    if not user_id:
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Missing user_id parameter'}),
            'isBase64Encoded': False
        }
    
    result = {
        'user_id': user_id,
        'has_subscription': False,
        'subscription_type': None,
        'subscription_end': None,
        'purchased_girls': [],
        'has_all_girls': False
    }
    
    db_url = os.environ.get('DATABASE_URL')
    if not db_url:
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps(result),
            'isBase64Encoded': False
        }
    
    try:
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        
        cur.execute(
            "SELECT subscription_type, end_date FROM t_p77610913_ai_dating_bot.subscriptions WHERE user_id = %s AND is_active = TRUE AND end_date > CURRENT_TIMESTAMP ORDER BY end_date DESC LIMIT 1",
            (user_id,)
        )
        subscription = cur.fetchone()
        
        if subscription:
            result['has_subscription'] = True
            result['subscription_type'] = subscription[0]
            result['subscription_end'] = subscription[1].isoformat()
        
        cur.execute(
            "SELECT purchase_type, girl_id FROM t_p77610913_ai_dating_bot.purchases WHERE user_id = %s",
            (user_id,)
        )
        purchases = cur.fetchall()
        
        for purchase in purchases:
            purchase_type, girl_id = purchase
            if purchase_type == 'all_girls':
                result['has_all_girls'] = True
            elif purchase_type == 'one_girl' and girl_id:
                if girl_id not in result['purchased_girls']:
                    result['purchased_girls'].append(girl_id)
        
        cur.close()
        conn.close()
        
    except Exception as e:
        pass
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps(result),
        'isBase64Encoded': False
    }