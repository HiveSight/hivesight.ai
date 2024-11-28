-- Function to automatically assign free tier to new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    -- Assign free tier to new user
    PERFORM public.admin_set_user_tier(NEW.email, 'free');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users to auto-assign free tier
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

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

