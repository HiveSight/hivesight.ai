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
