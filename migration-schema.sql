-- Schema for Google Cloud SQL
-- Generated: 2026-05-25T00:03:46.277Z

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


CREATE TABLE IF NOT EXISTS admin_status (id INTEGER NOT NULL DEFAULT nextval('admin_status_id_seq'::regclass), title TEXT NOT NULL, body TEXT NOT NULL, author_profile_id INTEGER NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now());

CREATE TABLE IF NOT EXISTS agent_profiles (id UUID NOT NULL DEFAULT gen_random_uuid(), user_id UUID NOT NULL, agent_type VARCHAR(50) DEFAULT 'standard'::character varying, commission_rate NUMERIC(5,4) DEFAULT 0.05, status VARCHAR(50) DEFAULT 'active'::character varying, matches_completed INTEGER DEFAULT 0, total_earnings NUMERIC(20,6) DEFAULT 0, rating NUMERIC(3,2) DEFAULT 5.0, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now());

CREATE TABLE IF NOT EXISTS ai_conversations (id INTEGER NOT NULL DEFAULT nextval('ai_conversations_id_seq'::regclass), title TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now());

CREATE TABLE IF NOT EXISTS ai_messages (id INTEGER NOT NULL DEFAULT nextval('ai_messages_id_seq'::regclass), conversation_id INTEGER NOT NULL, role TEXT NOT NULL, content TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now());

CREATE TABLE IF NOT EXISTS arena_ledger (id INTEGER NOT NULL DEFAULT nextval('arena_ledger_id_seq'::regclass), profile_id INTEGER NOT NULL, type TEXT NOT NULL, amount_trx NUMERIC(18,6) NOT NULL, meta JSONB, created_at TIMESTAMPTZ NOT NULL DEFAULT now());

CREATE TABLE IF NOT EXISTS arena_matches (id TEXT NOT NULL, title TEXT NOT NULL, description TEXT, host_id TEXT NOT NULL, entry_fee NUMERIC(18,6) DEFAULT 0, prize_pool NUMERIC(18,6) DEFAULT 0, max_participants INTEGER DEFAULT 10, category TEXT DEFAULT 'general'::text, status TEXT DEFAULT 'upcoming'::text, scheduled_at TIMESTAMPTZ, started_at TIMESTAMPTZ, ended_at TIMESTAMPTZ, winner_id TEXT, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now());

CREATE TABLE IF NOT EXISTS arena_participants (id TEXT NOT NULL, match_id TEXT NOT NULL, user_id TEXT NOT NULL, joined_at TIMESTAMPTZ DEFAULT now(), placement INTEGER, payout NUMERIC(18,6));

CREATE TABLE IF NOT EXISTS arena_treasury (id INTEGER NOT NULL DEFAULT nextval('arena_treasury_id_seq'::regclass), payout_pool_trx NUMERIC(18,6) NOT NULL DEFAULT '0'::numeric, retention_pool_trx NUMERIC(18,6) NOT NULL DEFAULT '0'::numeric, ops_pool_trx NUMERIC(18,6) NOT NULL DEFAULT '0'::numeric, buffer_pool_trx NUMERIC(18,6) NOT NULL DEFAULT '0'::numeric, updated_at TIMESTAMPTZ NOT NULL DEFAULT now());

CREATE TABLE IF NOT EXISTS assignments (id INTEGER NOT NULL DEFAULT nextval('assignments_id_seq'::regclass), client_id INTEGER NOT NULL, assigned_profile_id INTEGER NOT NULL, assigned_role TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now());

CREATE TABLE IF NOT EXISTS bridger_profiles (id UUID NOT NULL DEFAULT gen_random_uuid(), user_id UUID NOT NULL, commission_rate NUMERIC(5,4) DEFAULT 0.1, status VARCHAR(50) DEFAULT 'active'::character varying, referrals INTEGER DEFAULT 0, total_earnings NUMERIC(20,6) DEFAULT 0, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now());

