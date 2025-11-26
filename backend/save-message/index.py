'''
Business: Save and retrieve chat messages for history persistence, get user statistics
Args: event with httpMethod, body for POST (message data), queryStringParameters for GET (user_id, girl_id, stats=true for statistics)
      context with request_id attribute
Returns: Success confirmation on POST, messages array on GET, statistics when stats=true
'''

import json
import os
import psycopg2
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    if method == 'GET':
        params = event.get('queryStringParameters', {})
        user_id = params.get('user_id')
        girl_id = params.get('girl_id')
        get_stats = params.get('stats') == 'true'
        
        if not user_id:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Missing required parameter: user_id'}),
                'isBase64Encoded': False
            }
        
        db_url = os.environ.get('DATABASE_URL')
        if not db_url:
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Database connection not configured'}),
                'isBase64Encoded': False
            }
        
        try:
            conn = psycopg2.connect(db_url)
            cur = conn.cursor()
            
            if get_stats:
                if girl_id:
                    cur.execute(
                        """
                        SELECT user_id, girl_id, total_messages, relationship_level, last_interaction
                        FROM t_p77610913_ai_dating_bot.user_girl_stats
                        WHERE user_id = %s AND girl_id = %s
                        """,
                        (user_id, girl_id)
                    )
                    
                    row = cur.fetchone()
                    
                    if not row:
                        result = {
                            'user_id': user_id,
                            'girl_id': girl_id,
                            'total_messages': 0,
                            'relationship_level': 0,
                            'last_interaction': None
                        }
                    else:
                        result = {
                            'user_id': row[0],
                            'girl_id': row[1],
                            'total_messages': row[2],
                            'relationship_level': row[3],
                            'last_interaction': row[4].isoformat() if row[4] else None
                        }
                else:
                    cur.execute(
                        """
                        SELECT user_id, girl_id, total_messages, relationship_level, last_interaction
                        FROM t_p77610913_ai_dating_bot.user_girl_stats
                        WHERE user_id = %s
                        ORDER BY last_interaction DESC
                        """,
                        (user_id,)
                    )
                    
                    rows = cur.fetchall()
                    
                    result = []
                    for row in rows:
                        stat = {
                            'user_id': row[0],
                            'girl_id': row[1],
                            'total_messages': row[2],
                            'relationship_level': row[3],
                            'last_interaction': row[4].isoformat() if row[4] else None
                        }
                        result.append(stat)
                
                cur.close()
                conn.close()
                
                return {
                    'statusCode': 200,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'stats': result}),
                    'isBase64Encoded': False
                }
            else:
                if not girl_id:
                    return {
                        'statusCode': 400,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': json.dumps({'error': 'Missing required parameter: girl_id'}),
                        'isBase64Encoded': False
                    }
                
                cur.execute(
                    """
                    SELECT id, sender, text, is_nsfw, persona, image_url, created_at
                    FROM t_p77610913_ai_dating_bot.messages
                    WHERE user_id = %s AND girl_id = %s
                    ORDER BY created_at ASC
                    """,
                    (user_id, girl_id)
                )
                
                rows = cur.fetchall()
                
                messages = []
                for row in rows:
                    message = {
                        'id': str(row[0]),
                        'sender': row[1],
                        'text': row[2],
                        'isNSFW': row[3],
                        'persona': row[4],
                        'image': row[5],
                        'timestamp': row[6].isoformat() if row[6] else None
                    }
                    messages.append(message)
                
                cur.close()
                conn.close()
                
                return {
                    'statusCode': 200,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'messages': messages}),
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
    
    user_id = body_data.get('user_id')
    girl_id = body_data.get('girl_id')
    sender = body_data.get('sender')
    text = body_data.get('text')
    is_nsfw = body_data.get('is_nsfw', False)
    persona = body_data.get('persona')
    image_url = body_data.get('image_url')
    
    if not user_id or not girl_id or not sender or not text:
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Missing required fields: user_id, girl_id, sender, text'}),
            'isBase64Encoded': False
        }
    
    db_url = os.environ.get('DATABASE_URL')
    if not db_url:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Database connection not configured'}),
            'isBase64Encoded': False
        }
    
    try:
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        
        cur.execute(
            "INSERT INTO t_p77610913_ai_dating_bot.users (user_id) VALUES (%s) ON CONFLICT (user_id) DO NOTHING",
            (user_id,)
        )
        
        cur.execute(
            """
            INSERT INTO t_p77610913_ai_dating_bot.messages 
            (user_id, girl_id, sender, text, is_nsfw, persona, image_url) 
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (user_id, girl_id, sender, text, is_nsfw, persona, image_url)
        )
        
        message_id = cur.fetchone()[0]
        
        cur.execute(
            """
            INSERT INTO t_p77610913_ai_dating_bot.user_girl_stats 
            (user_id, girl_id, total_messages, last_interaction)
            VALUES (%s, %s, 1, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id, girl_id) 
            DO UPDATE SET 
                total_messages = user_girl_stats.total_messages + 1,
                last_interaction = CURRENT_TIMESTAMP
            """,
            (user_id, girl_id)
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
            'body': json.dumps({'success': True, 'message_id': message_id}),
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