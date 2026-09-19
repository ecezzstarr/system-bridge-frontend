-- Persistent communications identities for Bridgers.
-- The number is owned by Weave/provider infrastructure and survives individual prospect purchases.
CREATE TABLE IF NOT EXISTS weave_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bridger_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL UNIQUE,
  country_code TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_number_id TEXT,
  whatsapp_status TEXT NOT NULL DEFAULT 'pending' CHECK (whatsapp_status IN ('pending','active','suspended','disconnected')),
  sms_status TEXT NOT NULL DEFAULT 'pending' CHECK (sms_status IN ('pending','active','suspended','disconnected')),
  status TEXT NOT NULL DEFAULT 'provisioning' CHECK (status IN ('provisioning','active','suspended','released')),
  display_name TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS weave_numbers_one_active_per_bridger
  ON weave_numbers(bridger_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS weave_numbers_bridger_idx ON weave_numbers(bridger_id);

CREATE TABLE IF NOT EXISTS weave_number_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number_id UUID NOT NULL REFERENCES weave_numbers(id) ON DELETE CASCADE,
  prospect_phone TEXT NOT NULL,
  prospect_id UUID,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp','sms')),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(number_id, prospect_phone, channel)
);

CREATE INDEX IF NOT EXISTS weave_number_conversations_number_idx
  ON weave_number_conversations(number_id, last_message_at DESC);

CREATE TABLE IF NOT EXISTS weave_number_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number_id UUID NOT NULL REFERENCES weave_numbers(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES weave_number_conversations(id) ON DELETE SET NULL,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp','sms')),
  direction TEXT NOT NULL CHECK (direction IN ('inbound','outbound')),
  from_phone TEXT NOT NULL,
  to_phone TEXT NOT NULL,
  body TEXT,
  provider_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('queued','sent','delivered','received','failed')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS weave_number_messages_conversation_idx
  ON weave_number_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS weave_number_messages_number_idx
  ON weave_number_messages(number_id, created_at DESC);
