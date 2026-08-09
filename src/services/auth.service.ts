import { authRepository, Profile } from '../repositories/auth.repository';

export const authService = {
  signIn: async (email: string, password: string) => {
    const res = await authRepository.signIn(email, password);
    if (!res.success) {
      const msg = res.error?.message?.toLowerCase() || '';
      
      if (msg.includes('invalid login credentials') || msg.includes('invalid email') || msg.includes('wrong password') || msg.includes('user not found')) {
        throw new Error('Incorrect email or password.');
      }
      
      if (msg.includes('email not confirmed')) {
        throw new Error('Your account is not active.');
      }

      if (msg.includes('rate limit') || msg.includes('too many requests')) {
        throw new Error('Too many login attempts. Please wait a few minutes before trying again.');
      }
      
      if (msg.includes('fetch') || msg.includes('network') || msg.includes('timeout')) {
        throw new Error('Unable to connect. Please try again.');
      }
      
      throw new Error(res.error?.message || 'Failed to sign in');
    }
  },

  signOut: async () => {
    const res = await authRepository.signOut();
    if (!res.success) throw new Error(res.error?.message || 'Failed to sign out');
  },

  getCurrentProfile: async (): Promise<Profile | null> => {
    const res = await authRepository.getCurrentProfile();
    if (!res.success) return null;
    return res.data || null;
  },
  
  getSession: async () => {
    const res = await authRepository.getSession();
    if (!res.success) return null;
    return res.data || null;
  },
  
  // Keep generic session type to decouple Supabase's specific session schema from general auth handling.
  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    return authRepository.onAuthStateChange(callback);
  }
};
