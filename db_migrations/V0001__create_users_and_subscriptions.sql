-- Create users table
CREATE TABLE IF NOT EXISTS t_p77610913_ai_dating_bot.users (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS t_p77610913_ai_dating_bot.subscriptions (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    subscription_type VARCHAR(50) NOT NULL,
    start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create purchases table for one-time purchases
CREATE TABLE IF NOT EXISTS t_p77610913_ai_dating_bot.purchases (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    purchase_type VARCHAR(50) NOT NULL,
    girl_id VARCHAR(50),
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create payments table for tracking all transactions
CREATE TABLE IF NOT EXISTS t_p77610913_ai_dating_bot.payments (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    payment_id VARCHAR(255) UNIQUE NOT NULL,
    plan_type VARCHAR(50) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) NOT NULL,
    payment_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_users_user_id ON t_p77610913_ai_dating_bot.users(user_id);
CREATE INDEX idx_subscriptions_user_id ON t_p77610913_ai_dating_bot.subscriptions(user_id);
CREATE INDEX idx_subscriptions_active ON t_p77610913_ai_dating_bot.subscriptions(is_active);
CREATE INDEX idx_purchases_user_id ON t_p77610913_ai_dating_bot.purchases(user_id);
CREATE INDEX idx_payments_user_id ON t_p77610913_ai_dating_bot.payments(user_id);
CREATE INDEX idx_payments_payment_id ON t_p77610913_ai_dating_bot.payments(payment_id);
