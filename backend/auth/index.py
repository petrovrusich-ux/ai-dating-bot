'''
Business: Authentication + user data - register, login, validate tokens, subscriptions, messages
Args: event with httpMethod, body/params depending on action
Returns: JWT tokens, user data, subscription info, messages
'''

import json
import os
import jwt
import bcrypt
import psycopg2
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'POST')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    try:
        if method == 'POST':
            body_str = event.get('body', '{}')
            body_data = json.loads(body_str) if isinstance(body_str, str) else body_str
            action = body_data.get('action')
            
            if action == 'register':
                return handle_register(body_data)
            elif action == 'login':
                return handle_login(body_data)
            elif action == 'validate':
                return handle_validate(event)
            elif action == 'save_message':
                return handle_save_message(body_data)
            elif action == 'delete_chat':
                return handle_delete_chat(body_data)
            else:
                return error_response(400, 'Invalid action')
        
        elif method == 'GET':
            params = event.get('queryStringParameters', {}) or {}
            
            if 'subscription' in params:
                return handle_check_subscription(params)
            elif 'messages' in params:
                return handle_get_messages(params)
            elif 'stats' in params:
                return handle_get_stats(params)
            elif 'active_chats' in params:
                return handle_get_active_chats(params)
            else:
                return error_response(400, 'Invalid GET request')
        
        else:
            return error_response(405, 'Method not allowed')
    
    except Exception as e:
        return error_response(500, str(e))

def error_response(status: int, message: str) -> Dict[str, Any]:
    return {
        'statusCode': status,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({'error': message}),
        'isBase64Encoded': False
    }

def success_response(data: Dict[str, Any]) -> Dict[str, Any]:
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps(data),
        'isBase64Encoded': False
    }

def get_db_connection():
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        raise Exception('DATABASE_URL not configured')
    return psycopg2.connect(database_url)

def generate_token(user_id: int, email: str) -> str:
    jwt_secret = os.environ.get('JWT_SECRET')
    if not jwt_secret:
        raise Exception('JWT_SECRET not configured')
    
    payload = {
        'user_id': user_id,
        'email': email,
        'exp': datetime.utcnow() + timedelta(days=30)
    }
    
    return jwt.encode(payload, jwt_secret, algorithm='HS256')

def verify_token(token: str) -> Optional[Dict[str, Any]]:
    jwt_secret = os.environ.get('JWT_SECRET')
    if not jwt_secret:
        return None
    
    try:
        payload = jwt.decode(token, jwt_secret, algorithms=['HS256'])
        return payload
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None

def handle_register(body_data: Dict[str, Any]) -> Dict[str, Any]:
    email = body_data.get('email', '').strip().lower()
    password = body_data.get('password', '')
    name = body_data.get('name', '').strip()
    
    if not email or not password or not name:
        return error_response(400, 'Email, password and name are required')
    
    if len(password) < 6:
        return error_response(400, 'Password must be at least 6 characters')
    
    if '@' not in email or '.' not in email:
        return error_response(400, 'Invalid email format')
    
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("SELECT id FROM t_p77610913_ai_dating_bot.users WHERE email = %s", (email,))
        if cur.fetchone():
            cur.close()
            conn.close()
            return error_response(400, 'Email already registered')
        
        password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        import uuid
        user_id_str = str(uuid.uuid4())
        
        cur.execute(
            "INSERT INTO t_p77610913_ai_dating_bot.users (user_id, email, password_hash, name, created_at, last_active) VALUES (%s, %s, %s, %s, NOW(), NOW()) RETURNING id",
            (user_id_str, email, password_hash, name)
        )
        user_id = cur.fetchone()[0]
        
        cur.execute(
            "INSERT INTO t_p77610913_ai_dating_bot.subscriptions (user_id, subscription_type, end_date, flirt, intimate, premium) VALUES (%s, %s, %s, false, false, false)",
            (user_id_str, 'free', '2099-12-31')
        )
        conn.commit()
        cur.close()
        conn.close()
        
        token = generate_token(user_id, email)
        
        return success_response({
            'success': True,
            'token': token,
            'user': {
                'id': user_id,
                'user_id': user_id_str,
                'email': email,
                'name': name,
                'subscription': {
                    'subscription_type': 'free',
                    'end_date': '2099-12-31',
                    'flirt': False,
                    'intimate': False,
                    'premium': False
                }
            }
        })
    
    except Exception as e:
        return error_response(500, f'Registration failed: {str(e)}')

