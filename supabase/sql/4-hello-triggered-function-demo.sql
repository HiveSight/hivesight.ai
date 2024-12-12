-- Remainder of this file is a demo of an OpenAI function that does check credits

-- This is where the output will go
create table public.gpt_hellos (
  hello_id uuid default uuid_generate_v4() primary key,
  requester_id uuid not null,
  message text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Insert a record into this to generate a message:
create table public.hello_triggers (
    hello_trigger_id uuid default uuid_generate_v4() primary key,
    requester_id uuid not null,
    say_hello_to text default 'the world!'::text,
    status text default 'pending'::text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.gpt_hellos enable row level security;
alter table public.hello_triggers enable row level security;

CREATE POLICY "Users can view their own messages"
  ON public.gpt_hellos FOR SELECT
  TO authenticated
  USING (requester_id = auth.uid());

create policy "Users can only trigger hellos as themselves"
  on public.hello_triggers for insert
  to authenticated
  with check (requester_id = auth.uid());

CREATE POLICY "Users can view their own triggers"
  ON public.hello_triggers FOR SELECT
  TO authenticated
  USING (requester_id = auth.uid());

-- Trigger function
-- Will run once a record is placed in hello_triggers, so that's the type that NEW is
CREATE OR REPLACE FUNCTION public.handle_new_hello_trigger()
RETURNS trigger AS $$
DECLARE
    service_role_key TEXT;
    pgnet_id INTEGER;
    http_status INTEGER;
BEGIN
    IF NOT public.check_sufficient_credits(NEW.requester_id, 1) THEN
        UPDATE public.hello_triggers SET status = 'insufficient credits' WHERE hello_trigger_id = NEW.hello_trigger_id;
        RETURN NEW;
    END IF;

    IF NOT public.consume_credits(NEW.requester_id, 1) THEN
        UPDATE public.hello_triggers SET status = 'insufficient credits' WHERE hello_trigger_id = NEW.hello_trigger_id;
        RETURN NEW;
    END IF;

    UPDATE public.hello_triggers SET status = 'processing' WHERE hello_trigger_id = NEW.hello_trigger_id;

    SELECT decrypted_secret
    INTO service_role_key
    FROM vault.decrypted_secrets
    WHERE name = 'SUPABASE_SERVICE_ROLE_KEY';

    SELECT INTO pgnet_id net.http_post(
        url := 'https://ueguuautcrdolqpyyrjw.supabase.co/functions/v1/hello-gpt'::text,
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || service_role_key
        ), 
        body := jsonb_build_object(
            'requester_name', NEW.say_hello_to
        )
    );

    SELECT status_code
    INTO http_status
    FROM net._http_response
    WHERE id = pgnet_id;

    IF http_status != 200 THEN
        PERFORM public.refund_credits(NEW.requester_id, 1, NULL);
        UPDATE public.hello_triggers SET status = 'error: HTTP status ' || http_status WHERE id = NEW.id;
        RETURN NEW;
    END IF;

    RETURN NEW;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Actual Trigger
create trigger on_hello_trigger_created
  after insert on public.hello_triggers
  for each row
  execute procedure public.handle_new_hello_trigger();


-- -- Cleanup script to remove everything created
-- DROP TRIGGER IF EXISTS on_hello_trigger_created ON public.hello_triggers;
-- DROP FUNCTION IF EXISTS public.handle_new_hello_trigger();
-- DROP TABLE IF EXISTS public.gpt_hellos CASCADE;
-- DROP TABLE IF EXISTS public.hello_triggers CASCADE;
