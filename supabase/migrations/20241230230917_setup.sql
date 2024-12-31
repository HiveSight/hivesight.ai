-- ======================================
-- PREREQUISITES
-- ======================================
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- CREATE EXTENSION IF NOT EXISTS net;  -- If calling external HTTP endpoints in Supabase

-- ======================================
-- 1. CORE TABLES (SUBSCRIPTIONS + CREDITS)
-- ======================================

CREATE TABLE subscription_tiers (
    tier_id uuid NOT NULL,
    tier_name text NOT NULL,
    credits_per_month integer NOT NULL,
    price_cents integer NOT NULL,
    start_ts timestamptz NOT NULL DEFAULT now(),
    end_ts timestamptz NOT NULL DEFAULT '9999-12-31'::timestamptz,
    CONSTRAINT pk_subscription_tiers PRIMARY KEY (tier_id, start_ts),
    CONSTRAINT tier_name_check CHECK (tier_name IN ('free', 'basic', 'premium')),
    CONSTRAINT credits_check CHECK (credits_per_month > 0),
    CONSTRAINT price_check CHECK (price_cents >= 0),
    CONSTRAINT ts_check CHECK (start_ts < end_ts)
);

-- Insert initial tier data
INSERT INTO subscription_tiers (tier_id, tier_name, credits_per_month, price_cents)
VALUES
(uuid_generate_v4(), 'free', 100, 0),
(uuid_generate_v4(), 'basic', 800, 500),     -- $5/month
(uuid_generate_v4(), 'premium', 3000, 2000); -- $20/month

CREATE TABLE subscriptions (
    subscription_id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid NOT NULL,  -- references auth.users(id) in your environment
    subscription_start_ts timestamptz NOT NULL DEFAULT now(),
    subscription_end_ts timestamptz NOT NULL DEFAULT '9999-12-31'::timestamptz,
    tier_id uuid NOT NULL,
    start_ts timestamptz NOT NULL DEFAULT now(),  -- Add start_ts to match the composite key
    stripe_subscription_id text NULL, -- Explicitly nullable for free tier users
    CONSTRAINT subscription_ts_check CHECK (subscription_start_ts < subscription_end_ts)
    -- No foreign key as it's pseudo-SCD2.
);

CREATE TABLE credit_transactions (
    transaction_id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid NOT NULL,  -- references auth.users(id)
    amount integer NOT NULL,
    transaction_type text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    execute_at timestamptz NOT NULL DEFAULT now(), -- When this transaction should be processed
    executed_at timestamptz NULL,                  -- When it was actually processed
    CONSTRAINT transaction_type_check CHECK (transaction_type IN ('grant', 'usage', 'expiration', 'adjustment')),
    CONSTRAINT amount_not_zero CHECK (amount != 0),
    CONSTRAINT execution_timing_check CHECK (execute_at >= created_at),
    CONSTRAINT executed_timing_check CHECK (executed_at IS NULL OR executed_at >= execute_at)
);

-- ======================================
-- 2. VIEWS AND INDEXES
-- ======================================

CREATE VIEW current_subscription_tiers AS
SELECT 
    tier_id,
    tier_name,
    credits_per_month,
    price_cents
FROM subscription_tiers
WHERE now() BETWEEN start_ts AND end_ts;

CREATE OR REPLACE VIEW user_credit_balance AS
SELECT 
    user_id,
    SUM(amount) AS current_balance,
    MAX(created_at) AS last_transaction_at
FROM credit_transactions
WHERE executed_at IS NOT NULL  -- Only count executed transactions
GROUP BY user_id;

CREATE INDEX idx_credit_transactions_user_execution 
ON credit_transactions (user_id, executed_at) 
WHERE executed_at IS NULL;


-- ======================================
-- 3. FUNCTIONS
-- ======================================

-- -----------------------------------------------------
-- 3.1 Utility Functions
-- -----------------------------------------------------

CREATE OR REPLACE FUNCTION call_edge_function(
    function_path text,
    request_body jsonb
) RETURNS jsonb AS $$
DECLARE
    service_role_key TEXT;
    pgnet_id INTEGER;
    http_status INTEGER;
    response_body jsonb;
