create table gpt_hellos (
  id uuid default uuid_generate_v4() primary key,
  message text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up RLS (Row Level Security)
alter table gpt_hellos enable row level security;

-- Allow all authenticated users to read
create policy "Anyone can read hellos"
  on gpt_hellos for select
  to authenticated
  using (true);

-- Allow all authenticated users to insert
create policy "Anyone can create hellos"
  on gpt_hellos for insert
  to authenticated
  with check (true);


-- Create the hello_requests table that will trigger our function
create table public.hello_requests (
  id uuid default gen_random_uuid() primary key,
  requester_name text,
  requested_at timestamp with time zone default now(),
  status text default 'pending'
);

-- Create the existing gpt_hellos table if it doesn't exist
create table public.gpt_hellos (
  id uuid default gen_random_uuid() primary key,
  message text not null,
  created_at timestamp with time zone default now(),
  request_id uuid references public.hello_requests(id)
);

-- Enable row level security
alter table public.hello_requests enable row level security;
alter table public.gpt_hellos enable row level security;


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

  UPDATE hello_triggers 
  SET status = 'completed' 
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
