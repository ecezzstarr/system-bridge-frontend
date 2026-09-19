-- ===========================================
-- SYSTEM BRIDGE DATABASE SCHEMA
-- For Google Cloud SQL (PostgreSQL 15)
-- ===========================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    avatar_url TEXT,
    role VARCHAR(50) DEFAULT 'bridger',
    google_id VARCHAR(255),
    tron_wallet_address VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    username VARCHAR(100),
    departmental_code VARCHAR(50),
    field_presence_minutes INTEGER DEFAULT 0,
    referral_code VARCHAR(50),
    referred_by UUID REFERENCES users(id),
    assigned_agent_id UUID REFERENCES users(id),
    whatsapp_number VARCHAR(20)
);

-- Wallets table
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    tron_address VARCHAR(100),
    balance_trx DECIMAL(20, 6) DEFAULT 0,
    balance_usdt DECIMAL(20, 6) DEFAULT 0,
    is_primary BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    private_key TEXT,
    is_eight_engine_controlled BOOLEAN DEFAULT true,
    play_balance DECIMAL(20, 6) DEFAULT 0
);

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    password_hash VARCHAR(255),
    business_name VARCHAR(255),
    referred_by UUID REFERENCES users(id),
    assigned_bridger_id UUID REFERENCES users(id),
    role VARCHAR(20) DEFAULT 'client',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    avatar TEXT,
    online BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    from_profile_id INTEGER REFERENCES profiles(id),
    to_profile_id INTEGER REFERENCES profiles(id),
    content TEXT NOT NULL,
    video_path TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Client messages table
CREATE TABLE IF NOT EXISTS client_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL,
    position VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    sender VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    wallet_id UUID REFERENCES wallets(id),
    type VARCHAR(50) NOT NULL,
    amount DECIMAL(20, 6) NOT NULL,
    currency VARCHAR(10) DEFAULT 'TRX',
    status VARCHAR(50) DEFAULT 'pending',
    reference VARCHAR(255),
    external_reference VARCHAR(255),
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Deposits table
CREATE TABLE IF NOT EXISTS deposits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    amount_usd DECIMAL(20, 2) NOT NULL,
    amount_trx DECIMAL(20, 6) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    flw_reference VARCHAR(255),
    flw_transaction_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Withdrawals table
CREATE TABLE IF NOT EXISTS withdrawals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    amount_trx DECIMAL(20, 6) NOT NULL,
    to_address VARCHAR(100) NOT NULL,
    tx_hash VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Games table
CREATE TABLE IF NOT EXISTS games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    min_bet DECIMAL(20, 6) DEFAULT 1,
    max_bet DECIMAL(20, 6) DEFAULT 1000,
    house_edge DECIMAL(5, 4) DEFAULT 0.02,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Game sessions table
CREATE TABLE IF NOT EXISTS game_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID REFERENCES games(id),
    user_id UUID REFERENCES users(id),
    bet_amount DECIMAL(20, 6) NOT NULL,
    result VARCHAR(50),
    payout DECIMAL(20, 6) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Referrals table
CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID REFERENCES users(id),
    referred_id UUID REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'pending',
    commission DECIMAL(20, 6) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_departmental_code ON users(departmental_code);
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_messages_from_profile ON messages(from_profile_id);
CREATE INDEX IF NOT EXISTS idx_messages_to_profile ON messages(to_profile_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_client_messages_client_id ON client_messages(client_id);
