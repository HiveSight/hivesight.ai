-- We have to use the public schema at least for the tables that the Edge function will access
-- TODO: put everything related to hello_triggers demo logic in its own file

CREATE TABLE public.credit_drops (
    drop_id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid NOT NULL,
    amount integer NOT NULL CHECK (amount > 0),
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    used_amount integer DEFAULT 0 CHECK (used_amount >= 0 AND used_amount <= amount),
    CONSTRAINT valid_expiration CHECK (expires_at > created_at)
);

ALTER TABLE public.credit_drops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own credit drops"
    ON public.credit_drops FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE OR REPLACE VIEW public.available_credits AS
SELECT 
    user_id,
    SUM(amount - used_amount) as total_available_credits,
    MIN(expires_at) as next_expiration
FROM public.credit_drops
WHERE 
    now() < expires_at
    AND used_amount < amount
GROUP BY user_id;

CREATE OR REPLACE FUNCTION public.get_total_available_credits(p_user_id uuid)
RETURNS integer AS $$
BEGIN
    RETURN COALESCE(
        (SELECT SUM(amount - used_amount)
         FROM public.credit_drops
         WHERE user_id = p_user_id
         AND now() < expires_at
         AND used_amount < amount),
        0
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- NOTE: hard-coded expiration interval of 1 month
CREATE OR REPLACE FUNCTION public.admin_add_credit_drop(
    p_user_id uuid,
    p_amount integer,
    p_expires_after interval DEFAULT interval '1 month'
)
RETURNS uuid AS $$
DECLARE
    v_drop_id uuid;
BEGIN
    INSERT INTO public.credit_drops (
        user_id,
        amount,
        expires_at
    ) VALUES (
        p_user_id,
        p_amount,
        now() + p_expires_after
    )
    RETURNING drop_id INTO v_drop_id;
    
    RETURN v_drop_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION public.consume_credits(
    p_user_id uuid,
    p_amount integer
)
RETURNS boolean AS $$
DECLARE
    v_remaining integer := p_amount;
    v_drop record;
    v_available integer;
BEGIN
    IF public.get_total_available_credits(p_user_id) < p_amount THEN
        RETURN false;
    END IF;

    -- Lock the relevant credit drops to prevent concurrent access
    FOR v_drop IN 
        SELECT id, amount, used_amount
        FROM public.credit_drops
        WHERE user_id = p_user_id
        AND now() < expires_at
        AND used_amount < amount
        ORDER BY expires_at ASC
        FOR UPDATE
    LOOP
        -- Calculate available credits in this drop
        v_available := v_drop.amount - v_drop.used_amount;
        
        IF v_available >= v_remaining THEN
            -- This drop has enough to cover remaining amount
            UPDATE public.credit_drops 
            SET used_amount = used_amount + v_remaining
            WHERE id = v_drop.id;
            RETURN true;
        ELSE
            -- Use all available credits from this drop and continue to next
            UPDATE public.credit_drops 
            SET used_amount = amount
            WHERE id = v_drop.id;
            
            v_remaining := v_remaining - v_available;
        END IF;
    END LOOP;

    RETURN false; -- Should never reach here due to initial check
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION public.check_sufficient_credits(
    p_user_id uuid,
    p_required_credits integer
)
RETURNS boolean AS $$
BEGIN
    IF p_required_credits <= 0 THEN
        RETURN true;
    END IF;
    
    RETURN public.get_total_available_credits(p_user_id) >= p_required_credits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Optional: Function to get detailed credit information for a user
CREATE OR REPLACE FUNCTION public.get_credit_details(p_user_id uuid)
RETURNS TABLE (
    drop_id uuid,
    available_amount integer,
    expires_at timestamp with time zone,
    is_expired boolean
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        id,
        amount - used_amount as available_amount,
        cd.expires_at,
        now() >= cd.expires_at as is_expired
    FROM public.credit_drops cd
    WHERE user_id = p_user_id
    AND used_amount < amount
    ORDER BY expires_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.refund_credits(
    p_user_id uuid,
    p_amount integer,
    p_drop_id uuid  -- Specific drop to refund to, if known
)
RETURNS boolean AS $$
BEGIN
    IF p_drop_id IS NOT NULL THEN
        -- Refund to specific drop
        UPDATE public.credit_drops
        SET used_amount = used_amount - p_amount
        WHERE id = p_drop_id
        AND user_id = p_user_id
        AND used_amount >= p_amount;
        
        RETURN FOUND;
    ELSE
        -- Refund to most recently used drop that isn't expired
        UPDATE public.credit_drops
        SET used_amount = used_amount - p_amount
        WHERE id = (
            SELECT id
            FROM public.credit_drops
            WHERE user_id = p_user_id
            AND used_amount >= p_amount
            AND expires_at > now()
            ORDER BY expires_at DESC
            LIMIT 1
        );
        
        RETURN FOUND;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -- Cleanup script to remove everything created
-- DROP VIEW IF EXISTS public.available_credits;
-- DROP FUNCTION IF EXISTS public.get_total_available_credits(uuid);
-- DROP FUNCTION IF EXISTS public.admin_add_credit_drop(uuid, integer, interval);
-- DROP FUNCTION IF EXISTS public.consume_credits(uuid, integer);
-- DROP FUNCTION IF EXISTS public.check_sufficient_credits(uuid, integer);
-- DROP FUNCTION IF EXISTS public.get_credit_details(uuid);
-- DROP FUNCTION IF EXISTS public.refund_credits(uuid, integer, uuid);
-- DROP TABLE IF EXISTS public.credit_drops CASCADE;
