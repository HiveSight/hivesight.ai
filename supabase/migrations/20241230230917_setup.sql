-- Load pgTAP
CREATE EXTENSION IF NOT EXISTS pgtap;

BEGIN;

-- Plan the tests
SELECT plan(3);

-- Test 1: Check if items table exists
SELECT has_table(
    'public'::name,
    'items'::name,
    'Table items should exist'
);

-- Test 2: Check if responses table exists
SELECT has_table(
    'public'::name,
    'responses'::name,
    'Table responses should exist'
);

-- Test 3: Check if items table has item_text column
SELECT has_column(
    'public'::name,
    'items'::name,
    'item_text'::name,
    'items table should have item_text column'
);

-- Finish the tests
SELECT * FROM finish();

ROLLBACK;