CREATE TABLE IF NOT EXISTS casino_games (id UUID NOT NULL DEFAULT gen_random_uuid(), user_id UUID NOT NULL, game_type TEXT NOT NULL DEFAULT 'dice'::text, bet_amount NUMERIC(18,6) NOT NULL, outcome TEXT NOT NULL, payout NUMERIC(18,6) NOT NULL, dice_result JSONB, created_at TIMESTAMPTZ DEFAULT now());

CREATE TABLE IF NOT EXISTS chat_messages (id INTEGER NOT NULL DEFAULT nextval('chat_messages_id_seq'::regclass), room_id INTEGER NOT NULL, profile_id INTEGER NOT NULL, content TEXT NOT NULL, message_type TEXT NOT NULL DEFAULT 'text'::text, video_path TEXT, reply_to INTEGER, reactions JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), edited_at TIMESTAMPTZ);

CREATE TABLE IF NOT EXISTS chat_room_members (id INTEGER NOT NULL DEFAULT nextval('chat_room_members_id_seq'::regclass), room_id INTEGER NOT NULL, profile_id INTEGER NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now());

CREATE TABLE IF NOT EXISTS chat_rooms (id INTEGER NOT NULL DEFAULT nextval('chat_rooms_id_seq'::regclass), name TEXT NOT NULL, description TEXT, type TEXT NOT NULL DEFAULT 'public'::text, allowed_roles ARRAY, emoji TEXT DEFAULT '💬'::text, color TEXT DEFAULT '#f59e0b'::text, created_at TIMESTAMPTZ NOT NULL DEFAULT now());

CREATE TABLE IF NOT EXISTS client_messages (id UUID NOT NULL DEFAULT gen_random_uuid(), client_id VARCHAR(100) NOT NULL, client_name VARCHAR(200), position VARCHAR(50) NOT NULL, sender_type VARCHAR(20) NOT NULL, content TEXT NOT NULL, is_read BOOLEAN DEFAULT false, created_at TIMESTAMP DEFAULT now());

CREATE TABLE IF NOT EXISTS clients (id UUID NOT NULL DEFAULT gen_random_uuid(), name VARCHAR(255), email VARCHAR(255) NOT NULL, phone VARCHAR(50), password_hash VARCHAR(255), business_name VARCHAR(255), referred_by UUID, assigned_bridger_id UUID, role VARCHAR(20) DEFAULT 'client'::character varying, created_at TIMESTAMP DEFAULT now(), updated_at TIMESTAMP DEFAULT now());

CREATE TABLE IF NOT EXISTS company_sweeps (id INTEGER NOT NULL DEFAULT nextval('company_sweeps_id_seq'::regclass), amount_trx TEXT NOT NULL, entry_count INTEGER NOT NULL DEFAULT 0, note TEXT NOT NULL DEFAULT ''::text, tx_hash TEXT, status TEXT NOT NULL DEFAULT 'pending'::text, created_at TIMESTAMPTZ NOT NULL DEFAULT now());

CREATE TABLE IF NOT EXISTS content_ledger (id INTEGER NOT NULL DEFAULT nextval('content_ledger_id_seq'::regclass), profile_id INTEGER NOT NULL, type TEXT NOT NULL, amount_trx TEXT NOT NULL, description TEXT NOT NULL, message_id INTEGER, tx_hash TEXT, settled BOOLEAN NOT NULL DEFAULT false, created_at TIMESTAMPTZ NOT NULL DEFAULT now());

CREATE TABLE IF NOT EXISTS content_views (id INTEGER NOT NULL DEFAULT nextval('content_views_id_seq'::regclass), viewer_profile_id INTEGER NOT NULL, message_id INTEGER NOT NULL, view_type TEXT NOT NULL DEFAULT 'text'::text, seconds_watched INTEGER NOT NULL DEFAULT 0, trx_value TEXT NOT NULL DEFAULT '0'::text, created_at TIMESTAMPTZ NOT NULL DEFAULT now());

