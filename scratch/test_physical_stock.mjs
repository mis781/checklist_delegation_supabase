import { createClient } from '@supabase/supabase-js';

const supabaseURL = "https://ztlhroslxqnzxdkedbcn.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0bGhyb3NseHFuenhka2VkYmNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1OTQyNzEsImV4cCI6MjA5NzE3MDI3MX0.85wuE_mCouGmakA9t3HG-x8Mzk8lJOyKN1PNKmXM9RQ";

const supabase = createClient(supabaseURL, supabaseKey);

async function test() {
  console.log('Testing Supabase inventory_physical_stock table...');

  const { data, error } = await supabase
    .from('inventory_physical_stock')
    .select('*')
    .limit(5);

  if (error) {
    console.error('Error selecting from inventory_physical_stock:', error.message);
    if (error.message.includes('relation "public.inventory_physical_stock" does not exist')) {
      console.log('Notice: SQL script database/inventory_physical_stock_schema.sql needs to be executed in Supabase SQL editor.');
    }
  } else {
    console.log('Successfully queried inventory_physical_stock. Row count:', data.length);
    console.log('Data:', data);
  }
}

test();
