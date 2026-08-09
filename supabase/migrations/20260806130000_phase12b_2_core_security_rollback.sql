-- Phase 12B.2: Core RLS Enablement (Rollback)
-- Reverts Phase 12B.2 changes safely.

-- 1. Drop Settings Policies
DROP POLICY IF EXISTS settings_update_owner ON public.settings;
DROP POLICY IF EXISTS settings_select_authenticated ON public.settings;

-- 2. Drop Profiles Policies
DROP POLICY IF EXISTS profiles_update_owner ON public.profiles;
DROP POLICY IF EXISTS profiles_select_owner ON public.profiles;
DROP POLICY IF EXISTS profiles_select_viewer ON public.profiles;

-- 3. Disable FORCE RLS
ALTER TABLE public.settings NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.profiles NO FORCE ROW LEVEL SECURITY;

-- 4. Disable RLS
ALTER TABLE public.settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
