-- We start with the knowledge that there is auth.users, a table that is automatically
-- populated as new users are authenticated for ther first time

-- user_tiers is 1-1 with auth.users, but we will not enforce the FK relationship,
-- because it could interfere with the creation of an authenticated user. 
CREATE TABLE public.user_tiers (
    user_id uuid PRIMARY KEY,
    tier_name text NOT NULL,
    credit_amount integer NOT NULL,
    credit_frequency interval NOT NULL,
    last_credit_drop_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT valid_tier CHECK (
        tier_name IN ('free', 'basic', 'premium')
    ),
    CONSTRAINT valid_credit_amount CHECK (
        (tier_name = 'free' AND credit_amount = 5) OR
        (tier_name = 'basic' AND credit_amount = 20) OR
        (tier_name = 'premium' AND credit_amount = 50)
    ),
    CONSTRAINT valid_frequency CHECK (
        (tier_name = 'free' AND credit_frequency = interval '5 minutes') OR
        (tier_name = 'basic' AND credit_frequency = interval '3 minutes') OR
        (tier_name = 'premium' AND credit_frequency = interval '1 minute')
    )
);

ALTER TABLE public.user_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tier"
    ON public.user_tiers FOR SELECT
    TO authenticated  -- A role
    USING (user_id = auth.uid()); -- uses the helper function auth.uid()



CREATE OR REPLACE FUNCTION public.admin_set_user_tier(
    p_user_id uuid,
    p_tier_name text
)
RETURNS uuid AS $$
DECLARE
    v_tier_id uuid;
    v_existing_tier public.user_tiers%ROWTYPE; -- a row from user_tiers
BEGIN
    -- First check if user already exists
    SELECT * INTO v_existing_tier 
    FROM public.user_tiers 
    WHERE user_id = p_user_id;
    
    IF v_existing_tier.user_id IS NULL THEN
        -- Insert new record
        INSERT INTO public.user_tiers (
            user_id,
            tier_name,
            credit_amount,
            credit_frequency
        )
        VALUES (
            p_user_id,  -- arg1
            p_tier_name,  -- arg2
            CASE p_tier_name
                WHEN 'free' THEN 5
                WHEN 'basic' THEN 20
                WHEN 'premium' THEN 50
            END,
            CASE p_tier_name
                WHEN 'free' THEN interval '5 minutes'
                WHEN 'basic' THEN interval '3 minutes'
                WHEN 'premium' THEN interval '1 minute'
            END
        )
        RETURNING user_id INTO v_tier_id;  -- get from row that was just inserted
    ELSE
        -- Update existing record
        UPDATE public.user_tiers
        SET 
            tier_name = p_tier_name,
            credit_amount = CASE p_tier_name
                WHEN 'free' THEN 5
                WHEN 'basic' THEN 20
                WHEN 'premium' THEN 50
            END,
            credit_frequency = CASE p_tier_name
                WHEN 'free' THEN interval '5 minutes'
                WHEN 'basic' THEN interval '3 minutes'
                WHEN 'premium' THEN interval '1 minute'
            END
        WHERE user_id = p_user_id
        RETURNING user_id INTO v_tier_id;
    END IF;
    
    RETURN v_tier_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Automatically assign free tier to new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    PERFORM public.admin_set_user_tier(NEW.id, 'free');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

--  STRIPE ---
-- Create mapping table for user_id to stripe_customer_id
-- No referential integrity due to difficulty of trigger operation on auth.users
CREATE TABLE IF NOT EXISTS public.user_stripe_mapping (
    user_id UUID NOT NULL,
    stripe_customer_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (user_id)
);

CREATE OR REPLACE FUNCTION public.create_stripe_customer_trigger()
RETURNS TRIGGER AS $$
DECLARE
    service_role_key TEXT;
    pgnet_id INTEGER;
    http_status INTEGER;
BEGIN

    SELECT decrypted_secret
    INTO service_role_key
    FROM vault.decrypted_secrets
    WHERE name = 'SUPABASE_SERVICE_ROLE_KEY';

    -- Make an HTTP POST request to your Edge Function
    SELECT INTO pgnet_id net.http_post(
        url := 'https://ueguuautcrdolqpyyrjw.supabase.co/functions/v1/create-stripe-customer'::text,
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || service_role_key
        ), 
        body := jsonb_build_object(
            'email', NEW.email,
            'user_id', NEW.id
        )
    );

    SELECT status_code
    INTO http_status
    FROM net._http_response
    WHERE id = pgnet_id;

    -- Check if the request was successful
    IF http_status != 200 THEN
        RAISE LOG '1.g Edge Function call failed with status %', http_status;
        RAISE EXCEPTION '1.g. Failed to call Edge Function (status: %)', http_status;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


create or replace trigger create_stripe_customer_trigger
  after insert on auth.users
  for each row
  execute procedure public.create_stripe_customer_trigger();

-- Clean up
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- DROP FUNCTION IF EXISTS public.handle_new_user;
-- DROP TRIGGER IF EXISTS create_stripe_customer_trigger ON auth.users;
-- DROP FUNCTION IF EXISTS public.create_stripe_customer_trigger;
-- DROP FUNCTION IF EXISTS public.admin_set_user_tier;
-- DROP TABLE IF EXISTS public.user_stripe_mapping;
-- DROP TABLE IF EXISTS public.user_tiers;