BEGIN
    -- Adjust this to match your secrets table or remove if unneeded
    SELECT decrypted_secret INTO service_role_key
    FROM vault.decrypted_secrets
    WHERE name = 'SUPABASE_SERVICE_ROLE_KEY';

    SELECT INTO pgnet_id net.http_post(
        url := 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/' || function_path,
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || service_role_key
        ),
        body := request_body
    );

    SELECT status_code, content::jsonb 
    INTO http_status, response_body
    FROM net._http_response
    WHERE id = pgnet_id;

    IF http_status != 200 THEN
        RAISE EXCEPTION 'Edge function % failed with status: %', function_path, http_status;
    END IF;

    RETURN response_body;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION get_subscription_state_log(p_user_id uuid) 
RETURNS text AS
$$
DECLARE
    log_text text := '';
    r RECORD;
BEGIN
    -- Get subscription details
    WITH sub_details AS (
        SELECT 
            s.subscription_start_ts,
            s.subscription_end_ts,
            t.tier_name,
            t.credits_per_month,
            s.stripe_subscription_id
        FROM subscriptions s
        JOIN subscription_tiers t ON s.tier_id = t.tier_id
        WHERE s.user_id = p_user_id
          AND now() BETWEEN s.subscription_start_ts AND s.subscription_end_ts
          AND now() BETWEEN t.start_ts AND t.end_ts
    )
    SELECT 
        E'\n=== Subscription State ===\n' ||
        'Start: ' || subscription_start_ts || E'\n' ||
        'End: ' || subscription_end_ts || E'\n' ||
        'Tier: ' || tier_name || E'\n' ||
        'Credits: ' || credits_per_month || E'\n' ||
        'Stripe Sub ID: ' || COALESCE(stripe_subscription_id, 'NULL') || E'\n' ||
        E'\n=== Credit Transactions ===\n'
    INTO log_text
    FROM sub_details;

    FOR r IN (
        SELECT 
            transaction_type,
            amount,
            executed_at,
            execute_at
        FROM credit_transactions
        WHERE user_id = p_user_id
        ORDER BY COALESCE(executed_at, execute_at)
    ) LOOP
        log_text := log_text || format(
            'Type: %-10s Amount: %-5s Executed: %-30s Scheduled: %s%s',
            r.transaction_type,
            r.amount,
            COALESCE(r.executed_at::text, 'NULL'),
            COALESCE(r.execute_at::text, 'NULL'),
            E'\n'
        );
    END LOOP;

    log_text := log_text || E'\n=== Current Balance ===\n' || (
        SELECT 'Balance: ' || current_balance
        FROM user_credit_balance
        WHERE user_id = p_user_id
    );

    RETURN log_text;
END;
$$ LANGUAGE plpgsql;


-- -----------------------------------------------------
-- 3.2 Tier Management Functions
-- -----------------------------------------------------

CREATE OR REPLACE FUNCTION update_tier_price(
    p_tier_name text,
    p_new_price_cents integer,
    p_new_credits integer DEFAULT NULL
) RETURNS void AS
$$
DECLARE
    v_tier_id uuid;
    v_now timestamptz := now();
BEGIN
    -- Get tier_id from current tier
    SELECT tier_id 
    INTO v_tier_id
    FROM subscription_tiers
    WHERE tier_name = p_tier_name 
      AND v_now BETWEEN start_ts AND end_ts;

    -- End current tier record
    UPDATE subscription_tiers
    SET end_ts = v_now
    WHERE tier_id = v_tier_id 
      AND v_now BETWEEN start_ts AND end_ts;

    -- Insert new tier record
    INSERT INTO subscription_tiers 
        (tier_id, tier_name, credits_per_month, price_cents, start_ts)
    VALUES (
        v_tier_id,
        p_tier_name,
        COALESCE(p_new_credits, (
            SELECT credits_per_month 
            FROM subscription_tiers 
            WHERE tier_id = v_tier_id 
              AND end_ts = v_now
        )),
        p_new_price_cents,
        v_now
    );
