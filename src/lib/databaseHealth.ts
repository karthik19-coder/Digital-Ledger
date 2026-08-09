import { systemRepository } from '../repositories/system.repository';

export async function checkSupabaseConnection(): Promise<void> {
  try {
    const { success, error } = await systemRepository.checkConnection();
    
    if (!success) {
      console.error('❌ Supabase Connection Failed');
      console.error(error?.message);
      return;
    }
    
    // Connection successful
  } catch (err: unknown) {
    console.error('❌ Supabase Connection Failed');
    console.error((err instanceof Error ? err.message : String(err)) || err);
  }
}
