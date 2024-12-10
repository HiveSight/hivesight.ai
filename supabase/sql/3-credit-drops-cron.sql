-- Credit drops for a specific user and schedule expiration
-- NOTE: expiration interval is hard-coded!
CREATE OR REPLACE FUNCTION public.process_user_credit_drop(p_user_id uuid)
RETURNS void AS $$
DECLARE
    v_tier record;
BEGIN
    RAISE LOG 'Processing credit drop for % at %', p_user_id, now();
    -- Get user tier info
    SELECT * INTO v_tier
    FROM public.user_tiers
    WHERE user_id = p_user_id
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE LOG 'No tier found for %', p_user_id;
        RETURN;
    END IF;
    
    -- Check if it's time for a new credit drop
    IF v_tier.last_credit_drop_at IS NULL OR 
       (now() - v_tier.last_credit_drop_at) >= v_tier.credit_frequency THEN
        -- Add credits
        PERFORM public.admin_add_credit_drop(
            p_user_id := v_tier.user_id,
            p_amount := v_tier.credit_amount,
            p_expires_after := interval '1 day'  -- Short expiration for testing
        );
        
        -- Update last credit drop timestamp
        UPDATE public.user_tiers
        SET last_credit_drop_at = now()
        WHERE user_id = p_user_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process all users' credit drops
-- NOTE: Claude is warning this could become expensive and there are ways to improve it
CREATE OR REPLACE FUNCTION public.process_all_credit_drops()
RETURNS void AS $$
DECLARE
    v_user record;
BEGIN
    FOR v_user IN SELECT user_id FROM public.user_tiers LOOP
        PERFORM public.process_user_credit_drop(v_user.user_id);
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule the credit drop processor to run every minute
SELECT cron.schedule(
    'process-credit-drops',
    '* * * * *',  -- Every minute
    $$SELECT public.process_all_credit_drops()$$
);

-- TODO: figure out the purpose of this below
-- Function to manage user tier changes and insertions
CREATE OR REPLACE FUNCTION public.manage_user_tier()
RETURNS trigger AS $$
BEGIN
    RAISE LOG 'Tier management trigger fired at % for %', now(), NEW.user_id;
    -- Set the updated_at timestamp
    NEW.updated_at = now();
    
    -- If this is a new record or tier changed, process immediate credit drop
    IF (TG_OP = 'INSERT') OR (OLD.tier_name IS NULL OR NEW.tier_name != OLD.tier_name) THEN
        RAISE LOG 'Processing immediate drop for new/changed tier at % for %', now(), NEW.user_id;
        NEW.last_credit_drop_at = NULL;  -- Force immediate credit drop
        PERFORM public.process_user_credit_drop(NEW.user_id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for user tier management
CREATE TRIGGER on_user_tier_change
    BEFORE INSERT OR UPDATE ON public.user_tiers
    FOR EACH ROW
    EXECUTE FUNCTION public.manage_user_tier();


-- -- Cleanup
-- -- Remove scheduled job if it exists (only if pg_cron was successfully set up)
-- SELECT cron.unschedule('process-credit-drops');
-- 
-- -- Drop functions in reverse dependency order
-- DROP FUNCTION IF EXISTS public.admin_set_user_tier(text, text);
-- DROP TRIGGER IF EXISTS on_user_tier_change ON user_tiers;
-- DROP FUNCTION IF EXISTS public.manage_user_tier();
-- DROP FUNCTION IF EXISTS public.process_all_credit_drops();
-- DROP FUNCTION IF EXISTS public.process_user_credit_drop(uuid);