END;
$$ LANGUAGE plpgsql;


-- -----------------------------------------------------
-- 3.3 Credit Management Functions
-- -----------------------------------------------------

CREATE OR REPLACE FUNCTION process_pending_credit_transactions() 
RETURNS void AS
$$
BEGIN
    UPDATE credit_transactions 
    SET executed_at = now()
    WHERE executed_at IS NULL
      AND execute_at <= now();
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION process_credit_expiration(p_user_id uuid) 
RETURNS void AS
$$
DECLARE
    monthly_credits integer;
    current_balance integer;
    now_ts timestamptz := now();
    has_pending_expiration boolean;
BEGIN
    -- Check if there's actually an expiration to process
    SELECT EXISTS (
        SELECT 1 
        FROM credit_transactions 
        WHERE user_id = p_user_id
          AND transaction_type = 'expiration'
          AND execute_at <= now_ts
          AND executed_at IS NULL
    )
    INTO has_pending_expiration;

    IF NOT has_pending_expiration THEN
        RETURN;
    END IF;

    -- Get monthly credit allowance
    SELECT st.credits_per_month 
    INTO monthly_credits
    FROM subscriptions s
    JOIN subscription_tiers st ON s.tier_id = st.tier_id
    WHERE s.user_id = p_user_id
      AND now_ts BETWEEN s.subscription_start_ts AND s.subscription_end_ts
      AND now_ts BETWEEN st.start_ts AND st.end_ts;

    -- Execute any pending expirations
    UPDATE credit_transactions 
    SET executed_at = now_ts
    WHERE user_id = p_user_id 
      AND transaction_type = 'expiration'
      AND execute_at <= now_ts
      AND executed_at IS NULL;

    -- Get balance after expiration
    SELECT COALESCE(SUM(amount), 0) 
    INTO current_balance
    FROM credit_transactions
    WHERE user_id = p_user_id
      AND executed_at IS NOT NULL;

    -- If balance is negative, adjust it back to 0
    IF current_balance < 0 THEN
        INSERT INTO credit_transactions 
            (user_id, amount, transaction_type, executed_at)
        VALUES 
            (p_user_id, abs(current_balance), 'adjustment', now_ts);
    END IF;

    -- Grant new monthly credits, schedule next expiration
    INSERT INTO credit_transactions 
        (user_id, amount, transaction_type, executed_at, execute_at)
    VALUES 
        (p_user_id, monthly_credits, 'grant', now_ts, now_ts),
        (p_user_id, -monthly_credits, 'expiration', NULL, now_ts + interval '1 month');
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION process_all_credit_expirations() 
RETURNS void AS
$$
DECLARE
    each_user_id uuid;
BEGIN
    FOR each_user_id IN 
        SELECT DISTINCT s.user_id 
        FROM subscriptions s
        WHERE now() BETWEEN s.subscription_start_ts AND s.subscription_end_ts
    LOOP
        PERFORM process_credit_expiration(each_user_id);
    END LOOP;
END;
$$ LANGUAGE plpgsql;


-- -----------------------------------------------------
-- 3.4 Subscription Management Functions
-- -----------------------------------------------------

CREATE OR REPLACE FUNCTION setup_subscription_credits(
    p_user_id uuid,
    p_tier_name text,
    p_stripe_subscription_id text DEFAULT NULL
) RETURNS void AS
$$
DECLARE
    new_tier_id uuid;
    now_ts timestamptz := now();