CREATE TABLE IF NOT EXISTS escrow (id UUID NOT NULL DEFAULT gen_random_uuid(), transaction_id UUID NOT NULL, user_id UUID NOT NULL, amount NUMERIC(20,6) NOT NULL, currency VARCHAR(10) DEFAULT 'TRX'::character varying, status VARCHAR(50) DEFAULT 'locked'::character varying, locked_at TIMESTAMPTZ DEFAULT now(), released_at TIMESTAMPTZ, reason TEXT, metadata JSONB);

CREATE TABLE IF NOT EXISTS fund_sweeps (id UUID NOT NULL DEFAULT gen_random_uuid(), user_id UUID NOT NULL, amount NUMERIC(20,6) NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'pending'::character varying, approved_by UUID, executed_at TIMESTAMP, created_at TIMESTAMP DEFAULT now());

CREATE TABLE IF NOT EXISTS interactions (id INTEGER NOT NULL DEFAULT nextval('interactions_id_seq'::regclass), from_profile_id INTEGER NOT NULL, to_profile_id INTEGER NOT NULL, type TEXT NOT NULL, content TEXT, presence_level INTEGER NOT NULL DEFAULT 50, created_at TIMESTAMPTZ NOT NULL DEFAULT now());

CREATE TABLE IF NOT EXISTS ledger_entries (id UUID NOT NULL DEFAULT gen_random_uuid(), user_id UUID NOT NULL, transaction_id UUID, escrow_id UUID, entry_type VARCHAR(50) NOT NULL, amount NUMERIC(20,6) NOT NULL, currency VARCHAR(10) DEFAULT 'TRX'::character varying, balance_before NUMERIC(20,6), balance_after NUMERIC(20,6), description TEXT, created_at TIMESTAMPTZ DEFAULT now(), metadata JSONB);

CREATE TABLE IF NOT EXISTS lounge_messages (id UUID NOT NULL DEFAULT gen_random_uuid(), room_type VARCHAR(20) NOT NULL DEFAULT 'public'::character varying, room_id VARCHAR(100) DEFAULT 'main'::character varying, user_id UUID, sender_name VARCHAR(100) NOT NULL, sender_avatar VARCHAR(50) DEFAULT '👤'::character varying, content TEXT NOT NULL, created_at TIMESTAMP DEFAULT now(), message_type VARCHAR(20) DEFAULT 'text'::character varying, media_url TEXT, sender_role VARCHAR(20));

CREATE TABLE IF NOT EXISTS marketplace_listings (id INTEGER NOT NULL DEFAULT nextval('marketplace_listings_id_seq'::regclass), title TEXT NOT NULL, description TEXT, price TEXT, token TEXT NOT NULL DEFAULT 'USDT'::text, status TEXT NOT NULL DEFAULT 'open'::text, posted_by_profile_id INTEGER, client_id INTEGER, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());

CREATE TABLE IF NOT EXISTS messages (id INTEGER NOT NULL DEFAULT nextval('messages_id_seq'::regclass), from_profile_id INTEGER NOT NULL, to_profile_id INTEGER, content TEXT NOT NULL DEFAULT ''::text, video_path TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now());

CREATE TABLE IF NOT EXISTS monthly_distributions (id INTEGER NOT NULL DEFAULT nextval('monthly_distributions_id_seq'::regclass), cycle_key TEXT NOT NULL, admin_profile_id INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'pending'::text, total_revenue_trx NUMERIC(18,6) NOT NULL DEFAULT '0'::numeric, user_pool_trx NUMERIC(18,6) NOT NULL DEFAULT '0'::numeric, platform_pool_trx NUMERIC(18,6) NOT NULL DEFAULT '0'::numeric, user_count INTEGER NOT NULL DEFAULT 0, cycle_start TIMESTAMPTZ NOT NULL, cycle_end TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), completed_at TIMESTAMPTZ);

