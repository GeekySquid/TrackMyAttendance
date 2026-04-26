
import { createClient } from '@supabase/supabase-base';
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkColumns() {
  const { data, error } = await supabase.from('geofence_schedules').select('*').limit(1);
  if (error) console.error(error);
  else console.log(Object.keys(data[0]));
}
checkColumns();