BEGIN
    -- Get the new tier ID
    SELECT tier_id INTO new_tier_id
    FROM current_subscription_tiers
    WHERE tier_name = p_tier_name;

    IF new_tier_id IS NULL THEN
        RAISE EXCEPTION 'Invalid tier name: %', p_tier_name;
    END IF;

    -- End current subscription if it exists
    UPDATE subscriptions 
    SET subscription_end_ts = now_ts
    WHERE user_id = p_user_id
      AND now_ts BETWEEN subscription_start_ts AND subscription_end_ts;

    -- Create new subscription record
    INSERT INTO subscriptions (user_id, tier_id, stripe_subscription_id)
    VALUES (p_user_id, new_tier_id, p_stripe_subscription_id);

    -- Grant credits and schedule expiration
    WITH new_credits AS (
        SELECT credits_per_month 
        FROM current_subscription_tiers 
        WHERE tier_id = new_tier_id
    )
    INSERT INTO credit_transactions 
        (user_id, amount, transaction_type, executed_at, execute_at)
    SELECT
        p_user_id,
        credits_per_month,
        'grant',
        now_ts,
        now_ts
    FROM new_credits
    UNION ALL
    SELECT
        p_user_id,
        -credits_per_month,
        'expiration',
        NULL,
        now_ts + interval '1 month'
    FROM new_credits;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION change_user_subscription(
    p_user_id uuid,
    p_tier_name text
) RETURNS text AS
$$
DECLARE
    current_tier text;
    response_body jsonb;
    user_email text;
    log_text text := '';
BEGIN
    -- Get current tier if present
    SELECT t.tier_name 
    INTO current_tier
    FROM subscriptions s
    JOIN subscription_tiers t ON s.tier_id = t.tier_id
    WHERE s.user_id = p_user_id
      AND now() BETWEEN s.subscription_start_ts AND s.subscription_end_ts
      AND now() BETWEEN t.start_ts AND t.end_ts;

    -- Get user email for logging
    SELECT email 
    INTO user_email
    FROM auth.users
    WHERE id = p_user_id;

    -- Start log
    log_text := E'\n=== Changing User Subscription ===\n' ||
                'User ID: ' || p_user_id || E'\n' ||
                'User Email: ' || user_email || E'\n' ||
                'From Tier: ' || COALESCE(current_tier, 'NONE') || E'\n' ||
                'To Tier: ' || p_tier_name || E'\n';

    IF current_tier = p_tier_name THEN
        RAISE EXCEPTION 'User is already on % tier', p_tier_name;
    END IF;

    -- If upgrading from free, create subscription in Stripe
    IF current_tier = 'free' THEN
        response_body := call_edge_function(
            'create-stripe-subscription',
            jsonb_build_object(
                'email', user_email,
                'user_id', p_user_id,
                'tier', p_tier_name
            )
        );
    ELSE
        -- Otherwise, update subscription in Stripe
        SELECT stripe_subscription_id 
        INTO STRICT response_body
        FROM subscriptions 
        WHERE user_id = p_user_id
          AND now() BETWEEN subscription_start_ts AND subscription_end_ts;

        response_body := call_edge_function(
            'update-stripe-subscription',
            jsonb_build_object(
                'user_id', p_user_id,
                'stripe_subscription_id', response_body,
                'new_tier', p_tier_name
            )
        );
    END IF;

    -- Update subscription records and credits
    PERFORM setup_subscription_credits(
        p_user_id,
        p_tier_name,
        CASE WHEN p_tier_name = 'free' THEN NULL 
             ELSE response_body->>'stripe_subscription_id' 
        END
    );

    -- Get final state log
    log_text := log_text || get_subscription_state_log(p_user_id);
    
    RAISE LOG '%', log_text;
    RETURN log_text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ======================================
-- 4. TRIGGERS AND HANDLERS
-- ======================================

CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS
$$
BEGIN
    -- Create a Stripe customer (if needed) and set up a free subscription
    PERFORM call_edge_function(
        'create-stripe-customer',
        jsonb_build_object(
            'email', NEW.email,
            'user_id', NEW.id
        )
    );

    -- Automatically assign free tier
    PERFORM setup_subscription_credits(NEW.id, 'free', NULL);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER handle_new_user_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_new_user();

CREATE OR REPLACE FUNCTION attempt_user_query(
    p_user_id uuid,
    p_item_id uuid,
    p_model text,
    p_temperature numeric,
    p_max_tokens integer,
    p_n_responses integer,
    p_n_responses_per_respondent integer,
    p_universe_id uuid,
    p_credit_cost integer
)
RETURNS uuid  -- We'll return the new query_id
LANGUAGE plpgsql
AS $$
DECLARE
    user_credits integer := 0;
    new_query_id uuid;