def handle_login(body_data: Dict[str, Any]) -> Dict[str, Any]:
    email = body_data.get('email', '').strip().lower()
    password = body_data.get('password', '')
    
    if not email or not password:
        return error_response(400, 'Email and password are required')
    
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute(
            "SELECT id, email, password_hash, name, user_id FROM t_p77610913_ai_dating_bot.users WHERE email = %s",
            (email,)
        )
        user = cur.fetchone()
        
        if not user:
            cur.close()
            conn.close()
            return error_response(401, 'Invalid email or password')
        
        user_id, user_email, password_hash, name, user_id_str = user
        
        if not password_hash or not bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8')):
            cur.close()
            conn.close()
            return error_response(401, 'Invalid email or password')
        
        cur.execute(
            "SELECT subscription_type, end_date, flirt, intimate, premium FROM t_p77610913_ai_dating_bot.subscriptions WHERE user_id = %s",
            (user_id_str,)
        )
        subscription = cur.fetchone()
        
        subscription_data = {
            'subscription_type': subscription[0] if subscription else 'free',
            'end_date': subscription[1].isoformat() if subscription and subscription[1] else None,
            'flirt': subscription[2] if subscription else False,
            'intimate': subscription[3] if subscription else False,
            'premium': subscription[4] if subscription else False
        }
        
        cur.execute("UPDATE t_p77610913_ai_dating_bot.users SET last_active = NOW() WHERE id = %s", (user_id,))
        conn.commit()
        cur.close()
        conn.close()
        
        token = generate_token(user_id, user_email)
        
        return success_response({
            'success': True,
            'token': token,
            'user': {
                'id': user_id,
                'user_id': user_id_str,
                'email': user_email,
                'name': name,
                'subscription': subscription_data
            }
        })
    
    except Exception as e:
        return error_response(500, f'Login failed: {str(e)}')

def handle_validate(event: Dict[str, Any]) -> Dict[str, Any]:
    headers = event.get('headers', {})
    token = headers.get('X-Auth-Token') or headers.get('x-auth-token')
    
    if not token:
        return error_response(401, 'No token provided')
    
    payload = verify_token(token)
    if not payload:
        return error_response(401, 'Invalid or expired token')
    
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute(
            """SELECT u.id, u.email, u.name, u.user_id, s.flirt, s.intimate, s.premium
               FROM t_p77610913_ai_dating_bot.users u
               LEFT JOIN t_p77610913_ai_dating_bot.subscriptions s ON u.user_id = s.user_id
               WHERE u.id = %s""",
            (payload['user_id'],)
        )
        user = cur.fetchone()
        
        if not user:
            cur.close()
            conn.close()
            return error_response(401, 'User not found')
        
        user_id, email, name, user_id_str, flirt, intimate, premium = user
        cur.close()
        conn.close()
        
        return success_response({
            'valid': True,
            'user': {
                'id': user_id,
                'user_id': user_id_str,
                'email': email,
                'name': name,
                'subscription': {'flirt': flirt or False, 'intimate': intimate or False, 'premium': premium or False}
            }
        })
    
    except Exception as e:
        return error_response(500, f'Validation failed: {str(e)}')

