-- ===========================================
-- SYSTEM BRIDGE DATA MIGRATION
-- Exported from Neon PostgreSQL
-- ===========================================

-- Insert Users
INSERT INTO users (id, email, password_hash, name, avatar_url, role, google_id, tron_wallet_address, created_at, updated_at, last_login, is_active, username, departmental_code, field_presence_minutes, referral_code, referred_by, assigned_agent_id, whatsapp_number) VALUES
('3a11e863-39b9-4d1f-806a-91c42ef2fd9c', 'testfix@test.com', '$2b$10$F33LIGBFwjBfiq8ezgE.WOkkA7K17hTASqt9DViefG8Xq95oZ.MLm', 'Test Fix', NULL, 'agent', NULL, NULL, '2026-05-16T19:11:30.711Z', '2026-05-16T19:11:30.711Z', NULL, true, 'testfix99', 'AGENT', 0, NULL, NULL, NULL, NULL),
('a3a7f370-4ba7-474c-a9fa-12101b44a672', 'testfix2@test.com', '$2b$10$VSmGn1naSyRfpWOzyBb3QeVmerYcHlpMtznixc5PbkNv78ud0AlK2', 'Test Fix2', NULL, 'agent', NULL, NULL, '2026-05-16T19:12:51.259Z', '2026-05-16T19:12:51.259Z', NULL, true, 'testfix2', 'AGENT', 0, NULL, NULL, NULL, NULL),
('6eb3acae-0487-4420-8b39-ed1662b7bc2d', 'kennytalker785@gmail.com', '$2b$10$9TxQ2eXT3MSssofJLOhlXu3CIF8o0p/ubXKahhFCb6bXIcBB4lU8O', 'Oyedepo Kenny', NULL, 'agent', NULL, NULL, '2026-05-17T13:53:14.740Z', '2026-05-17T13:53:14.740Z', NULL, true, ' Kenny ', 'AGENT', 0, NULL, NULL, NULL, NULL),
('b152ad28-719c-4b53-b549-ef16dc1fa86a', 'enegideuche2022@gmail.com', '$2b$10$m2A0ErGIXt70/gZYhrhuEemm.w4bVL78FsRsq7588Ga1785bS86fW', 'Kelly Uch', NULL, 'bridger', NULL, NULL, '2026-05-18T10:54:39.491Z', '2026-05-18T10:54:39.491Z', NULL, true, 'Kel', 'BRIDGER', 0, NULL, NULL, NULL, NULL),
('be4f0618-d666-4e13-ae8f-13c986784ff7', 'ecezzstarr@gmail.com', '$2b$10$adminhashedpassword', 'Ecezz Starr', NULL, 'admin', NULL, NULL, '2026-05-20T22:25:08.376Z', '2026-05-20T22:25:08.376Z', NULL, true, NULL, 'OWNER-001', 0, NULL, NULL, NULL, NULL),
('5044d0b3-6c22-4238-a111-b784d4d3ad69', 'Kellyossai27@gmail.com', '$2b$10$dI7zOSxxtmgnBwPhryxdKeoXUhIQgQ/PY8KjddxN6n7FJIIANuLWy', 'Kelly', NULL, 'bridger', NULL, NULL, '2026-05-21T07:52:40.079Z', '2026-05-21T07:52:40.079Z', NULL, true, 'Wizzy', 'BRIDGER', 0, NULL, NULL, NULL, NULL),
('2b63ba0d-c55c-480a-8ff3-c8df1fc59920', 'kennytalker472@gmail.com', '$2b$10$9f4RhxtmgnBwPhryxdKeoXUhIQgQ/PY8KjddxN6n7FJIIANuLWz', 'Kenny T', NULL, 'bridger', NULL, NULL, '2026-05-22T08:17:28.935Z', '2026-05-22T08:17:28.935Z', NULL, true, 'KennyT', 'BRIDGER', 0, NULL, NULL, NULL, NULL),
('d04c341d-1d5a-4575-8848-1e6bb027ad68', 'agent1@test.com', '$2b$10$testpasswordhash', 'Agent One', NULL, 'agent', NULL, NULL, '2026-05-17T13:10:04.762Z', '2026-05-17T13:10:04.762Z', NULL, true, 'agent1', 'AGENT', 0, NULL, NULL, NULL, NULL),
('810f1467-9ee6-42a1-9dab-e1e36c79283f', 'bridger1@test.com', '$2b$10$testpasswordhash', 'Bridger One', NULL, 'bridger', NULL, NULL, '2026-05-18T11:10:12.270Z', '2026-05-18T11:10:12.270Z', NULL, true, 'bridger1', 'BRIDGER', 0, NULL, NULL, NULL, NULL),
('09d01668-bf0a-4b77-ae93-24095311c989', 'newuser@test.com', '$2b$10$testpasswordhash', 'New User', NULL, 'bridger', NULL, NULL, '2026-05-22T18:59:14.834Z', '2026-05-22T18:59:14.834Z', NULL, true, 'newuser', 'BRIDGER', 0, NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- Insert Wallets
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

-- Insert Clients
INSERT INTO clients (id, name, email, phone, password_hash, business_name, referred_by, assigned_bridger_id, role, created_at, updated_at) VALUES
('b6cd135a-7a4a-49b5-b269-ea114940f2c0', 'firstCLIENT', 'wingstogether2@gmail.com', '+17829072104', '$2b$10$yYQFXFTqDvM3SSTnHKVSzONVjCcoYn6CySQDlnqTYTHhwG7o4TEXm', 'clientfirst', NULL, NULL, 'client', '2026-05-23T10:07:16.961Z', '2026-05-23T10:07:16.961Z')
ON CONFLICT (id) DO NOTHING;

-- Insert Profiles (for lounge/river chat)
INSERT INTO profiles (id, name, avatar, online, created_at) VALUES
(1, 'System Bridge', '/avatars/system.png', true, NOW()),
(2, 'Admin Support', '/avatars/admin.png', true, NOW()),
(3, 'Agent Alpha', '/avatars/agent1.png', false, NOW()),
(4, 'Agent Beta', '/avatars/agent2.png', false, NOW()),
(5, 'Bridger One', '/avatars/bridger1.png', false, NOW()),
(6, 'Bridger Two', '/avatars/bridger2.png', false, NOW()),
(7, 'Bridger Three', '/avatars/bridger3.png', false, NOW()),
(8, 'Bridger Four', '/avatars/bridger4.png', false, NOW()),
(9, 'Bridger Five', '/avatars/bridger5.png', false, NOW()),
(10, 'Bridger Six', '/avatars/bridger6.png', false, NOW()),
(11, 'Bridger Seven', '/avatars/bridger7.png', false, NOW()),
(12, 'Bridger Eight', '/avatars/bridger8.png', false, NOW()),
(13, 'Bridger Nine', '/avatars/bridger9.png', false, NOW()),
(14, 'Bridger Ten', '/avatars/bridger10.png', false, NOW()),
(15, 'Agent Gamma', '/avatars/agent3.png', false, NOW()),
(16, 'Agent Delta', '/avatars/agent4.png', false, NOW()),
(17, 'Support One', '/avatars/support1.png', false, NOW()),
(18, 'Support Two', '/avatars/support2.png', false, NOW())
ON CONFLICT (id) DO NOTHING;

-- Reset sequence for profiles
SELECT setval('profiles_id_seq', (SELECT MAX(id) FROM profiles));

-- Note: Messages table contains 34,770+ messages from the lounge/river chat
-- For full message import, run: psql -f messages-export.sql
-- A separate messages export file will be created for the full data