CREATE TABLE IF NOT EXISTS notifications (id INTEGER NOT NULL DEFAULT nextval('notifications_id_seq'::regclass), profile_id INTEGER NOT NULL, type TEXT NOT NULL DEFAULT 'dm'::text, content TEXT NOT NULL, from_profile_id INTEGER, read BOOLEAN NOT NULL DEFAULT false, created_at TIMESTAMPTZ NOT NULL DEFAULT now());

CREATE TABLE IF NOT EXISTS old_transactions (id UUID NOT NULL DEFAULT gen_random_uuid(), user_id UUID NOT NULL, type VARCHAR(50) NOT NULL, amount NUMERIC(20,6) NOT NULL, currency VARCHAR(10) DEFAULT 'TRX'::character varying, status VARCHAR(50) DEFAULT 'pending'::character varying, tx_hash VARCHAR(255), from_address VARCHAR(100), to_address VARCHAR(100), description TEXT, metadata JSONB, created_at TIMESTAMPTZ DEFAULT now(), completed_at TIMESTAMPTZ);

CREATE TABLE IF NOT EXISTS position_bids (id INTEGER NOT NULL DEFAULT nextval('position_bids_id_seq'::regclass), position_listing_id INTEGER NOT NULL, bidder_profile_id INTEGER NOT NULL, amount_trx TEXT NOT NULL, tx_hash TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending'::text, created_at TIMESTAMPTZ NOT NULL DEFAULT now());

CREATE TABLE IF NOT EXISTS position_listings (id INTEGER NOT NULL DEFAULT nextval('position_listings_id_seq'::regclass), unclaimed_profile_id INTEGER NOT NULL, posted_by_profile_id INTEGER NOT NULL, title TEXT NOT NULL, description TEXT, starting_price_trx TEXT NOT NULL DEFAULT '0'::text, status TEXT NOT NULL DEFAULT 'open'::text, awarded_bid_id INTEGER, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());

CREATE TABLE IF NOT EXISTS processed_events (id INTEGER NOT NULL DEFAULT nextval('processed_events_id_seq'::regclass), tx_hash TEXT NOT NULL, kind TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending'::text, profile_id INTEGER, payload JSONB, attempts INTEGER NOT NULL DEFAULT 0, last_error TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());

CREATE TABLE IF NOT EXISTS profiles (id INTEGER NOT NULL DEFAULT nextval('profiles_id_seq'::regclass), name TEXT NOT NULL, role TEXT, status TEXT NOT NULL DEFAULT 'active'::text, initials TEXT NOT NULL, notes TEXT, clerk_user_id TEXT, wallet_address TEXT, stripe_customer_id TEXT, is_locked BOOLEAN NOT NULL DEFAULT false, is_system_user BOOLEAN NOT NULL DEFAULT false, has_claimed BOOLEAN NOT NULL DEFAULT false, is_admin BOOLEAN NOT NULL DEFAULT false, promo_code TEXT, claim_token TEXT, balance_trx NUMERIC(18,6) NOT NULL DEFAULT '0'::numeric, play_balance_trx NUMERIC(18,6) NOT NULL DEFAULT '0'::numeric, total_funded_trx NUMERIC(18,6) NOT NULL DEFAULT '0'::numeric, bridger_agreement_signed_at TIMESTAMPTZ, funding_reminder_sent_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());

CREATE TABLE IF NOT EXISTS revenue_splits (id INTEGER NOT NULL DEFAULT nextval('revenue_splits_id_seq'::regclass), client_profile_id INTEGER NOT NULL, bridger_profile_id INTEGER, agent_profile_id INTEGER, deposit_trx NUMERIC(18,6) NOT NULL, bridger_cut_trx NUMERIC(18,6) NOT NULL DEFAULT '0'::numeric, agent_cut_trx NUMERIC(18,6) NOT NULL DEFAULT '0'::numeric, company_cut_trx NUMERIC(18,6) NOT NULL DEFAULT '0'::numeric, cashback_trx NUMERIC(18,6) NOT NULL DEFAULT '0'::numeric, cashback_paid_at TIMESTAMPTZ, tx_hash TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now());

CREATE TABLE IF NOT EXISTS sessions (id UUID NOT NULL DEFAULT gen_random_uuid(), user_id UUID NOT NULL, token VARCHAR(255) NOT NULL, expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ DEFAULT now());

CREATE TABLE IF NOT EXISTS subscription_plans (id INTEGER NOT NULL DEFAULT nextval('subscription_plans_id_seq'::regclass), name TEXT NOT NULL, description TEXT, monthly_trx_cost NUMERIC(10,4) NOT NULL, allowed_roles ARRAY NOT NULL DEFAULT '{}'::text[], created_at TIMESTAMPTZ NOT NULL DEFAULT now());

CREATE TABLE IF NOT EXISTS sweeps_approval (id UUID NOT NULL DEFAULT gen_random_uuid(), from_wallet_id UUID NOT NULL, to_wallet_id UUID NOT NULL, amount_trx NUMERIC(10,2) NOT NULL, status VARCHAR(50) DEFAULT 'pending'::character varying, created_by UUID, approved_by UUID, created_at TIMESTAMPTZ DEFAULT now(), approved_at TIMESTAMPTZ, executed_at TIMESTAMPTZ, transaction_hash VARCHAR(255), notes TEXT);

CREATE TABLE IF NOT EXISTS transactions (id INTEGER NOT NULL DEFAULT nextval('transactions_id_seq'::regclass), tx_hash TEXT NOT NULL, from_address TEXT NOT NULL, to_address TEXT NOT NULL, amount TEXT NOT NULL, token_symbol TEXT NOT NULL DEFAULT 'TRC20'::text, token_contract_address TEXT, block_timestamp BIGINT, from_profile_id INTEGER, client_id INTEGER, created_at TIMESTAMPTZ NOT NULL DEFAULT now());

CREATE TABLE IF NOT EXISTS user_subscriptions (id INTEGER NOT NULL DEFAULT nextval('user_subscriptions_id_seq'::regclass), profile_id INTEGER NOT NULL, plan_id INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'active'::text, next_billing_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now());

CREATE TABLE IF NOT EXISTS users (id UUID NOT NULL DEFAULT gen_random_uuid(), email VARCHAR(255) NOT NULL, password_hash VARCHAR(255), name VARCHAR(255) NOT NULL, avatar_url TEXT, role VARCHAR(50) DEFAULT 'user'::character varying, google_id VARCHAR(255), tron_wallet_address VARCHAR(100), created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now(), last_login TIMESTAMPTZ, is_active BOOLEAN DEFAULT true, username VARCHAR(50), departmental_code VARCHAR(20), field_presence_minutes INTEGER DEFAULT 0, referral_code VARCHAR(20), referred_by UUID, assigned_agent_id UUID, whatsapp_number VARCHAR(20));

CREATE TABLE IF NOT EXISTS wallets (id UUID NOT NULL DEFAULT gen_random_uuid(), user_id UUID NOT NULL, tron_address VARCHAR(100), balance_trx NUMERIC(20,6) DEFAULT 0, balance_usdt NUMERIC(20,6) DEFAULT 0, is_primary BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now(), private_key VARCHAR(255), is_eight_engine_controlled BOOLEAN DEFAULT false, play_balance NUMERIC(18,6) DEFAULT 0);

CREATE TABLE IF NOT EXISTS withdrawal_requests (id INTEGER NOT NULL DEFAULT nextval('withdrawal_requests_id_seq'::regclass), profile_id INTEGER NOT NULL, amount_trx TEXT NOT NULL, wallet_address TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending'::text, tx_hash TEXT, admin_note TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
