import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRows() {
  const { data, error } = await supabase
    .from('sales')
    .select('*');

  if (error) {
    console.error('Error fetching sales:', error);
    return;
  }

  console.log(`Total rows: ${data.length}`);

  let violatingRows = 0;
  data.forEach((row: any) => {
    const total = parseFloat(row.total_amount) || 0;
    const cash = parseFloat(row.cash_amount) || 0;
    const upi = parseFloat(row.upi_amount) || 0;
    const credit = parseFloat(row.credit_amount) || 0;

    // Check if total matches sum (with small epsilon for float precision issues, though NUMERIC(12,2) should be exact)
    const sum = cash + upi + credit;
    if (Math.abs(total - sum) > 0.01) {
      console.log('Violating row:', row);
      violatingRows++;
    }
  });

  console.log(`Violating rows: ${violatingRows}`);
}

checkRows();
