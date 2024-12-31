-- Load the pgTAP extension
CREATE EXTENSION IF NOT EXISTS pgtap;

BEGIN;

-- Plan the tests
SELECT plan(10);

-- First create a test user that we'll use for subsequent tests
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

-- Test 1: Verify user creation
SELECT ok(
    EXISTS(SELECT 1 FROM auth.users WHERE email = 'test123@example.com'),
    'Test user should exist'
);

-- Test 2: Create and verify item
WITH created_item AS (
    INSERT INTO items (
        creator_id,
        item_text
    ) VALUES (
        (SELECT id FROM auth.users WHERE email = 'test123@example.com'),
        'What are your thoughts on remote work?'
    )
    RETURNING item_id
)
SELECT ok(
    EXISTS(SELECT 1 FROM created_item),
    'Test item should be created'
);

-- Test 3 & 4: Create two respondents
WITH created_respondents AS (
    INSERT INTO respondents (
        creator_id,
        source,
        GESTFIPS,
        PRTAGE,
        persona,
        background,
        expertise_areas
    ) VALUES
        ((SELECT id FROM auth.users WHERE email = 'test123@example.com'),
         'manual', 6, 35, 'Tech Professional',
         'Software engineer with 10 years experience',
         ARRAY['software development','remote work']),
        ((SELECT id FROM auth.users WHERE email = 'test123@example.com'),
         'manual', 36, 42, 'HR Manager',
         'Human Resources Director with 15 years experience',
         ARRAY['hiring','company culture'])
    RETURNING respondent_id
)
SELECT ok(
    (SELECT COUNT(*) FROM created_respondents) = 2,
    'Should create exactly two respondents'
);

SELECT ok(
    EXISTS(SELECT 1 FROM respondents WHERE source = 'manual' AND PRTAGE = 35),
    'Should find the tech professional respondent'
);

-- Test 5: Create response universe
WITH created_universe AS (
    INSERT INTO response_universes (
        creator_id,
        name,
        source,
        description
    ) VALUES (
        (SELECT id FROM auth.users WHERE email = 'test123@example.com'),
        'California Tech Workers',
        'CPS',
        'Technology professionals in California'
    )
    RETURNING universe_id
)
SELECT ok(
    EXISTS(SELECT 1 FROM created_universe),
    'Response universe should be created'
);

-- Test 6: Add universe constraints
WITH added_constraints AS (
    INSERT INTO universe_constraints (
        universe_id,
        variable,
        operator,
        value
    ) VALUES (
        (SELECT universe_id FROM response_universes WHERE name = 'California Tech Workers'),
        'GESTFIPS',
        'IN',
        '6,36,48'
    )
    RETURNING constraint_id
)
SELECT ok(
    EXISTS(SELECT 1 FROM added_constraints),
    'Universe constraint should be created'
);

-- Test 7: Create queries
WITH created_queries AS (
    INSERT INTO queries (
        item_id,
        requester_id,
        model,
        temperature,
        max_tokens,
        n_responses,
        n_responses_per_respondent,
        credit_cost,
        execution_status
    ) VALUES (
        (SELECT item_id FROM items LIMIT 1),
        (SELECT id FROM auth.users WHERE email = 'test123@example.com'),
        'gpt-4',
        0.7,
        1000,
        5,
        1,
        10,
        'completed'
    )
    RETURNING query_id
)
SELECT ok(
    EXISTS(SELECT 1 FROM created_queries),
    'Query should be created'
);

-- Test 8: Create response
WITH created_response AS (
    INSERT INTO responses (
        query_id,
        respondent_id,
        response_text
    ) VALUES (
        (SELECT query_id FROM queries WHERE execution_status = 'completed'),
        (SELECT respondent_id FROM respondents LIMIT 1),
        'Remote work has improved work-life balance'
    )
    RETURNING response_id
)
SELECT ok(
    EXISTS(SELECT 1 FROM created_response),
    'Response should be created'
);

-- Test 9: Test invalid age constraint
SELECT throws_ok(
    $$
    INSERT INTO respondents (
        creator_id,
        source,
        GESTFIPS,
        PRTAGE
    ) VALUES (
        (SELECT id FROM auth.users WHERE email = 'test123@example.com'),
        'manual',
        6,
        150
    )
    $$,
    '23514',  -- Updated to match actual error code
    'new row for relation "respondents" violates check constraint "prtage_check"',
    'Should reject age over 120'
);

-- Test 10: Test invalid temperature constraint
SELECT throws_ok(
    $$
    INSERT INTO queries (
        item_id,
        requester_id,
        model,
        temperature,
        max_tokens,
        n_responses,
        n_responses_per_respondent,
        credit_cost,
        execution_status
    ) VALUES (
        (SELECT item_id FROM items LIMIT 1),
        (SELECT id FROM auth.users WHERE email = 'test123@example.com'),
        'gpt-4',
        3.0,
        1000,
        5,
        1,
        10,
        'pending'
    )
    $$,
    '23514',  -- Updated to match actual error code
    'new row for relation "queries" violates check constraint "temperature_check"',
    'Should reject temperature over 2.0'
);

-- Finish the tests
SELECT * FROM finish();

ROLLBACK;