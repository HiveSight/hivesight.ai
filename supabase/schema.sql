create table gpt_hellos (
  id uuid default uuid_generate_v4() primary key,
  message text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table hello_triggers (
    id uuid default uuid_generate_v4() primary key,
    requester_name text not null,
    status text default 'pending'::text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up RLS (Row Level Security) with default deny on everything
alter table gpt_hellos enable row level security;
alter table hello_triggers enable row level security;

-- Policies
create policy "Users can only trigger hellos as themselves"
  on hello_triggers for insert
  to authenticated
  with check (requester_name = auth.email());

CREATE POLICY "Users can view their own triggers"
  ON hello_triggers FOR SELECT
  TO authenticated
  USING (requester_name = auth.email());

CREATE POLICY "Users can view their own messages"
  ON gpt_hellos FOR SELECT
  TO authenticated
  USING (id IN (
    SELECT id FROM hello_triggers 
    WHERE requester_name = auth.email()
  ));

-- Create a webhook that triggers when a new hello request is created
CREATE OR REPLACE FUNCTION public.handle_new_hello_trigger()
RETURNS trigger AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://ueguuautcrdolqpyyrjw.functions.supabase.co/hello-gpt'::text,
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := json_build_object(
      'requester_name', NEW.requester_name
    )::jsonb
  );

  UPDATE hello_triggers SET status = 'completed' WHERE id = NEW.id;
  RETURN NEW;

  EXCEPTION WHEN OTHERS THEN
  -- Catch all PL/pgsql exception, reaches here if http_post fails
  UPDATE hello_triggers SET status = 'error' WHERE id = NEW.id;
  RETURN NEW;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
 -- SECURITY DEFINER function is executed with the privileges of the user that owns it

-- Create the trigger
create trigger on_hello_trigger_created
  after insert on hello_triggers
  for each row
  execute procedure public.handle_new_hello_trigger();

  -- Let's see if we can trigger it:
insert into hello_triggers (requester_name) 
values ('Max Ghenis')
returning *;

-- Before I could run this, I needed to enable the net extension in the Supabase UI
