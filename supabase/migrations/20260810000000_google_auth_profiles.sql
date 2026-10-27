-- Google OAuth & Self-Service User Registration Migration (Hardened)
-- Migration: 20260810000000_google_auth_profiles.sql
--
-- Security Design:
-- 1. Automatic Provisioning: When a new user authenticates via Google OAuth (or Supabase Auth),
--    a profile row is automatically provisioned in public.profiles.
-- 2. Strict Least Privilege: EVERY self-registered user receives role = 'viewer' and is_active = true.
--    No self-service user is EVER automatically granted 'owner' status.
-- 3. Non-Destructive / Idempotent: Uses ON CONFLICT (id) DO NOTHING so existing profiles (and their roles)
--    are NEVER altered or downgraded during subsequent logins.
-- 4. No Trust of User Metadata: User-controlled OAuth claims/metadata for roles are completely ignored.
-- 5. RPC Security: ensure_user_profile() accepts zero arguments, operates exclusively on auth.uid(),
--    runs with SECURITY DEFINER and a fixed search_path (public, auth, pg_temp), and grants execute
--    only to authenticated users.
--
-- Store Owner Bootstrap Procedure:
-- To designate a trusted user as Store Owner, a database administrator must run:
--   UPDATE public.profiles
--   SET role = 'owner', is_active = true, updated_at = now()
--   WHERE email = 'trusted-owner@example.com';

-- 1. Create or replace the handle_new_user trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_full_name TEXT;
    v_avatar_url TEXT;
BEGIN
    -- Extract display name and avatar from OAuth metadata (safe for UI display only)
    v_full_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        ''
    );
    v_avatar_url := COALESCE(
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'picture',
        NULL
    );

    -- Insert profile safely with least privilege (viewer)
    -- ON CONFLICT (id) DO NOTHING ensures existing records/roles are never overwritten
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        avatar_url,
        role,
        is_active,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        COALESCE(NEW.email, ''),
        v_full_name,
        v_avatar_url,
        'viewer',
        TRUE,
        now(),
        now()
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$;

-- 2. Bind trigger to auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Idempotent RPC function callable by authenticated client
-- Operates strictly on auth.uid() — accepts NO user-supplied parameters
CREATE OR REPLACE FUNCTION public.ensure_user_profile()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_email TEXT;
    v_full_name TEXT;
    v_avatar_url TEXT;
    v_profile RECORD;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Return existing profile if already present (never overwrite)
    SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id;
    IF FOUND THEN
        RETURN to_jsonb(v_profile);
    END IF;

    -- Retrieve auth user record from auth.users
    SELECT 
        u.email,
        COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', ''),
        COALESCE(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture', NULL)
    INTO v_email, v_full_name, v_avatar_url
    FROM auth.users u
    WHERE u.id = v_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User record not found in auth.users';
    END IF;

    -- Insert profile with least privilege (viewer)
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        avatar_url,
        role,
        is_active,
        created_at,
        updated_at
    )
    VALUES (
        v_user_id,
        COALESCE(v_email, ''),
        v_full_name,
        v_avatar_url,
        'viewer',
        TRUE,
        now(),
        now()
    )
    ON CONFLICT (id) DO NOTHING
    RETURNING * INTO v_profile;

    -- If another concurrent request inserted it first, fetch and return it
    IF v_profile.id IS NULL THEN
        SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id;
    END IF;

    RETURN to_jsonb(v_profile);
END;
$$;

-- 4. Permissions for ensure_user_profile
REVOKE ALL ON FUNCTION public.ensure_user_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_user_profile() TO authenticated;