def handle_check_subscription(params: Dict[str, str]) -> Dict[str, Any]:
    user_id = params.get('user_id')
    if not user_id:
        return error_response(400, 'Missing user_id parameter')
    
    result = {
        'user_id': user_id, 
        'has_subscription': False, 
        'subscription_type': None, 
        'subscription_end': None, 
        'purchased_girls': [], 
        'has_all_girls': False,
        'flirt': False,
        'intimate': False
    }
    
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute(
            "SELECT flirt, intimate, end_date FROM t_p77610913_ai_dating_bot.subscriptions WHERE user_id = %s",
            (user_id,)
        )
        subscription_features = cur.fetchone()
        
        if subscription_features:
            flirt_flag = subscription_features[0] or False
            intimate_flag = subscription_features[1] or False
            end_date = subscription_features[2]
            
            # Проверяем, что подписка не истекла
            if end_date and end_date > datetime.now():
                result['flirt'] = flirt_flag
                result['intimate'] = intimate_flag
                result['has_subscription'] = True
                result['subscription_end'] = end_date.isoformat()
            else:
                result['flirt'] = False
                result['intimate'] = False
        
        cur.execute(
            "SELECT subscription_type FROM t_p77610913_ai_dating_bot.subscriptions WHERE user_id = %s AND is_active = TRUE ORDER BY end_date DESC LIMIT 1",
            (user_id,)
        )
        subscription = cur.fetchone()
        
        if subscription:
            result['subscription_type'] = subscription[0]
        
        cur.execute(
            "SELECT purchase_type, girl_id FROM t_p77610913_ai_dating_bot.purchases WHERE user_id = %s AND expires_at > CURRENT_TIMESTAMP", 
            (user_id,)
        )
        purchases = cur.fetchall()
        
        for purchase_type, girl_id in purchases:
            if purchase_type == 'all_girls':
                result['has_all_girls'] = True
            elif purchase_type == 'one_girl' and girl_id and girl_id not in result['purchased_girls']:
                result['purchased_girls'].append(girl_id)
        
        cur.execute(
            "SELECT total_messages, last_reset_date FROM t_p77610913_ai_dating_bot.user_message_stats WHERE user_id = %s",
            (user_id,)
        )
        message_stats = cur.fetchone()
        
        if message_stats:
            total_messages = message_stats[0]
            last_reset = message_stats[1]
            
            if last_reset and last_reset < datetime.now().date():
                cur.execute(
                    "UPDATE t_p77610913_ai_dating_bot.user_message_stats SET total_messages = 0, last_reset_date = CURRENT_DATE WHERE user_id = %s",
                    (user_id,)
                )
                conn.commit()
                total_messages = 0
            
            result['total_messages'] = total_messages
        else:
            result['total_messages'] = 0
        
        cur.execute(
            "SELECT purchase_type, girl_id, expires_at FROM t_p77610913_ai_dating_bot.purchases WHERE user_id = %s AND expires_at > CURRENT_TIMESTAMP",
            (user_id,)
        )
        active_purchases = cur.fetchall()
        has_active_purchase = len(active_purchases) > 0
        
        print(f'DEBUG CHECK_SUB: user={user_id}, active_purchases={active_purchases}, count={len(active_purchases)}')
        
        if active_purchases:
            result['purchase_type'] = active_purchases[0][0]
            result['purchase_expires'] = active_purchases[0][2].isoformat()
            
            print(f'DEBUG CHECK_SUB: Activating {result["purchase_type"]}, setting intimate=True')
            
            # Активируем режимы для разовых покупок
            if result['purchase_type'] == 'all_girls':
                result['intimate'] = True  # Все девушки на 24 часа = доступ к Интиму
            elif result['purchase_type'] == 'one_girl':
                result['intimate'] = True  # Одна девушка на 24 часа = доступ к Интиму
        
        if result['intimate'] or has_active_purchase:
            result['message_limit'] = None
            result['can_send_message'] = True
        elif result['flirt']:
            result['message_limit'] = 50
            result['can_send_message'] = result['total_messages'] < 50
        else:
            result['message_limit'] = 20
            result['can_send_message'] = result['total_messages'] < 20
        
        print(f'DEBUG CHECK_SUB: Final result = {result}')
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f'DEBUG CHECK_SUB ERROR: {str(e)}')
        pass
    
    return success_response(result)

def handle_get_messages(params: Dict[str, str]) -> Dict[str, Any]:
    user_id = params.get('user_id')
    girl_id = params.get('girl_id')
    
    if not user_id or not girl_id:
        return error_response(400, 'Missing user_id or girl_id')
    
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute(
            "SELECT id, sender, text, is_nsfw, persona, image_url, created_at FROM t_p77610913_ai_dating_bot.messages WHERE user_id = %s AND girl_id = %s ORDER BY created_at ASC",
            (user_id, girl_id)
        )
        rows = cur.fetchall()
        
        messages = [{'id': str(row[0]), 'sender': row[1], 'text': row[2], 'isNSFW': row[3], 'persona': row[4], 'image': row[5], 'timestamp': row[6].isoformat() if row[6] else None} for row in rows]
        
        cur.close()
        conn.close()
        
        return success_response({'messages': messages})
    
    except Exception as e:
        return error_response(500, str(e))

