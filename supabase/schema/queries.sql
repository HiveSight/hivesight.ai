-- Create queries table
create table public.queries (
    query_id uuid primary key default uuid_generate_v4(),
    uid uuid references auth.users not null,
    timestamp timestamptz default now() not null,
    query_text text not null,
    model text not null,
    n_responses integer not null,
    response_universe text not null,
    credit_cost numeric not null,
    execution_status text not null check (execution_status in ('started', 'completed', 'abandoned', 'failed'))
);

-- Create index on user ID for faster lookups
create index on public.queries(uid);

-- Enable RLS (Row Level Security)
alter table public.queries enable row level security;

-- Create policies
create policy "Users can insert their own queries"
    on queries for insert
    with check (auth.uid() = uid);

create policy "Users can view their own queries"
    on queries for select
    using (auth.uid() = uid);