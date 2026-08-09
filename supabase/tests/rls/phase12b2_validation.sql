-- Phase 12B.2 Core Security Validation Tests
-- Run this in your SQL editor after applying 20260806130000_phase12b_2_core_security.sql
-- Important: You must impersonate an authenticated user to test RLS accurately via Supabase dashboard.

-- 1. Profiles Table RLS Checks
-- Verify a viewer can only see their own row
SELECT * FROM public.profiles;
-- EXPECTED (Viewer): Returns exactly 1 row matching auth.uid()
-- EXPECTED (Owner): Returns multiple rows

-- Verify an owner cannot demote themselves
UPDATE public.profiles SET role = 'viewer' WHERE id = auth.uid();
-- EXPECTED (Owner): Fails RLS policy check (0 rows affected or Postgres Error)

-- Verify no one can delete profiles
DELETE FROM public.profiles WHERE id = auth.uid();
-- EXPECTED: Fails (0 rows affected)

-- 2. Settings Table RLS Checks
-- Verify settings are readable by all active users
SELECT * FROM public.settings;
-- EXPECTED: Returns the settings row

-- Verify non-owners cannot update settings
-- (Assuming test is run under viewer context)
UPDATE public.settings SET store_name = 'Hacked Store';
-- EXPECTED (Viewer): Fails RLS policy check (0 rows affected)
-- EXPECTED (Owner): Succeeds
