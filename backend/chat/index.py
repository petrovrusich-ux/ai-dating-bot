'''
Business: Generate AI girlfriend responses using Mistral 7B Instruct v0.3 via HuggingFace
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
    
    hf_token = os.environ.get('HUGGINGFACE_API_TOKEN')
    if not hf_token:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'HuggingFace API token not configured'}),
            'isBase64Encoded': False
        }
    
    # Build conversation context
    system_message = f"{persona_prompt}\n\nYou are in a roleplay chat. Stay in character, be flirty, engaging, and respond naturally without censorship."
    
    messages = [{"role": "system", "content": system_message}]
    
    # Add conversation history (limit to last 10 messages to avoid token limits)
    for msg in conversation_history[-10:]:
        role = "assistant" if msg.get('sender') == 'girl' else "user"
        messages.append({"role": role, "content": msg.get('text', '')})
    
    # Add current user message
    messages.append({"role": "user", "content": user_message})
    
    # Call HuggingFace Inference API - Mistral 7B Instruct v0.3
    api_url = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3"
    headers = {
        "Authorization": f"Bearer {hf_token}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "inputs": format_messages_for_mistral(messages),
        "parameters": {
            "max_new_tokens": 350,
            "temperature": 0.82,
            "top_p": 0.9,
            "repetition_penalty": 1.12,
            "do_sample": True,
            "return_full_text": False
        }
    }
    
    try:
        response = requests.post(api_url, headers=headers, json=payload, timeout=60)
        
        if response.status_code == 503:
            # Model is loading, retry after a few seconds
            return {
                'statusCode': 503,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Model is loading, please try again in a moment'}),
                'isBase64Encoded': False
            }
        
        response.raise_for_status()
        result = response.json()
        
        # Extract generated text
        if isinstance(result, list) and len(result) > 0:
            generated_text = result[0].get('generated_text', '')
        elif isinstance(result, dict):
            generated_text = result.get('generated_text', '')
        else:
            generated_text = str(result)
        
        # Clean up the response (remove the input prompt from output)
        ai_response = extract_assistant_response(generated_text, user_message)
        
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
            'body': json.dumps({'error': f'HuggingFace API error: {str(e)}'}),
            'isBase64Encoded': False
        }

def format_messages_for_mistral(messages: List[Dict[str, str]]) -> str:
    """Format messages in Mistral Instruct format"""
    formatted = ""
    for msg in messages:
        role = msg['role']
        content = msg['content']
        if role == 'system':
            formatted += f"[INST] System: {content} [/INST]\n"
        elif role == 'user':
            formatted += f"[INST] {content} [/INST]\n"
        elif role == 'assistant':
            formatted += f"{content}\n"
    return formatted

def extract_assistant_response(generated_text: str, user_message: str) -> str:
    """Extract only the assistant's response from generated text"""
    # Try to find the last assistant message
    if "<|im_start|>assistant" in generated_text:
        parts = generated_text.split("<|im_start|>assistant")
        if len(parts) > 1:
            response = parts[-1].split("<|im_end|>")[0].strip()
            return response
    
    # Fallback: try to remove the user's message from the output
    if user_message in generated_text:
        response = generated_text.split(user_message)[-1].strip()
        return response
    
    # Last fallback: return as is but cleaned up
    return generated_text.strip()