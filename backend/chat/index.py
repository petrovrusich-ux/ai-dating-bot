'''
Business: Generate AI girlfriend responses using AITunnel API (OpenAI-compatible)
Args: event with httpMethod POST, body with girl_id, user_message, conversation_history, persona_prompt
      context with request_id attribute
Returns: AI-generated response text
'''

import json
import os
import requests
from typing import Dict, Any, List

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
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
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    try:
        body_str = event.get('body', '{}')
        if isinstance(body_str, dict):
            body_data = body_str
        else:
            body_data = json.loads(body_str) if body_str else {}
    except json.JSONDecodeError:
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Invalid JSON in request body'}),
            'isBase64Encoded': False
        }
    
    girl_id = body_data.get('girl_id')
    user_message = body_data.get('user_message')
    conversation_history = body_data.get('conversation_history', [])
    persona_prompt = body_data.get('persona_prompt', '')
    
    if not girl_id or not user_message:
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Missing required fields: girl_id, user_message'}),
            'isBase64Encoded': False
        }
    
    api_key = os.environ.get('AITUNNEL_API_KEY')
    if not api_key:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'AITunnel API key not configured'}),
            'isBase64Encoded': False
        }
    
    # Build conversation context
    system_message = f"{persona_prompt}\n\nYou are in a roleplay chat. Stay in character, be flirty, engaging, and respond naturally. Write responses in Russian language only."
    
    messages = [{"role": "system", "content": system_message}]
    
    # Add conversation history (limit to last 15 messages to avoid token limits)
    for msg in conversation_history[-15:]:
        role = "assistant" if msg.get('sender') == 'girl' else "user"
        messages.append({"role": role, "content": msg.get('text', '')})
    
    # Add current user message
    messages.append({"role": "user", "content": user_message})
    
    # Call AITunnel API (OpenAI-compatible endpoint)
    api_url = "https://api.aitunnel.ru/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "gpt-4o-mini",
        "messages": messages,
        "max_tokens": 400,
        "temperature": 0.85,
        "top_p": 0.92,
        "frequency_penalty": 0.3,
        "presence_penalty": 0.3
    }
    
    try:
        response = requests.post(api_url, headers=headers, json=payload, timeout=60)
        response.raise_for_status()
        result = response.json()
        
        # Extract response from OpenAI format
        if 'choices' in result and len(result['choices']) > 0:
            ai_response = result['choices'][0]['message']['content'].strip()
        else:
            ai_response = "Извини, что-то пошло не так... Давай попробуем ещё раз?"
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'response': ai_response}),
            'isBase64Encoded': False
        }
    
    except requests.exceptions.Timeout:
        return {
            'statusCode': 504,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Request timeout - model took too long to respond'}),
            'isBase64Encoded': False
        }
    except requests.exceptions.RequestException as e:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': f'AITunnel API error: {str(e)}'}),
            'isBase64Encoded': False
        }