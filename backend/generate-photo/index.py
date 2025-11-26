import json
import os
import time
import hashlib
import base64
import requests
from typing import Dict, Any, Optional

def generate_with_stability_api(prompt: str, api_key: str) -> Optional[str]:
    '''Generate image using Stability AI API'''
    url = "https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image"
    
    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }
    
    payload = {
        "text_prompts": [
            {
                "text": prompt,
                "weight": 1
            },
            {
                "text": "blurry, bad quality, distorted, ugly, watermark, text",
                "weight": -1
            }
        ],
        "cfg_scale": 7,
        "height": 1024,
        "width": 1024,
        "samples": 1,
        "steps": 30,
    }
    
    response = requests.post(url, headers=headers, json=payload, timeout=60)
    
    if response.status_code != 200:
        raise Exception(f"Stability API error: {response.status_code}")
    
    data = response.json()
    
    if data.get("artifacts") and len(data["artifacts"]) > 0:
        image_base64 = data["artifacts"][0].get("base64")
        if image_base64:
            return f"data:image/png;base64,{image_base64}"
    
    return None

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
            f"beautiful elegant woman portrait, soft romantic lighting, intimate atmosphere, photorealistic, high quality, professional photography, cinematic composition",
            f"attractive young woman, gentle expression, warm golden hour lighting, elegant bedroom interior, professional portrait photography, cinematic style",
            f"stunning woman portrait, sensual elegant pose, soft focus background, romantic ambiance, fine art photography, high resolution"
        ],
        'bold': [
            f"confident attractive woman portrait, bold dramatic pose, cinematic lighting, intense expressive gaze, photorealistic, editorial photography",
            f"seductive woman portrait, daring fashionable outfit, moody studio lighting, powerful presence, high fashion editorial photography",
            f"fierce beautiful woman, provocative artistic pose, dramatic cinematic lighting, fashion photography, high detail photorealistic"
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
    
    api_key = os.environ.get('STABILITY_API_KEY')
    generated_url = None
    generation_method = 'placeholder'
    
    if api_key:
        try:
            start_time = time.time()
            generated_url = generate_with_stability_api(selected_prompt, api_key)
            generation_time = time.time() - start_time
            generation_method = 'stability_ai'
        except Exception as e:
            print(f"Stability API error: {e}")
            generated_url = None
    
    if not generated_url:
        generated_url = placeholder_images[seed_hash % len(placeholder_images)]
        generation_time = 0.5
    
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
            'generation_time': generation_time,
            'generation_method': generation_method,
            'girl_name': girl_name,
            'persona': persona
        }),
        'isBase64Encoded': False
    }