def handle_get_stats(params: Dict[str, str]) -> Dict[str, Any]:
    user_id = params.get('user_id')
    girl_id = params.get('girl_id')
    
    if not user_id:
        return error_response(400, 'Missing user_id')
    
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        if girl_id:
            cur.execute(
                "SELECT user_id, girl_id, total_messages, relationship_level, last_interaction FROM t_p77610913_ai_dating_bot.user_girl_stats WHERE user_id = %s AND girl_id = %s",
                (user_id, girl_id)
            )
            row = cur.fetchone()
            result = {'user_id': user_id, 'girl_id': girl_id, 'total_messages': 0, 'relationship_level': 0, 'last_interaction': None} if not row else {'user_id': row[0], 'girl_id': row[1], 'total_messages': row[2], 'relationship_level': row[3], 'last_interaction': row[4].isoformat() if row[4] else None}
        else:
            cur.execute(
                "SELECT user_id, girl_id, total_messages, relationship_level, last_interaction FROM t_p77610913_ai_dating_bot.user_girl_stats WHERE user_id = %s ORDER BY last_interaction DESC",
                (user_id,)
            )
            rows = cur.fetchall()
            result = [{'user_id': row[0], 'girl_id': row[1], 'total_messages': row[2], 'relationship_level': row[3], 'last_interaction': row[4].isoformat() if row[4] else None} for row in rows]
        
        cur.close()
        conn.close()
        
        return success_response({'stats': result})
    
    except Exception as e:
        return error_response(500, str(e))

def handle_save_message(body_data: Dict[str, Any]) -> Dict[str, Any]:
    user_id = body_data.get('user_id')
    girl_id = body_data.get('girl_id')
    sender = body_data.get('sender')
    text = body_data.get('text')
    is_nsfw = body_data.get('is_nsfw', False)
    persona = body_data.get('persona')
    image_url = body_data.get('image_url')
    
    if not user_id or not girl_id or not sender or not text:
        return error_response(400, 'Missing required fields')
    
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute(
            "INSERT INTO t_p77610913_ai_dating_bot.messages (user_id, girl_id, sender, text, is_nsfw, persona, image_url, created_at) VALUES (%s, %s, %s, %s, %s, %s, %s, NOW()) RETURNING id",
            (user_id, girl_id, sender, text, is_nsfw, persona, image_url)
        )
        message_id = cur.fetchone()[0]
        
        cur.execute(
            "INSERT INTO t_p77610913_ai_dating_bot.user_girl_stats (user_id, girl_id, total_messages, relationship_level, last_interaction) VALUES (%s, %s, 1, 0, NOW()) ON CONFLICT (user_id, girl_id) DO UPDATE SET total_messages = t_p77610913_ai_dating_bot.user_girl_stats.total_messages + 1, last_interaction = NOW()",
            (user_id, girl_id)
        )
        
        if sender == 'user':
            cur.execute(
                """
                INSERT INTO t_p77610913_ai_dating_bot.user_message_stats (user_id, total_messages, updated_at)
                VALUES (%s, 1, CURRENT_TIMESTAMP)
                ON CONFLICT (user_id) DO UPDATE 
                SET total_messages = t_p77610913_ai_dating_bot.user_message_stats.total_messages + 1,
                    updated_at = CURRENT_TIMESTAMP
                """,
                (user_id,)
            )
        
        conn.commit()
        cur.close()
        conn.close()
        
        return success_response({'success': True, 'message_id': message_id})
    
    except Exception as e:
        return error_response(500, str(e))

def handle_delete_chat(body_data: Dict[str, Any]) -> Dict[str, Any]:
    user_id = body_data.get('user_id')
    girl_id = body_data.get('girl_id')
    
    if not user_id or not girl_id:
        return error_response(400, 'Missing user_id or girl_id')
    
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute(
            "DELETE FROM t_p77610913_ai_dating_bot.messages WHERE user_id = %s AND girl_id = %s",
            (user_id, girl_id)
        )
        
        cur.execute(
            "DELETE FROM t_p77610913_ai_dating_bot.user_girl_stats WHERE user_id = %s AND girl_id = %s",
            (user_id, girl_id)
        )
        
        conn.commit()
        cur.close()
        conn.close()
        
        return success_response({'success': True, 'deleted': True})
    
    except Exception as e:
        return error_response(500, str(e))

def handle_get_active_chats(params: Dict[str, str]) -> Dict[str, Any]:
    user_id = params.get('user_id')
    
    if not user_id:
        return error_response(400, 'Missing user_id')
    
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute(
            "SELECT girl_id, total_messages, relationship_level, last_interaction FROM t_p77610913_ai_dating_bot.user_girl_stats WHERE user_id = %s ORDER BY last_interaction DESC",
            (user_id,)
        )
        rows = cur.fetchall()
        
        active_chats = [{
            'girl_id': row[0],
            'total_messages': row[1],
            'relationship_level': row[2],
            'last_interaction': row[3].isoformat() if row[3] else None
        } for row in rows]
        
        cur.close()
        conn.close()
        
        return success_response({'active_chats': active_chats})
    
    except Exception as e:
        return error_response(500, str(e))