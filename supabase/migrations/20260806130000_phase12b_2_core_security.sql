-- Phase 12B.2: Core RLS Enablement
-- This migration enables RLS for core system tables (profiles and settings) and establishes their policies.

-- ==============================================================================
-- 1. Enable RLS
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Evaluate FORCE ROW LEVEL SECURITY:
-- We FORCE RLS on profiles to ensure that even table owners cannot bypass the restricted 
-- UPDATE logic (e.g. escalating their own privileges). The service_role bypasses this by default.
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

-- We FORCE RLS on settings for the same reason.
ALTER TABLE public.settings FORCE ROW LEVEL SECURITY;


-- ==============================================================================
-- 2. Profiles Policies
-- ==============================================================================

-- A. Viewer Read: Viewers can only select their own profile.
CREATE POLICY profiles_select_viewer ON public.profiles
FOR SELECT
TO authenticated
USING (
    public.is_active_user() 
    AND id = auth.uid()
);

-- B. Owner Read: Owners can select all profiles (required for Phase 13 User Management).
CREATE POLICY profiles_select_owner ON public.profiles
FOR SELECT
TO authenticated
USING (
    public.is_active_user() 
    AND public.is_owner()
);

-- C. Owner Update: Owners can update profiles, but cannot elevate/demote their own role.
-- (Note: Deleting profiles is blocked entirely as there is no DELETE policy.)
CREATE POLICY profiles_update_owner ON public.profiles
FOR UPDATE
TO authenticated
USING (
    public.is_active_user() 
    AND public.is_owner() 
    -- Target row being updated is not the owner's own row, OR it is their own row but they are not altering the role
    AND (id != auth.uid() OR (id = auth.uid() AND role = 'owner')) 
)
WITH CHECK (
    -- Prevent an owner from maliciously demoting themselves if they somehow bypass UI
    id != auth.uid() OR (id = auth.uid() AND role = 'owner')
);


-- ==============================================================================
-- 3. Settings Policies
-- ==============================================================================

-- A. Authenticated Read: All authenticated (active) users need to read settings for UI context.
CREATE POLICY settings_select_authenticated ON public.settings
FOR SELECT
TO authenticated
USING (
    public.is_active_user()
);

-- B. Owner Update: Only owners can mutate the global settings.
CREATE POLICY settings_update_owner ON public.settings
FOR UPDATE
TO authenticated
USING (
    public.is_active_user() 
    AND public.is_owner()
)
WITH CHECK (
    public.is_owner()
);

-- Note: INSERT and DELETE policies are intentionally omitted for settings.