BEGIN
    -- 1) Get user’s current credits (can be NULL if no transactions yet)
    SELECT current_balance
      INTO user_credits
      FROM user_credit_balance
     WHERE user_id = p_user_id;
    
    IF user_credits IS NULL THEN
        user_credits := 0;
    END IF;

    -- 2) Check if user has enough credits
    IF user_credits < p_credit_cost THEN
        RAISE EXCEPTION 'Insufficient credits: Required %, but user only has %.',
                        p_credit_cost, user_credits;
    END IF;

    -- 3) Insert usage transaction (negative amount)
    INSERT INTO credit_transactions (
        user_id,
        amount,
        transaction_type,
        created_at,
        execute_at,
        executed_at
    )
    VALUES (
        p_user_id,
        -p_credit_cost,  -- usage cost
        'usage',
        now(),
        now(),
        now()
    );

    -- 4) Insert the new query record
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
    VALUES (
        p_item_id,
        p_user_id,
        p_model,
        p_temperature,
        p_max_tokens,
        p_n_responses,
        p_n_responses_per_respondent,
        p_universe_id,
        p_credit_cost,
        'pending'     -- or whatever status you want
    )
    RETURNING query_id INTO new_query_id;

    RETURN new_query_id;
END;
$$;

-- ======================================
-- 5. TABLES FOR ITEMS, RESPONDENTS, UNIVERSES, ETC.
-- ======================================

-- Just an example design. Adjust as needed for your environment.

CREATE TABLE items (
    item_id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    creator_id uuid NOT NULL,  -- references auth.users(id)
    item_text text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE respondents (
    respondent_id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    creator_id uuid NOT NULL,  -- references auth.users(id)
    source text NOT NULL,      -- e.g. 'manual' or data source
    GESTFIPS integer NOT NULL, -- e.g. numeric code for geographic area
    PRTAGE integer NOT NULL,
    persona text,
    background text,
    expertise_areas text[] DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT prtage_check CHECK (PRTAGE >= 0 AND PRTAGE <= 120)
);

CREATE TABLE response_universes (
    universe_id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    creator_id uuid NOT NULL,   -- references auth.users(id)
    name text NOT NULL,
    source text NOT NULL,
    description text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE universe_constraints (
    constraint_id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    universe_id uuid NOT NULL REFERENCES response_universes(universe_id),
    variable text NOT NULL,
    operator text NOT NULL,  -- e.g. '=', '>', '>=', 'IN'
    value text NOT NULL,     -- e.g. '5,6,7' or '35'
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE queries (
    query_id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    item_id uuid NOT NULL REFERENCES items(item_id),
    requester_id uuid NOT NULL,   -- references auth.users(id)
    model text NOT NULL,          -- e.g. 'gpt-4'
    temperature numeric NOT NULL,
    max_tokens integer NOT NULL,
    n_responses integer NOT NULL,
    n_responses_per_respondent integer NOT NULL,
    universe_id uuid REFERENCES response_universes(universe_id),
    credit_cost integer NOT NULL,
    execution_status text NOT NULL,  -- e.g. 'pending', 'completed', etc.
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT temperature_check CHECK (temperature >= 0 AND temperature <= 2)
);

CREATE TABLE query_respondent_attributes (
    query_id uuid NOT NULL REFERENCES queries(query_id),
    variable text NOT NULL, -- e.g. 'GESTFIPS'
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (query_id, variable)
);

CREATE TABLE responses (
    response_id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    query_id uuid NOT NULL REFERENCES queries(query_id),
    respondent_id uuid NOT NULL REFERENCES respondents(respondent_id),
    iteration integer NOT NULL DEFAULT 0,
    response_text text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE response_attributes (
    response_attribute_id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    response_id uuid NOT NULL REFERENCES responses(response_id),
    attribute text NOT NULL,
    value text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
