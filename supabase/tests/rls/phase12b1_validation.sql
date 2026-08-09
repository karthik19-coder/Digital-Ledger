-- Phase 12B.1 Post-Migration Validation Tests
-- Run this in your SQL editor after applying 20260806120000_phase12b_1_helpers_and_indexes.sql

-- 1. Verify helper functions execute without syntax errors
SELECT public.is_owner();
SELECT public.is_viewer();
SELECT public.is_active_user();

-- 2. Verify Performance / Indexes
-- Ensure that evaluating auth.uid() against profiles does not cause a sequential scan.
-- The query planner should show an Index Scan using `profiles_pkey` or `idx_profiles_id`.
EXPLAIN ANALYZE
SELECT *
FROM public.profiles
WHERE id = auth.uid();
