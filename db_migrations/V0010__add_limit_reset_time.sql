-- Добавляем поле для хранения времени следующего обнуления лимита
ALTER TABLE t_p77610913_ai_dating_bot.user_message_stats 
ADD COLUMN IF NOT EXISTS limit_reset_time TIMESTAMP;