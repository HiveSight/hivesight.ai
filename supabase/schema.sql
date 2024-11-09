CREATE SCHEMA poc;

CREATE TABLE poc.credit_drops (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_email text NOT NULL,
    amount integer NOT NULL CHECK (amount > 0),
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    used_amount integer DEFAULT 0 CHECK (used_amount >= 0 AND used_amount <= amount),
    CONSTRAINT valid_expiration CHECK (expires_at > created_at)
);

ALTER TABLE poc.credit_drops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own credit drops"
    ON poc.credit_drops FOR SELECT
    TO authenticated
    USING (user_email = auth.email());

CREATE OR REPLACE VIEW poc.available_credits AS
SELECT 
    user_email,
    SUM(amount - used_amount) as total_available_credits,
    MIN(expires_at) as next_expiration
FROM poc.credit_drops
WHERE 
    now() < expires_at
    AND used_amount < amount
GROUP BY user_email;

CREATE OR REPLACE FUNCTION poc.get_total_available_credits(p_user_email text)
RETURNS integer AS $$
BEGIN
    RETURN COALESCE(
        (SELECT SUM(amount - used_amount)
         FROM poc.credit_drops
         WHERE user_email = p_user_email
         AND now() < expires_at
         AND used_amount < amount),
        0
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION poc.admin_add_credit_drop(
    p_user_email text,
    p_amount integer,
    p_expires_after interval DEFAULT interval '30 days'
)
RETURNS uuid AS $$
DECLARE
    v_drop_id uuid;
BEGIN
    INSERT INTO poc.credit_drops (
        user_email,
        amount,
        expires_at
    ) VALUES (
        p_user_email,
        p_amount,
        now() + p_expires_after
    )
    RETURNING id INTO v_drop_id;
    
    RETURN v_drop_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION poc.consume_credits(
    p_user_email text,
    p_amount integer
)
RETURNS boolean AS $$
DECLARE
    v_remaining integer := p_amount;
    v_drop record;
    v_available integer;
BEGIN
    -- Quick check if user has enough total credits
    IF poc.get_total_available_credits(p_user_email) < p_amount THEN
        RETURN false;
    END IF;

    -- Lock the relevant credit drops to prevent concurrent access
    FOR v_drop IN 
        SELECT id, amount, used_amount
        FROM poc.credit_drops
        WHERE user_email = p_user_email
        AND now() < expires_at
        AND used_amount < amount
        ORDER BY expires_at ASC
        FOR UPDATE
    LOOP
        -- Calculate available credits in this drop
        v_available := v_drop.amount - v_drop.used_amount;
        
        IF v_available >= v_remaining THEN
            -- This drop has enough to cover remaining amount
            UPDATE poc.credit_drops 
            SET used_amount = used_amount + v_remaining
            WHERE id = v_drop.id;
            RETURN true;
        ELSE
            -- Use all available credits from this drop and continue to next
            UPDATE poc.credit_drops 
            SET used_amount = amount
            WHERE id = v_drop.id;
            
            v_remaining := v_remaining - v_available;
        END IF;
    END LOOP;

    RETURN false; -- Should never reach here due to initial check
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION poc.check_sufficient_credits(
    p_user_email text,
    p_required_credits integer
)
RETURNS boolean AS $$
BEGIN
    IF p_required_credits <= 0 THEN
        RETURN true;
    END IF;
    
    RETURN poc.get_total_available_credits(p_user_email) >= p_required_credits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Optional: Function to get detailed credit information for a user
CREATE OR REPLACE FUNCTION poc.get_credit_details(p_user_email text)
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
    FROM poc.credit_drops cd
    WHERE user_email = p_user_email
    AND used_amount < amount
    ORDER BY expires_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION poc.refund_credits(
    p_user_email text,
    p_amount integer,
    p_drop_id uuid  -- Specific drop to refund to, if known
)
RETURNS boolean AS $$
BEGIN
    IF p_drop_id IS NOT NULL THEN
        -- Refund to specific drop
        UPDATE poc.credit_drops
        SET used_amount = used_amount - p_amount
        WHERE id = p_drop_id
        AND user_email = p_user_email
        AND used_amount >= p_amount;
        
        RETURN FOUND;
    ELSE
        -- Refund to most recently used drop that isn't expired
        UPDATE poc.credit_drops
        SET used_amount = used_amount - p_amount
        WHERE id = (
            SELECT id
            FROM poc.credit_drops
            WHERE user_email = p_user_email
            AND used_amount >= p_amount
            AND expires_at > now()
            ORDER BY expires_at DESC
            LIMIT 1
        );
        
        RETURN FOUND;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION poc.handle_new_hello_trigger()
RETURNS trigger AS $$
BEGIN
    IF NOT poc.check_sufficient_credits(NEW.requester_name, 1) THEN
        UPDATE poc.hello_triggers SET status = 'insufficient credits' WHERE id = NEW.id;
        RETURN NEW;
    END IF;

    IF NOT poc.consume_credits(NEW.requester_name, 1) THEN
        UPDATE poc.hello_triggers SET status = 'insufficient credits' WHERE id = NEW.id;
        RETURN NEW;
    END IF;

    UPDATE poc.hello_triggers SET status = 'processing' WHERE id = NEW.id;

    IF NOT (PERFORM net.http_post(
        url := 'https://ueguuautcrdolqpyyrjw.functions.supabase.co/hello-gpt'::text,
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := json_build_object(
            'requester_name', NEW.requester_name,
            'trigger_id', NEW.id
        )::jsonb
    )) THEN
        PERFORM poc.refund_credits(NEW.requester_name, 1, NULL);
        UPDATE poc.hello_triggers SET status = 'error: HTTP call failed' WHERE id = NEW.id;
        RETURN NEW;
    END IF;

    RETURN NEW;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

create table poc.gpt_hellos (
  id uuid default uuid_generate_v4() primary key,
  message text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table poc.hello_triggers (
    id uuid default uuid_generate_v4() primary key,
    requester_name text not null,
    status text default 'pending'::text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table poc.gpt_hellos enable row level security;
alter table poc.hello_triggers enable row level security;

create policy "Users can only trigger hellos as themselves"
  on poc.hello_triggers for insert
  to authenticated
  with check (requester_name = auth.email());

CREATE POLICY "Users can view their own triggers"
  ON poc.hello_triggers FOR SELECT
  TO authenticated
  USING (requester_name = auth.email());

CREATE POLICY "Users can view their own messages"
  ON poc.gpt_hellos FOR SELECT
  TO authenticated
  USING (id IN (
    SELECT id FROM poc.hello_triggers 
    WHERE requester_name = auth.email()
  ));

-- Triggers are attached to the table and don't need a schema
create trigger on_hello_trigger_created
  after insert on poc.hello_triggers
  for each row
  execute procedure poc.handle_new_hello_trigger();

-- Test 
-- insert into poc.hello_triggers (requester_name) 
-- values ('baogorek@gmail.com')
-- returning *;
