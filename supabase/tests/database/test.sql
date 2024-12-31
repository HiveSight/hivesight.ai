CREATE EXTENSION IF NOT EXISTS pgtap;

BEGIN;

SELECT plan(1);

-- Test for existence of auth schema (this should always exist in Supabase)
SELECT has_schema(
    'auth'::name,
    'Should have auth schema'
);

SELECT * FROM finish();

ROLLBACK;
