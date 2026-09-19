-- Migration script to add subscription columns and table
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_expiry TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_subscription_exempt BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_last_paid_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS subscription_payments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    amount NUMERIC(20,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'NGN',
    payment_method VARCHAR(50),
    transaction_reference TEXT,
    status VARCHAR(20) DEFAULT 'success',
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);
