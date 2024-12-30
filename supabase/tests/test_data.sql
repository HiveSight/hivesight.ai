DO $$
DECLARE
    test_user_id uuid;
    test_item_id uuid;
    test_respondent_id uuid;
    test_universe_id uuid;
    test_query_id uuid;
    test_response_id uuid;
    test_email text;
BEGIN
    -- Generate a random email like "test123456@example.com"
    test_email := 'test' || floor(random() * 1000000)::text || '@example.com';

    RAISE NOTICE 'Using test email: %', test_email;

    -- 1) Create test user in auth.users
    INSERT INTO auth.users (
        id,
        email,
        raw_user_meta_data,
        email_confirmed_at,
        created_at,
        updated_at,
        last_sign_in_at,
        raw_app_meta_data
    )
    VALUES (
        uuid_generate_v4(),  -- id
        test_email,
        '{"name": "Test User"}',
        now(),
        now(),
        now(),
        now(),
        '{"provider": "email", "providers": ["email"]}'
    )
    RETURNING id INTO test_user_id;

    -- Because of handle_new_user_trigger, this auto-assigns a free subscription.

    -- 2) Create a test item (1 row) and capture its ID
    INSERT INTO items (creator_id, item_text)
    VALUES (test_user_id, 'What are your thoughts on remote work?')
    RETURNING item_id INTO test_item_id;

    -- 3) Create ONE respondent (1 row) and capture its ID
    INSERT INTO respondents (
        creator_id,
        source,
        GESTFIPS,
        PRTAGE,
        persona,
        background,
        expertise_areas
    )
    VALUES
    (
        test_user_id,
        'manual',
        6,  -- California
        35,
        'Tech Professional',
        'Software engineer with 10 years experience',
        ARRAY['software development','remote work','team management']
    )
    RETURNING respondent_id INTO test_respondent_id;

    -- Insert additional respondents WITHOUT returning
    INSERT INTO respondents (
        creator_id,
        source,
        GESTFIPS,
        PRTAGE,
        persona,
        background,
        expertise_areas
    )
    VALUES 
    (
        test_user_id,
        'manual',
        36, -- New York
        42,
        'HR Manager',
        'Human Resources Director with 15 years experience',
        ARRAY['hiring','remote work','company culture']
    ),
    (
        test_user_id,
        'manual',
        48, -- Texas
        28,
        'Startup Founder',
        'Founded two tech startups, currently focusing on AI',
        ARRAY['entrepreneurship','artificial intelligence','team building']
    );

    -- 4) Create ONE test universe (1 row) and capture its ID
    INSERT INTO response_universes (
        creator_id, 
        name, 
        source, 
        description
    )
    VALUES 
    (
        test_user_id,
        'California Tech Workers',
        'CPS',
        'Technology professionals in California'
    )
    RETURNING universe_id INTO test_universe_id;

    -- Insert an additional universe WITHOUT returning
    INSERT INTO response_universes (
        creator_id, 
        name, 
        source, 
        description
    )
    VALUES
    (
        test_user_id,
        'Young Professionals',
        'CPS',
        'Workers aged 25-35 in tech hubs'
    );

    -- Add constraints for that first universe
    INSERT INTO universe_constraints (
        universe_id, variable, operator, value
    )
    VALUES
    (
        test_universe_id,
        'GESTFIPS',
        'IN',
        '6,36,48'
    ),
    (
        test_universe_id,
        'PRTAGE',
        '>=',
        '25'
    ),
    (
        test_universe_id,
        'PRTAGE',
        '<=',
        '35'
    );

    -- 5) Create ONE test query (1 row) and capture its ID
    INSERT INTO queries (
        item_id,
        requester_id,
        model,
        temperature,
        max_tokens,
        n_responses,
        n_responses_per_respondent,
        universe_id,
        credit_cost,
        execution_status
    )
    VALUES
    (
        test_item_id,
        test_user_id,
        'gpt-4',
        0.7,
        1000,
        5,
        1,
        test_universe_id,
        10,
        'completed'
    )
    RETURNING query_id INTO test_query_id;

    -- Insert another query WITHOUT returning
    INSERT INTO queries (
        item_id,
        requester_id,
        model,
        temperature,
        max_tokens,
        n_responses,
        n_responses_per_respondent,
        universe_id,
        credit_cost,
        execution_status
    )
    VALUES
    (
        test_item_id,
        test_user_id,
        'gpt-4',
        0.5,
        800,
        3,
        1,
        test_universe_id,
        6,
        'in_progress'
    );

    -- 6) Add query respondent attributes for the captured query
    INSERT INTO query_respondent_attributes (query_id, variable)
    VALUES
    (test_query_id, 'GESTFIPS'),
    (test_query_id, 'PRTAGE'),
    (test_query_id, 'expertise_areas');

    -- 7) Create responses for that query
    INSERT INTO responses (
        query_id,
        respondent_id,
        iteration,
        response_text
    )
    VALUES
    (
        test_query_id,
        test_respondent_id,
        0,
        'Remote work has dramatically improved work-life balance while maintaining productivity...'
    )
    RETURNING response_id INTO test_response_id;

    -- Add response attributes
    INSERT INTO response_attributes (
        response_id, attribute, value
    )
    VALUES
    (
        test_response_id, 
        'sentiment', 
        'positive'
    ),
    (
        test_response_id, 
        'length', 
        'moderate'
    ),
    (
        test_response_id,
        'topic',
        'work_life_balance'
    );

    -- 8) Test an error case (invalid age)
    BEGIN
        INSERT INTO respondents (
            creator_id, source, GESTFIPS, PRTAGE
        )
        VALUES (
            test_user_id, 'manual', 6, 150
        );
        RAISE EXCEPTION 'Expected error for invalid age did not occur';
    EXCEPTION WHEN check_violation THEN
        RAISE NOTICE 'Successfully caught invalid age error';
    END;

    -- 9) Test an error case (invalid temperature)
    BEGIN
        INSERT INTO queries (
            item_id, requester_id, model, temperature, max_tokens,
            n_responses, n_responses_per_respondent, credit_cost, execution_status
        )
        VALUES (
            test_item_id, test_user_id, 'gpt-4', 3.0, 1000,
            5, 1, 10, 'pending'
        );
        RAISE EXCEPTION 'Expected error for invalid temperature did not occur';
    EXCEPTION WHEN check_violation THEN
        RAISE NOTICE 'Successfully caught invalid temperature error';
    END;
