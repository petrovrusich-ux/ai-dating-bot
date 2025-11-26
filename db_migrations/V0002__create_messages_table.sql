CREATE TABLE IF NOT EXISTS t_p77610913_ai_dating_bot.messages (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    girl_id VARCHAR(50) NOT NULL,
    sender VARCHAR(10) NOT NULL CHECK (sender IN ('user', 'ai')),
    text TEXT NOT NULL,
    is_nsfw BOOLEAN DEFAULT FALSE,
    persona VARCHAR(10) CHECK (persona IN ('gentle', 'bold')),
    image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_messages_user_girl ON t_p77610913_ai_dating_bot.messages(user_id, girl_id, created_at);
CREATE INDEX idx_messages_created_at ON t_p77610913_ai_dating_bot.messages(created_at);