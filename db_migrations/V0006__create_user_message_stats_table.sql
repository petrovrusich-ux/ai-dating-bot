-- Создаём таблицу для учёта всех сообщений пользователя
CREATE TABLE IF NOT EXISTS t_p77610913_ai_dating_bot.user_message_stats (
    user_id TEXT PRIMARY KEY,
    total_messages INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Заполняем таблицу существующими данными из messages
INSERT INTO t_p77610913_ai_dating_bot.user_message_stats (user_id, total_messages, updated_at)
SELECT 
    user_id, 
    COUNT(*) as total_messages,
    CURRENT_TIMESTAMP as updated_at
FROM t_p77610913_ai_dating_bot.messages
WHERE sender = 'user'
GROUP BY user_id
ON CONFLICT (user_id) DO UPDATE 
SET total_messages = EXCLUDED.total_messages,
    updated_at = CURRENT_TIMESTAMP;