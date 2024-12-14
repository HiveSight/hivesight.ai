# Hivesight 


## Supabase

When a new user signs in to Hivesight via Google, a record is dropped into auth.users automatically,
and that triggers:

1. The creation of a Stripe customer id (via Supabase edge function)
2. Placement of the user into the "free" tier

If the user purchases a basic or premium recurring product, then Stripe itself calls the Supabase
edge function to update the tier.

A cron job is running every minute to see if credits need to be dropped based on the user tier and schedule.

An easy way to test the flow is to create users via the Supabase Authentication tab ("Add User" button)
which should trigger the cascade of events.

For testing the app itself, it will be helpful to have test gmail ids, or perhaps unauthenticate our real
gmails and reauthenticate.

### sql

Test queries:

```{sql}
-- To check on Authorization
SELECT * FROM auth.users;

-- To ensure a Stripe Customer Id was created
SELECT * FROM user_stripe_mapping;

-- To see what Tier the user is in
SELECT * FROM public.user_tiers;

-- To check on the credit drops
SELECT * FROM credit_drops;

-- To check on the cron jobs
SELECT * FROM cron.job_run_details ORDER by start_time desc;

-- Look at the available credits view
SELECT * FROM available_credits;

-- Trigger an LLM Say Hello message
INSERT INTO public.hello_triggers (requester_id, say_hello_to)
VALUES ('598fcc9d-3bf7-4bce-8a77-267970dfa385', 'Ronald McDonald');

-- Make sure the LLM job completed
SELECT * FROM hello_triggers;

-- Look at the message
SELECT * FROM gpt_hellos;
```
