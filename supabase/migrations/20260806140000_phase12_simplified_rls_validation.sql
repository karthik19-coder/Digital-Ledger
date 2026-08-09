-- Validation SQL for Phase 12 Simplified RLS
-- IMPORTANT: This is a pseudo-validation script meant to be run in Supabase SQL editor
-- to verify RLS logic by impersonating different users. Do not run in production.

BEGIN;

-- 1. Test Anonymous Access (No role set / Anon role)
SET LOCAL role = 'anon';

-- Should return 0 rows or error (RLS denies anonymous read access)
SELECT count(*) FROM public.sales; 
SELECT count(*) FROM public.expenses;
SELECT count(*) FROM public.business_funds;
SELECT count(*) FROM public.daily_closings;

-- 2. Test Viewer Access
SET LOCAL role = 'authenticated';
-- Impersonate Viewer (replace <VIEWER_UUID> with a valid UUID of a Viewer profile)
-- SELECT set_config('request.jwt.claims', '{"sub": "<VIEWER_UUID>"}', true);

-- Viewer SHOULD be able to read:
SELECT count(*) FROM public.sales;
SELECT count(*) FROM public.expenses;

-- Viewer SHOULD NOT be able to insert (this should fail/return error):
-- INSERT INTO public.sales (id, amount) VALUES (uuid_generate_v4(), 100);

-- 3. Test Owner Access
-- Impersonate Owner (replace <OWNER_UUID> with a valid UUID of an Owner profile)
-- SELECT set_config('request.jwt.claims', '{"sub": "<OWNER_UUID>"}', true);

-- Owner SHOULD be able to read:
SELECT count(*) FROM public.sales;

-- Owner SHOULD be able to insert (should succeed):
-- INSERT INTO public.sales (id, amount) VALUES (uuid_generate_v4(), 100);

-- Owner SHOULD be able to update:
-- UPDATE public.sales SET amount = 200 WHERE id = <id>;

-- Owner SHOULD be able to delete:
-- DELETE FROM public.sales WHERE id = <id>;

ROLLBACK;
