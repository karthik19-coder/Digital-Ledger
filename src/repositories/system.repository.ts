import { supabase } from '../lib/supabase';
import { RepoResult } from './shared/repoResult';
import { handleDbError } from './shared/supabaseError';

export const systemRepository = {
  checkConnection: async (): Promise<RepoResult<void>> => {
    try {
      const { error } = await supabase.auth.getSession();
      if (error) return handleDbError(error);
      return { success: true, data: undefined };
    } catch (e) {
      return handleDbError(e);
    }
  }
};
