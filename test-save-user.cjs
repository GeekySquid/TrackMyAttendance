require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testSaveUser() {
  const clerkId = 'test-clerk-123';
  
  console.log('Testing getUserById...');
  const { data: existing, error: getErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', clerkId)
    .maybeSingle();
    
  console.log('getUserById Result:', { existing, getErr });

  console.log('Testing RPC save_user_v2...');
  const params = {
    p_id: clerkId,
    p_name: 'Test User',
    p_email: 'test@example.com',
    p_photo_url: '',
    p_role: 'student',
    p_roll_no: null,
    p_course: null,
    p_phone: null,
    p_gender: null,
    p_blood_group: null,
    p_onboarded: false,
    p_mentor_id: null
  };
  
  const { error: rpcErr } = await supabase.rpc('save_user_v2', params);
  console.log('RPC Result:', { rpcErr });
  
  if (rpcErr) {
    console.log('Testing direct upsert fallback...');
    const row = {
      id: clerkId,
      name: 'Test User',
      email: 'test@example.com',
      updated_at: new Date().toISOString()
    };
    const { error: upsertErr } = await supabase.from('profiles').upsert(row);
    console.log('Upsert Result:', { upsertErr });
  }
}

testSaveUser().catch(console.error);
