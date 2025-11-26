-- Add user stats table for tracking relationship progress
CREATE TABLE IF NOT EXISTS user_girl_stats (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    girl_id TEXT NOT NULL,
    total_messages INTEGER DEFAULT 0,
    relationship_level INTEGER DEFAULT 0,
    last_interaction TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, girl_id)
);

-- Create index for fast lookups
CREATE INDEX idx_user_girl_stats_lookup ON user_girl_stats(user_id, girl_id);