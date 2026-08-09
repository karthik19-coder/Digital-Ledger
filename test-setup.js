import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("1. Calling createSettings simulator...");
  const dbPayload = {
    store_name: 'Test Store',
    owner_name: 'Owner',
    currency: 'USD',
    opening_balance_cash: 100,
    opening_balance_upi: 0,
    opening_inventory_value: 0,
    opening_customer_due: 0,
    opening_vendor_due: 0,
    average_profit_margin: 15,
    business_start_date: new Date().toISOString().split('T')[0]
  };

  const insertRes = await supabase.from('settings').insert([dbPayload]).select().single();
  console.log("Insert result:", insertRes);
  
  const countRes = await supabase.from('settings').select('*', { count: 'exact' });
  console.log("Settings count:", countRes.count);
}

run().catch(console.error);
