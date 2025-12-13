-- Добавляем колонки для тарифов "одна девушка" и "все девушки"
ALTER TABLE t_p77610913_ai_dating_bot.user_subscriptions 
ADD COLUMN IF NOT EXISTS one_girl BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS all_girls BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS one_girl_expires_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS all_girls_expires_at TIMESTAMP;