END $$;

-------------------------------------------------------------------------------
-- 7. VERIFICATION QUERIES
-------------------------------------------------------------------------------
-- Check row counts in each table
WITH counts AS (
    SELECT 'Auth Users' AS table_name, COUNT(*) AS count 
      FROM auth.users 
     WHERE email LIKE 'test%'  -- to see all our "testNNNN@example.com" users
    UNION ALL
    SELECT 'Items', COUNT(*) FROM items
    UNION ALL
    SELECT 'Respondents', COUNT(*) FROM respondents
    UNION ALL
    SELECT 'Response Universes', COUNT(*) FROM response_universes
    UNION ALL
    SELECT 'Universe Constraints', COUNT(*) FROM universe_constraints
    UNION ALL
    SELECT 'Queries', COUNT(*) FROM queries
    UNION ALL
    SELECT 'Responses', COUNT(*) FROM responses
    UNION ALL
    SELECT 'Response Attributes', COUNT(*) FROM response_attributes
    UNION ALL
    SELECT 'Subscriptions', COUNT(*) FROM subscriptions
    UNION ALL
    SELECT 'Credit Transactions', COUNT(*) FROM credit_transactions
)
SELECT table_name, count 
FROM counts
ORDER BY table_name;

-- Examine the test user’s subscription tier and credits
-- (In practice, you might filter by the exact email or user ID if desired.)
SELECT 
    u.email,
    u.raw_user_meta_data,
    st.tier_name,
    ucb.current_balance AS credits,
    COUNT(DISTINCT i.item_id) AS items_created,
    COUNT(DISTINCT q.query_id) AS queries_made
FROM auth.users u
LEFT JOIN subscriptions s 
       ON u.id = s.user_id 
      AND now() BETWEEN s.subscription_start_ts AND s.subscription_end_ts
LEFT JOIN subscription_tiers st 
       ON s.tier_id = st.tier_id
      AND now() BETWEEN st.start_ts AND st.end_ts
LEFT JOIN user_credit_balance ucb 
       ON u.id = ucb.user_id
LEFT JOIN items i 
       ON u.id = i.creator_id
LEFT JOIN queries q 
       ON u.id = q.requester_id
WHERE u.email LIKE 'test%'
GROUP BY u.email, u.raw_user_meta_data, st.tier_name, ucb.current_balance;