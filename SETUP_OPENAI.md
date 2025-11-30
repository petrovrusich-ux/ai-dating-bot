# Настройка OpenAI API

## Шаг 1: Получи API ключ

1. Зайди на https://platform.openai.com/api-keys
2. Нажми **Create new secret key**
3. Скопируй ключ (он показывается только один раз!)

## Шаг 2: Добавь ключ в проект

Открой файл `.env.local` и замени `your-openai-api-key-here` на свой ключ:

```
VITE_OPENAI_API_KEY=sk-proj-abcdefg123456789...
```

## Шаг 3: Перезапусти проект

```bash
npm run dev
```

Готово! Чат теперь работает через OpenAI API напрямую из браузера.

## ⚠️ ВАЖНО: Безопасность

- API ключ будет виден в коде браузера
- Рекомендую установить лимиты на ключ в настройках OpenAI
- Не публикуй `.env.local` в Git (уже в .gitignore)
