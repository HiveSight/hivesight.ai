-- Load pgTAP
CREATE EXTENSION IF NOT EXISTS pgtap;

BEGIN;

-- Debug output
\echo 'Starting test execution...';

-- Plan just one test
SELECT plan(1);

-- Debug output
\echo 'Plan created, running test...';

-- Just one simple test
SELECT has_table(
    'public',
    'items',
    'Should have items table'
);

-- Debug output
\echo 'Test completed, finishing...';

-- Finish the tests
SELECT * FROM finish();

ROLLBACK;