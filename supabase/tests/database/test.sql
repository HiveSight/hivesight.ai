-- Load the pgTAP extension
CREATE EXTENSION IF NOT EXISTS pgtap;

BEGIN;

-- Plan two tests
SELECT plan(2);

-- Test 1: Insert user and verify insertion succeeded
INSERT INTO auth.users (
    id, 
    email,
    raw_user_meta_data,
    email_confirmed_at,
    created_at,
    updated_at,
    last_sign_in_at,
    raw_app_meta_data
) VALUES (
    uuid_generate_v4(),
    'test123@example.com',
    '{"name": "Test User"}'::jsonb,
    now(),
    now(),
    now(),
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb
);

SELECT ok(
    true,
    'Insert completed without error'
);

-- Test 2: Verify the user exists
SELECT ok(
    EXISTS(
        SELECT 1 FROM auth.users WHERE email = 'test123@example.com'
    ),
    'Should find the inserted user'
);

-- Finish the tests
SELECT * FROM finish();

ROLLBACK;