# Hivesight 


## Supabase

There is no pl/pgsql trigger for the tier update. That is all happeening via the stripe webhook and associated supabase edge function.


### sql
1. 1-auth
Doesn't force the foreign key relationship on anything that's going to be involved with a trigger on auth.users.
Despite the dependency, we can't interfere with new user creation.


2. 2-tiers-and-drops.sql: The cron schedule for the drops, the tiers, and how much users get in each tier.

3. here is the gpt-hellos call here, which I want ot leave for demo purposes.

```
SELECT * FROM public.available_credits;
