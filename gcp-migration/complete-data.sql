-- Complete Data Export from Neon to Cloud SQL
-- Generated for System Bridge Frontend Migration
-- Run this AFTER schema.sql

-- =====================================================
-- USERS TABLE
-- =====================================================
INSERT INTO users (id, email, password_hash, name, avatar_url, role, google_id, tron_wallet_address, created_at, updated_at, last_login, is_active, username, departmental_code, field_presence_minutes, referral_code, referred_by, assigned_agent_id, whatsapp_number) VALUES
('3a11e863-39b9-4d1f-806a-91c42ef2fd9c', 'testfix@test.com', '$2b$10$F33LIGBFwjBfiq8ezgE.WOkkA7K17hTASqt9DViefG8Xq95oZ.MLm', 'Test Fix', NULL, 'agent', NULL, NULL, '2026-05-16T19:11:30.711Z', '2026-05-16T19:11:30.711Z', NULL, true, 'testfix99', 'AGENT', 0, NULL, NULL, NULL, NULL),
('a3a7f370-4ba7-474c-a9fa-12101b44a672', 'testfix2@test.com', '$2b$10$VSmGn1naSyRfpWOzyBb3QeVmerYcHlpMtznixc5PbkNv78ud0AlK2', 'Test Fix2', NULL, 'agent', NULL, NULL, '2026-05-16T19:12:51.259Z', '2026-05-16T19:12:51.259Z', NULL, true, 'testfix2', 'AGENT', 0, NULL, NULL, NULL, NULL),
('6eb3acae-0487-4420-8b39-ed1662b7bc2d', 'kennytalker785@gmail.com', '$2b$10$9TxQ2eXT3MSssofJLOhlXu3CIF8o0p/ubXKahhFCb6bXIcBB4lU8O', 'Oyedepo Kenny', NULL, 'agent', NULL, NULL, '2026-05-17T13:53:14.740Z', '2026-05-17T13:53:14.740Z', NULL, true, 'Kenny', 'AGENT', 0, NULL, NULL, NULL, NULL),
('b152ad28-719c-4b53-b549-ef16dc1fa86a', 'enegideuche2022@gmail.com', '$2b$10$m2A0ErGIXt70/gZYhrhuEemm.w4bVL78FsRsq7588Ga1785bS86fW', 'Kelly Uch', NULL, 'bridger', NULL, NULL, '2026-05-18T10:54:39.491Z', '2026-05-18T10:54:39.491Z', NULL, true, 'Kel', 'BRIDGER', 0, NULL, NULL, NULL, NULL),
('be4f0618-d666-4e13-ae8f-13c986784ff7', 'ecezzstarr@gmail.com', '$2b$10$adminhashedpassword', 'Ecezz Starr', NULL, 'admin', NULL, NULL, '2026-05-20T22:25:08.376Z', '2026-05-20T22:25:08.376Z', NULL, true, NULL, 'OWNER-001', 0, NULL, NULL, NULL, NULL),
('5044d0b3-6c22-4238-a111-b784d4d3ad69', 'Kellyossai27@gmail.com', '$2b$10$dI7zOSxxtmgnBwPhryxdKeoXUhIQgQ/PY8KjddxN6n7FJIIANuLWy', 'Kelly', NULL, 'bridger', NULL, NULL, '2026-05-21T07:52:40.079Z', '2026-05-21T07:52:40.079Z', NULL, true, 'Wizzy', 'BRIDGER', 0, NULL, NULL, NULL, NULL),
('2b63ba0d-c55c-480a-8ff3-c8df1fc59920', 'kennytalker472@gmail.com', '$2b$10$vJTlg.cxYx62JE0yjRFhV.DL6689DeLrCYrEvE9o6dfFFSeLJssya', 'Oyedepo Kenny', NULL, 'bridger', NULL, NULL, '2026-05-22T08:17:28.935Z', '2026-05-22T08:17:28.935Z', NULL, true, 'Kenny', 'BRIDGER', 0, NULL, NULL, NULL, NULL),
('09d01668-bf0a-4b77-ae93-24095311c989', 'oseyomagift37@gmail.com', '$2b$10$IJAnb0nBlQ5MDfmfOWTSIe6u3wXqVLNnL0KHCP6HAunYO2x8Ed9WC', 'Gift', NULL, 'bridger', NULL, NULL, '2026-05-22T18:59:14.834Z', '2026-05-22T18:59:14.834Z', NULL, true, 'OluwaMorgan', 'BRIDGER', 0, NULL, NULL, NULL, NULL),
('d04c341d-1d5a-4575-8848-1e6bb027ad68', 'ecezzmdt@gmail.com', '$2b$10$/WUhyJAz4p5COOe49m9T3eyvnDFR41C7RVUN/Ik24Fu6oUPET3LD.', 'Uploadedchecking', NULL, 'agent', NULL, NULL, '2026-05-17T13:10:04.744Z', '2026-05-17T13:10:04.744Z', '2026-05-23T02:33:23.346Z', true, 'Uploaded', 'AGENT', 0, NULL, NULL, NULL, NULL),
('810f1467-9ee6-42a1-9dab-e1e36c79283f', 'bridgesupport368@gmail.com', '$2b$10$bEP.qwNhj1sRlD9kzs1rJe00kDIRdqDLqW8FRWRXmb6WOaTVyoNme', 'Uploaded bri', NULL, 'bridger', NULL, NULL, '2026-05-18T11:10:12.255Z', '2026-05-18T11:10:12.255Z', '2026-05-23T02:38:10.507Z', true, 'Uploaded bri', 'BRIDGER', 0, NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- WALLETS TABLE
-- =====================================================
INSERT INTO wallets (id, user_id, tron_address, balance_trx, balance_usdt, is_primary, created_at, updated_at, private_key, is_eight_engine_controlled, play_balance) VALUES
('8a72f9cd-65fe-4386-b232-ee972e1337a0', 'a3a7f370-4ba7-474c-a9fa-12101b44a672', NULL, 0.000000, 0.000000, true, '2026-05-16T19:12:51.266Z', '2026-05-16T19:12:51.266Z', NULL, true, 0.000000),
('236b8bf4-43be-4816-b3e1-c03aecbd0754', 'd04c341d-1d5a-4575-8848-1e6bb027ad68', NULL, 0.000000, 0.000000, true, '2026-05-17T13:10:04.769Z', '2026-05-17T13:10:04.769Z', NULL, true, 0.000000),
('8449c378-875e-4d64-b244-b7a1b5dac376', '6eb3acae-0487-4420-8b39-ed1662b7bc2d', NULL, 0.000000, 0.000000, true, '2026-05-17T13:53:14.766Z', '2026-05-17T13:53:14.766Z', NULL, true, 0.000000),
('0d6f7bac-64a9-4f88-b249-4c1b79444c2b', 'b152ad28-719c-4b53-b549-ef16dc1fa86a', NULL, 0.000000, 0.000000, true, '2026-05-18T10:54:39.511Z', '2026-05-18T10:54:39.511Z', NULL, true, 0.000000),
('eea1841c-ee01-4e7a-9dee-a6cd5e910de4', '810f1467-9ee6-42a1-9dab-e1e36c79283f', NULL, 0.000000, 0.000000, true, '2026-05-18T11:10:12.277Z', '2026-05-18T11:10:12.277Z', NULL, true, 0.000000),
('41cf8a30-9f63-4d79-afd9-34830276e7d4', '5044d0b3-6c22-4238-a111-b784d4d3ad69', NULL, 0.000000, 0.000000, true, '2026-05-21T07:52:40.090Z', '2026-05-21T07:52:40.090Z', NULL, true, 0.000000),
('d61f5f52-96ed-478c-9189-209e06f4abfc', '2b63ba0d-c55c-480a-8ff3-c8df1fc59920', NULL, 0.000000, 0.000000, true, '2026-05-22T08:17:28.942Z', '2026-05-22T08:17:28.942Z', NULL, true, 0.000000),
('6e2550d1-a64b-43cd-8f05-17741191a118', 'be4f0618-d666-4e13-ae8f-13c986784ff7', 'TOwnerWallet001', 999.750000, 0.000000, true, '2026-05-20T22:25:18.907Z', '2026-05-21T00:00:06.991Z', NULL, false, 105.000000),
('3e105914-78d4-4ac9-bec4-b37ccfdccb1f', '09d01668-bf0a-4b77-ae93-24095311c989', NULL, 0.000000, 0.000000, true, '2026-05-22T18:59:14.841Z', '2026-05-22T18:59:14.841Z', NULL, true, 0.000000)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- CHAT_ROOMS TABLE
-- =====================================================
INSERT INTO chat_rooms (id, name, description, type, allowed_roles, emoji, color, created_at) VALUES
(1, 'Common Ground', 'Open to everyone — say hello, share updates, connect.', 'public', NULL, '🌐', '#f59e0b', '2026-05-16T06:40:46.422Z'),
(2, 'Admin War Room', 'Admins only — operations, escalations, platform decisions.', 'role', ARRAY['admin'], '🗂️', '#6366f1', '2026-05-16T06:40:46.495Z'),
(3, 'Bridger Nexus', 'Bridger department — referrals, onboarding, strategy.', 'role', ARRAY['bridger'], '🤝', '#8b5cf6', '2026-05-16T06:40:46.559Z'),
(4, 'Agent Den', 'Agent department — assignments, client updates, ops.', 'role', ARRAY['agent'], '🎯', '#10b981', '2026-05-16T06:40:46.620Z'),
(5, 'Client Lounge', 'Client-only space — questions, feedback, community.', 'role', ARRAY['client'], '🛋️', '#f43f5e', '2026-05-16T06:40:46.681Z')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- LOUNGE_MESSAGES TABLE (Sample - First 20)
-- =====================================================
INSERT INTO lounge_messages (id, room_type, room_id, user_id, sender_name, sender_avatar, content, created_at, message_type, media_url, sender_role) VALUES
('85d2cc74-d40b-4576-85f2-e5b4173bb692', 'public', 'main', NULL, 'Test User', '👤', 'Test message', '2026-05-20T21:05:21.169Z', 'text', NULL, NULL),
('aca98fcf-fc7c-45ab-9e3a-b5339f0e7dcb', 'public', 'main', NULL, 'Platform Admin', '👤', 'hi', '2026-05-20T21:08:10.970Z', 'text', NULL, NULL),
('e10725a5-353b-4437-aedd-d97d163be2e1', 'public', 'main', NULL, 'Platform Admin', '👤', 'hi', '2026-05-20T22:12:56.561Z', 'text', NULL, 'admin'),
('18df0e18-8bc9-443c-b1bf-1579799e4d95', 'public', 'main', '810f1467-9ee6-42a1-9dab-e1e36c79283f', 'Uploaded bri', '👤', 'Hey', '2026-05-20T22:18:32.064Z', 'text', NULL, 'bridger'),
('ed8a966d-60ed-4b76-a000-e310bfeadaea', 'public', 'main', 'be4f0618-d666-4e13-ae8f-13c986784ff7', 'Ecezz Starr', '👤', 'hello', '2026-05-20T23:03:07.135Z', 'text', NULL, 'admin')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- NOTE: Chat messages table has 307,000+ records
-- Export separately using: pg_dump --table=chat_messages
-- Or use the migration script to transfer in batches
-- =====================================================

-- To export all chat_messages from Neon, run in Google Cloud Shell:
-- psql $NEON_DATABASE_URL -c "COPY chat_messages TO STDOUT WITH CSV HEADER" > chat_messages.csv
-- Then import: psql $CLOUD_SQL_URL -c "COPY chat_messages FROM STDIN WITH CSV HEADER" < chat_messages.csv
