const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://vuxhngpdvsabsvoogpum.supabase.co';
const supabaseKey = 'sb_publishable_JATuxnCr1TBhL0g3hdKtBA_uuzJB0xF';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const tables = ['profiles', 'attendance', 'leave_requests', 'documents', 'notifications'];
  let allOk = true;
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
       console.error(`Error on table ${table}:`, error.message);
       allOk = false;
    } else {
       console.log(`✅ Table ${table} is OK (Accessible & exists!)`);
    }
  }
  process.exit(allOk ? 0 : 1);
}
check();
