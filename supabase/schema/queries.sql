-- Create users table (extends auth.users)
create table public.users (
    uid uuid primary key references auth.users,
    subscription_tier text not null,
    credits numeric not null default 0,
    created_at timestamptz default now() not null
);

-- Subscription histories
create table public.subscription_histories (
    subscription_history_id uuid primary key default uuid_generate_v4(),
    uid uuid references auth.users not null,
    start_date timestamptz not null,
    end_date timestamptz,
    subscription_tier text not null,
    created_at timestamptz default now() not null,
    constraint valid_date_range check (end_date is null or end_date > start_date)
);

-- Queries
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

-- Query attributes (EAV)
create table public.query_attributes (
    query_id uuid references queries on delete cascade not null,
    attribute text not null,
    value text not null,
    primary key (query_id, attribute)
);

-- Respondents
create table public.respondents (
    respondent_id uuid primary key default uuid_generate_v4(),
    user_creator uuid references auth.users not null,
    created_date timestamptz default now() not null,
    last_used_date timestamptz default now() not null
);

-- Respondent attributes (EAV)
create table public.respondent_attributes (
    respondent_id uuid references respondents on delete cascade not null,
    attribute text not null,
    value text not null,
    primary key (respondent_id, attribute)
);

-- Responses
create table public.responses (
    response_id uuid primary key default uuid_generate_v4(),
    query_id uuid references queries on delete cascade not null,
    respondent_id uuid references respondents not null,
    created_at timestamptz default now() not null
);

-- Response attributes (EAV)
create table public.response_attributes (
    response_id uuid references responses on delete cascade not null,
    attribute text not null,
    value text not null,
    primary key (response_id, attribute)
);

-- Create indexes
create index on subscription_histories(uid);
create index on subscription_histories(start_date, end_date);
create index on queries(uid);
create index on queries(timestamp);
create index on respondents(user_creator);
create index on respondents(last_used_date);
create index on responses(query_id);
create index on responses(respondent_id);

-- Enable RLS on all tables
alter table public.users enable row level security;
alter table public.subscription_histories enable row level security;
alter table public.queries enable row level security;
alter table public.query_attributes enable row level security;
alter table public.respondents enable row level security;
alter table public.respondent_attributes enable row level security;
alter table public.responses enable row level security;
alter table public.response_attributes enable row level security;

-- RLS Policies

-- Users table
create policy "Users can view their own record"
    on users for select
    using (auth.uid() = uid);

-- Subscription histories
create policy "Users can view their own subscription history"
    on subscription_histories for select
    using (auth.uid() = uid);

-- Queries
create policy "Users can insert their own queries"
    on queries for insert
    with check (auth.uid() = uid);

create policy "Users can view their own queries"
    on queries for select
    using (auth.uid() = uid);

-- Query attributes
create policy "Users can view attributes of their own queries"
    on query_attributes for select
    using (exists (
        select 1 from queries 
        where queries.query_id = query_attributes.query_id 
        and queries.uid = auth.uid()
    ));

-- Respondents
create policy "Users can view respondents they created"
    on respondents for select
    using (user_creator = auth.uid());

create policy "Users can create respondents"
    on respondents for insert
    with check (user_creator = auth.uid());

-- Respondent attributes
create policy "Users can view attributes of respondents they created"
    on respondent_attributes for select
    using (exists (
        select 1 from respondents
        where respondents.respondent_id = respondent_attributes.respondent_id
        and respondents.user_creator = auth.uid()
    ));

-- Responses
create policy "Users can view responses to their queries"
    on responses for select
    using (exists (
        select 1 from queries
        where queries.query_id = responses.query_id
        and queries.uid = auth.uid()
    ));

-- Response attributes
create policy "Users can view attributes of responses to their queries"
    on response_attributes for select
    using (exists (
        select 1 from responses
        join queries on queries.query_id = responses.query_id
        where responses.response_id = response_attributes.response_id
        and queries.uid = auth.uid()
    ));

-- Add helpful views for common queries
create view user_current_subscription as
    select distinct on (uid) *
    from subscription_histories
    where end_date is null or end_date > now()
    order by uid, start_date desc;

create view active_respondents as
    select r.*, count(res.response_id) as total_responses
    from respondents r
    left join responses res on r.respondent_id = res.respondent_id
    where r.last_used_date > now() - interval '30 days'
    group by r.respondent_id;