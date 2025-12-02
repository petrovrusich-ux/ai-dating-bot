-- Add flirt, intimate, premium fields to subscriptions table
ALTER TABLE t_p77610913_ai_dating_bot.subscriptions 
ADD COLUMN IF NOT EXISTS flirt BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS intimate BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS premium BOOLEAN DEFAULT FALSE;

-- Set default values for existing rows
UPDATE t_p77610913_ai_dating_bot.subscriptions 
SET flirt = FALSE, intimate = FALSE, premium = FALSE
WHERE flirt IS NULL OR intimate IS NULL OR premium IS NULL;