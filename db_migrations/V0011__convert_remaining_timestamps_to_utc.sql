-- Конвертируем оставшиеся временные колонки в TIMESTAMPTZ (UTC)

-- 1. purchases: expires_at, purchased_at
ALTER TABLE t_p77610913_ai_dating_bot.purchases 
ALTER COLUMN expires_at TYPE TIMESTAMPTZ USING 
    CASE 
        WHEN expires_at IS NULL THEN NULL
        ELSE expires_at AT TIME ZONE 'UTC'
    END;

ALTER TABLE t_p77610913_ai_dating_bot.purchases 
ALTER COLUMN purchased_at TYPE TIMESTAMPTZ USING 
    CASE 
        WHEN purchased_at IS NULL THEN NULL
        ELSE purchased_at AT TIME ZONE 'UTC'
    END;

-- 2. subscriptions: expires_at (вторая колонка expires_at)
ALTER TABLE t_p77610913_ai_dating_bot.subscriptions 
ALTER COLUMN expires_at TYPE TIMESTAMPTZ USING 
    CASE 
        WHEN expires_at IS NULL THEN NULL
        ELSE expires_at AT TIME ZONE 'UTC'
    END;

-- 3. users: created_at, last_active
ALTER TABLE t_p77610913_ai_dating_bot.users 
ALTER COLUMN created_at TYPE TIMESTAMPTZ USING 
    CASE 
        WHEN created_at IS NULL THEN NULL
        ELSE created_at AT TIME ZONE 'UTC'
    END;

ALTER TABLE t_p77610913_ai_dating_bot.users 
ALTER COLUMN last_active TYPE TIMESTAMPTZ USING 
    CASE 
        WHEN last_active IS NULL THEN NULL
        ELSE last_active AT TIME ZONE 'UTC'
    END;