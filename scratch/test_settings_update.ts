import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient('https://rrzbukesrvjfcpwluyob.supabase.co', 'sb_publishable_tMAZn-fxEMgZymdV-G2QKQ_6yUXyd4D');

async function testUpdate() {
  const updates = {
    institution_name: 'Test Academy ' + Date.now(),
    academic_year: '2024 - 2025'
  };

  const { id, created_at, ...payload } = updates as any;

  const { data, error } = await supabase
    .from('system_configuration')
    .upsert({
      id: '00000000-0000-0000-0000-000000000001',
      ...payload,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Success:', data);
  }
}

testUpdate();
