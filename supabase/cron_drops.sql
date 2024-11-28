-- Create user tiers table
CREATE TABLE public.user_tiers (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_email text NOT NULL UNIQUE,
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

-- Enable RLS on the new table
ALTER TABLE public.user_tiers ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own tier
CREATE POLICY "Users can view their own tier"
    ON public.user_tiers FOR SELECT
    TO authenticated
    USING (user_email = auth.email());

-- Function to handle credit drops for a specific user
CREATE OR REPLACE FUNCTION public.process_user_credit_drop(p_user_email text)
RETURNS void AS $$
DECLARE
    v_tier record;
BEGIN
    RAISE LOG 'Processing credit drop for % at %', p_user_email, now();
    -- Get user tier info
    SELECT * INTO v_tier
    FROM public.user_tiers
    WHERE user_email = p_user_email
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE LOG 'No tier found for %', p_user_email;
        RETURN;
    END IF;
    
    -- Check if it's time for a new credit drop
    IF v_tier.last_credit_drop_at IS NULL OR 
       (now() - v_tier.last_credit_drop_at) >= v_tier.credit_frequency THEN
        -- Add credits
        PERFORM public.admin_add_credit_drop(
            p_user_email := v_tier.user_email,
            p_amount := v_tier.credit_amount,
            p_expires_after := interval '1 day'  -- Short expiration for testing
        );
        
        -- Update last credit drop timestamp
        UPDATE public.user_tiers
        SET last_credit_drop_at = now()
        WHERE user_email = p_user_email;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process all users' credit drops
CREATE OR REPLACE FUNCTION public.process_all_credit_drops()
RETURNS void AS $$
DECLARE
    v_user record;
BEGIN
    FOR v_user IN SELECT user_email FROM public.user_tiers LOOP
        PERFORM public.process_user_credit_drop(v_user.user_email);
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- unschedule if you need to run it again
SELECT cron.unschedule('process-credit-drops');

-- Schedule the credit drop processor to run every minute
SELECT cron.schedule(
    'process-credit-drops',
    '* * * * *',  -- Every minute
    $$SELECT public.process_all_credit_drops()$$
);

-- Function to manage user tier changes and insertions
CREATE OR REPLACE FUNCTION public.manage_user_tier()
RETURNS trigger AS $$
BEGIN
    RAISE LOG 'Tier management trigger fired at % for %', now(), NEW.user_email;
    -- Set the updated_at timestamp
    NEW.updated_at = now();
    
    -- If this is a new record or tier changed, process immediate credit drop
    IF (TG_OP = 'INSERT') OR (OLD.tier_name IS NULL OR NEW.tier_name != OLD.tier_name) THEN
        RAISE LOG 'Processing immediate drop for new/changed tier at % for %', now(), NEW.user_email;
        NEW.last_credit_drop_at = NULL;  -- Force immediate credit drop
        PERFORM public.process_user_credit_drop(NEW.user_email);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for user tier management
CREATE TRIGGER on_user_tier_change
    BEFORE INSERT OR UPDATE ON public.user_tiers
    FOR EACH ROW
    EXECUTE FUNCTION public.manage_user_tier();

-- Helper function to add or update user tier

CREATE OR REPLACE FUNCTION public.admin_set_user_tier(
    p_user_email text,
    p_tier_name text
)
RETURNS uuid AS $$
DECLARE
    v_tier_id uuid;
    v_existing_tier public.user_tiers%ROWTYPE;
BEGIN
    -- First check if user already exists
    SELECT * INTO v_existing_tier 
    FROM public.user_tiers 
    WHERE user_email = p_user_email;
    
    IF v_existing_tier.id IS NULL THEN
        -- Insert new record
        INSERT INTO public.user_tiers (
            user_email,
            tier_name,
            credit_amount,
            credit_frequency
        )
        VALUES (
            p_user_email,
            p_tier_name,
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
        RETURNING id INTO v_tier_id;
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
        WHERE user_email = p_user_email
        RETURNING id INTO v_tier_id;
    END IF;
    
    RETURN v_tier_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Test script
SELECT * FROM public.available_credits WHERE user_email = 'snoopy@gmail.com';

SELECT * FROM public.user_tiers;

-- Set or Change tier
SELECT public.admin_set_user_tier('snoopy@gmail.com', 'basic');

SELECT * FROM public.credit_drops
WHERE user_email = 'snoopy@gmail.com'
ORDER BY created_at DESC;

-- Let's see and immediately check
SELECT public.admin_set_user_tier('horsey@gmail.com', 'free');
SELECT * FROM public.credit_drops WHERE user_email = 'horsey@gmail.com';
SELECT * FROM public.available_credits WHERE user_email = 'horsey@gmail.com';


-- Cleanup
DROP TRIGGER IF EXISTS on_user_tier_change ON public.user_tiers;

-- Remove scheduled job if it exists (only if pg_cron was successfully set up)
SELECT cron.unschedule('process-credit-drops');

-- Drop functions in reverse dependency order
DROP FUNCTION IF EXISTS public.admin_set_user_tier(text, text);
DROP FUNCTION IF EXISTS public.manage_user_tier();
DROP FUNCTION IF EXISTS public.process_all_credit_drops();
DROP FUNCTION IF EXISTS public.process_user_credit_drop(text);

-- Drop tables (policies will be dropped automatically)
DROP TABLE IF EXISTS public.user_tiers CASCADE;
