-- GLOBALEARN MASTER SCHEMA
-- Reconstruction based on Application Controllers and Routes

-- 1. Identity & Profile Management
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    balance NUMERIC(15, 2) DEFAULT 0.00,
    membership_tier VARCHAR(20) DEFAULT 'basic',
    referral_code VARCHAR(50) UNIQUE,
    referred_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    kyc_status VARCHAR(20) DEFAULT 'unverified', -- 'unverified', 'pending', 'verified', 'rejected'
    kyc_document_path TEXT,
    kyc_submitted_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'banned'
    two_fa_enabled BOOLEAN DEFAULT FALSE,
    preferred_language VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'UTC',
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_ip VARCHAR(45),
    wallet_address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Financial Ledger & Transactions
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'withdrawal', 'mpesa_upgrade', 'task_reward', 'blog_reward', 'spin_win', 'survey_reward'
    amount NUMERIC(15, 2) NOT NULL,
    method VARCHAR(50), -- 'M-Pesa', 'System', 'PayPal'
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'completed', 'rejected'
    reference_id VARCHAR(100) UNIQUE, -- Used for M-Pesa Receipt or System Refs
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Task & Earning Hub
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    video_url TEXT,
    reward NUMERIC(10, 2) NOT NULL,
    view_cap INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_tasks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, task_id)
);

-- 4. Blog & Content System
CREATE TABLE IF NOT EXISTS blog_posts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(50),
    read_time INTEGER, -- In seconds
    reward NUMERIC(10, 2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Survey System
CREATE TABLE IF NOT EXISTS surveys (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    reward NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS survey_questions (
    id SERIAL PRIMARY KEY,
    survey_id INTEGER REFERENCES surveys(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    options JSONB NOT NULL, -- Array of strings
    correct_option INTEGER NOT NULL -- Index of the correct answer
);

CREATE TABLE IF NOT EXISTS survey_completions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    survey_id INTEGER REFERENCES surveys(id) ON DELETE CASCADE,
    answers JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, survey_id)
);

-- 6. Lucky Spin System
CREATE TABLE IF NOT EXISTS lucky_spins (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    prize_amount NUMERIC(10, 2) DEFAULT 0.00,
    prize_label VARCHAR(50),
    spun_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Membership & Upgrades
CREATE TABLE IF NOT EXISTS membership_tiers (
    id SERIAL PRIMARY KEY,
    tier_key VARCHAR(20) UNIQUE NOT NULL,
    display_name VARCHAR(50) NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    duration_text VARCHAR(50),
    daily_cap INTEGER,
    withdrawal_speed VARCHAR(50),
    ref_structure JSONB, -- Referral percentages
    support_level VARCHAR(50),
    daily_spins INTEGER DEFAULT 0,
    extra_perks TEXT[],
    is_popular BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS membership_upgrades (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    tier VARCHAR(50),
    amount NUMERIC(10, 2),
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Support & Security
CREATE TABLE IF NOT EXISTS security_flags (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50), -- 'vpn', 'multi_account', 'device_cluster'
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'resolved'
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS support_tickets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(50),
    status VARCHAR(20) DEFAULT 'open', -- 'open', 'closed'
    message TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contact_messages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100),
    subject VARCHAR(200),
    message TEXT,
    status VARCHAR(20) DEFAULT 'unread', -- 'unread', 'read'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_settings (
    setting_key VARCHAR(50) PRIMARY KEY,
    setting_value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Optimization Indexes
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status_type ON transactions(status, type);
CREATE INDEX IF NOT EXISTS idx_security_active ON security_flags(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_user_tasks_lookup ON user_tasks(user_id, task_id);

-- 10. Initial Seed Data
INSERT INTO system_settings (setting_key, setting_value) VALUES ('withdrawal_limit', '500') ON CONFLICT DO NOTHING;
INSERT INTO system_settings (setting_key, setting_value) VALUES ('maintenance_mode', 'false') ON CONFLICT DO NOTHING;