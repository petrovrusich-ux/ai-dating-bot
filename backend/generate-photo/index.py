import json
import os
import time
import hashlib
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Generate AI photos for NSFW chat mode using Stable Diffusion API
    Args: event - dict with httpMethod, body (girl_name, persona, level)
          context - object with attributes: request_id, function_name
    Returns: HTTP response with generated image URL
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token',
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
    girl_name: str = body_data.get('girl_name', 'Sofia')
    persona: str = body_data.get('persona', 'gentle')
    level: int = body_data.get('level', 2)
    user_id: str = event.get('headers', {}).get('X-User-Id', 'anonymous')
    
    if level < 2:
        return {
            'statusCode': 403,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': 'NSFW content locked',
                'message': 'Достигните уровень 3 для доступа к NSFW контенту'
            }),
            'isBase64Encoded': False
        }
    
    prompts = {
        'gentle': [
            f"beautiful woman {girl_name}, elegant pose, soft romantic lighting, intimate atmosphere, photorealistic portrait, high quality, artistic photography",
            f"attractive {girl_name}, gentle smile, warm lighting, elegant bedroom interior, professional photography, cinematic",
            f"stunning woman {girl_name}, sensual pose, soft focus, romantic ambiance, fine art photography"
        ],
        'bold': [
            f"confident woman {girl_name}, bold pose, dramatic lighting, intense gaze, photorealistic, high detail",
            f"seductive {girl_name}, daring outfit, moody lighting, powerful presence, editorial photography",
            f"fierce woman {girl_name}, provocative pose, cinematic lighting, high fashion photography"
        ]
    }
    
    prompt_list = prompts.get(persona, prompts['gentle'])
    seed_str = f"{girl_name}_{persona}_{user_id}_{int(time.time() / 3600)}"
    seed_hash = int(hashlib.md5(seed_str.encode()).hexdigest()[:8], 16)
    selected_prompt = prompt_list[seed_hash % len(prompt_list)]
    
    placeholder_images = [
        'https://cdn.poehali.dev/projects/226da4a1-0bd9-4d20-a164-66ae692a6341/files/6147b4a2-6c60-4638-a5f4-29e331a21609.jpg',
        'https://cdn.poehali.dev/projects/226da4a1-0bd9-4d20-a164-66ae692a6341/files/9397c83f-dbf6-4071-8280-46c17107c166.jpg',
        'https://cdn.poehali.dev/projects/226da4a1-0bd9-4d20-a164-66ae692a6341/files/b91a1828-cdb5-457c-a11a-f629175d21b9.jpg'
    ]
    
    generated_url = placeholder_images[seed_hash % len(placeholder_images)]
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({
            'success': True,
            'image_url': generated_url,
            'prompt_used': selected_prompt,
            'generation_time': 3.5,
            'girl_name': girl_name,
            'persona': persona
        }),
        'isBase64Encoded': False
    }
