import { supabase } from '../lib/supabase';
import { RepoResult } from './shared/repoResult';
import { handleDbError } from './shared/supabaseError';
import { User, Session } from '@supabase/supabase-js';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'owner' | 'viewer';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const authRepository = {
  signIn: async (email: string, password: string): Promise<RepoResult<void>> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) return handleDbError(error);
      return { success: true };
    } catch (e) {
      return handleDbError(e);
    }
  },

  signOut: async (): Promise<RepoResult<void>> => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) return handleDbError(error);
      return { success: true };
    } catch (e) {
      return handleDbError(e);
    }
  },

  getSession: async (): Promise<RepoResult<Session | null>> => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) return handleDbError(error);
      return { success: true, data: data.session };
    } catch (e) {
      return handleDbError(e);
    }
  },

  getCurrentUser: async (): Promise<RepoResult<User | null>> => {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) return handleDbError(error);
      return { success: true, data: data.user };
    } catch (e) {
      return handleDbError(e);
    }
  },

  onAuthStateChange: (callback: (event: string, session: Session | null) => void) => {
    return supabase.auth.onAuthStateChange(callback);
  },

  getCurrentProfile: async (): Promise<RepoResult<Profile>> => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) return handleDbError(userError);
      if (!userData?.user?.id) return { success: false, error: { code: 'AUTH_ERROR', message: 'No authenticated user found' } };

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userData.user.id)
        .maybeSingle();

      if (error) {
        return handleDbError(error);
      }
      if (!data) {
        return { success: false, error: { code: 'AUTH_ERROR', message: 'Profile not found' } };
      }

      return { success: true, data: data as Profile };
    } catch (e) {
      return handleDbError(e);
    }
  },

  getProfileByUserId: async (id: string): Promise<RepoResult<Profile>> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) return handleDbError(error);
      if (!data) return { success: false, error: { code: 'AUTH_ERROR', message: 'Profile not found' } };

      return { success: true, data: data as Profile };
    } catch (e) {
      return handleDbError(e);
    }
  },

  updateProfile: async (id: string, updates: Partial<Profile>): Promise<RepoResult<Profile>> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) return handleDbError(error);
      return { success: true, data: data as Profile };
    } catch (e) {
      return handleDbError(e);
    }
  }
};
