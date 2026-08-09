import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://fvsixpcvbawwwrnnwott.supabase.co', 'sb_publishable_jQ5yKH0E53bjTU-fk7tzlw_AGO9fkFL');
async function run() {
  const { data, error } = await supabase.from('settings').select('*').limit(1);
  console.log(data, error);
}
run();
