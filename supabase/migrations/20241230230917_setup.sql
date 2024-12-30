-- Load the pgTAP extension
CREATE EXTENSION IF NOT EXISTS pgtap;

-- Begin testing
BEGIN;

-- Plan the number of tests
SELECT plan(10);

-- 1. Test if the test user is created
DO $$
DECLARE
    test_user_id uuid;
    test_email text;
BEGIN
    -- Generate a random email
    test_email := 'test' || floor(random() * 1000000)::text || '@example.com';
    
    RAISE NOTICE 'Using test email: %', test_email;

    -- Create test user in auth.users
    INSERT INTO auth.users (
        id, email, raw_user_meta_data, email_confirmed_at, created_at, updated_at, last_sign_in_at, raw_app_meta_data
    ) VALUES (
        uuid_generate_v4(),
        test_email,
        '{"name": "Test User"}'::jsonb,
        now(),
        now(),
        now(),
        now(),
        '{"provider": "email", "providers": ["email"]}'::jsonb
    )
    RETURNING id INTO test_user_id;

    PERFORM ok(
        EXISTS(SELECT 1 FROM auth.users WHERE email = test_email),
        'Test user created with email ' || test_email
    );
END $$;

-- 2. Test if a test item is created
DO $$
DECLARE
    test_user_id uuid;
    test_item_id uuid;
BEGIN
    SELECT id INTO test_user_id FROM auth.users WHERE email LIKE 'test%@example.com' LIMIT 1;

    INSERT INTO items (creator_id, item_text)
    VALUES (test_user_id, 'What are your thoughts on remote work?')
    RETURNING item_id INTO test_item_id;

    PERFORM ok(
        EXISTS(SELECT 1 FROM items WHERE item_id = test_item_id),
        'Test item created with ID ' || test_item_id
    );
END $$;

-- 3. Test if test respondents are created
DO $$
DECLARE
    test_user_id uuid;
    test_respondent_count int;
BEGIN
    SELECT id INTO test_user_id FROM auth.users WHERE email LIKE 'test%@example.com' LIMIT 1;

    INSERT INTO respondents (creator_id, source, GESTFIPS, PRTAGE, persona, background, expertise_areas)
    VALUES
        (test_user_id, 'manual', 6, 35, 'Tech Professional', 'Software engineer with 10 years experience', ARRAY['software development','remote work']),
        (test_user_id, 'manual', 36, 42, 'HR Manager', 'Human Resources Director with 15 years experience', ARRAY['hiring','company culture']);

    SELECT COUNT(*) INTO test_respondent_count FROM respondents WHERE creator_id = test_user_id;

    PERFORM is(
        test_respondent_count,
        2,
        'Two test respondents were created'
    );
END $$;

-- 4. Test if a response universe is created
DO $$
DECLARE
    test_user_id uuid;
    test_universe_id uuid;
BEGIN
    SELECT id INTO test_user_id FROM auth.users WHERE email LIKE 'test%@example.com' LIMIT 1;

    INSERT INTO response_universes (creator_id, name, source, description)
    VALUES (test_user_id, 'California Tech Workers', 'CPS', 'Technology professionals in California')
    RETURNING universe_id INTO test_universe_id;

    PERFORM ok(
        EXISTS(SELECT 1 FROM response_universes WHERE universe_id = test_universe_id),
        'Test universe created with ID ' || test_universe_id
    );
END $$;

-- 5. Test if constraints are applied to the response universe
DO $$
DECLARE
    test_universe_id uuid;
    constraint_count int;
BEGIN
    SELECT universe_id INTO test_universe_id 
    FROM response_universes 
    WHERE name = 'California Tech Workers' 
    LIMIT 1;

    INSERT INTO universe_constraints (universe_id, variable, operator, value)
    VALUES
        (test_universe_id, 'GESTFIPS', 'IN', '6,36,48'),
        (test_universe_id, 'PRTAGE', '>=', '25'),
        (test_universe_id, 'PRTAGE', '<=', '35');

    SELECT COUNT(*) INTO constraint_count 
    FROM universe_constraints 
    WHERE universe_id = test_universe_id;

    PERFORM is(
        constraint_count,
        3,
        'Three constraints applied to the response universe'
    );
END $$;

-- 6. Test if queries are created
DO $$
DECLARE
    test_user_id uuid;
    test_item_id uuid;
    test_query_count int;
BEGIN
    SELECT id INTO test_user_id FROM auth.users WHERE email LIKE 'test%@example.com' LIMIT 1;
    SELECT item_id INTO test_item_id FROM items WHERE creator_id = test_user_id LIMIT 1;

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
    )
    VALUES
        (test_item_id, test_user_id, 'gpt-4', 0.7, 1000, 5, 1, 10, 'completed'),
        (test_item_id, test_user_id, 'gpt-4', 0.5, 800, 3, 1, 6, 'in_progress');

    SELECT COUNT(*) INTO test_query_count FROM queries WHERE requester_id = test_user_id;

    PERFORM is(
        test_query_count,
        2,
        'Two test queries were created'
    );
END $$;

-- 7. Test if responses are created
DO $$
DECLARE
    test_query_id uuid;
    test_response_count int;
BEGIN
    SELECT query_id INTO test_query_id FROM queries WHERE execution_status = 'completed' LIMIT 1;

    INSERT INTO responses (query_id, respondent_id, iteration, response_text)
    VALUES (
        test_query_id, 
        (SELECT respondent_id FROM respondents LIMIT 1), 
        0, 
        'Remote work has improved work-life balance'
    );

    SELECT COUNT(*) INTO test_response_count FROM responses WHERE query_id = test_query_id;

    PERFORM is(
        test_response_count,
        1,
        'One test response was created'
    );
END $$;

-- 8. Test invalid age
DO $$
BEGIN
    BEGIN
        INSERT INTO respondents (creator_id, source, GESTFIPS, PRTAGE)
        VALUES (
            (SELECT id FROM auth.users WHERE email LIKE 'test%@example.com' LIMIT 1),
            'manual',
            6,
            150
        );
        PERFORM fail('Expected error for invalid age did not occur');
    EXCEPTION WHEN check_violation THEN
        PERFORM pass('Successfully caught invalid age error');
    END;
END $$;

-- 9. Test invalid temperature
DO $$
BEGIN
    BEGIN
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
        )
        VALUES (
            (SELECT item_id FROM items LIMIT 1),
            (SELECT id FROM auth.users WHERE email LIKE 'test%@example.com' LIMIT 1),
            'gpt-4',
            3.0,
            1000,
            5,
            1,
            10,
            'pending'
        );
        PERFORM fail('Expected error for invalid temperature did not occur');
    EXCEPTION WHEN check_violation THEN
        PERFORM pass('Successfully caught invalid temperature error');
    END;
END $$;

-- 10. Test credit transaction constraints
DO $$
BEGIN
    BEGIN
        INSERT INTO credit_transactions (
            user_id,
            amount,
            transaction_type,
            created_at,
            execute_at,
            executed_at
        )
        VALUES (
            (SELECT id FROM auth.users WHERE email LIKE 'test%@example.com' LIMIT 1),
            0,  -- This should violate the amount_not_zero constraint
            'grant',
            now(),
            now(),
            now()
        );
        PERFORM fail('Expected error for zero amount did not occur');
    EXCEPTION WHEN check_violation THEN
        PERFORM pass('Successfully caught zero amount error');
    END;
END $$;

-- Finish testing
SELECT * FROM finish();

ROLLBACK;