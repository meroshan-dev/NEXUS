import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envPath = './.env.local';
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length === 2) {
    env[parts[0].trim()] = parts[1].trim();
  }
});

const supabaseUrl = env['VITE_SUPABASE_URL'];
const supabaseAnonKey = env['VITE_SUPABASE_ANON_KEY'];

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspect() {
  try {
    const { data, error } = await supabase.from('profiles').select('id, name, email, push_token').limit(20);
    console.log('Profiles push tokens:');
    console.log(JSON.stringify(data, null, 2));
    if (error) console.error('Query error:', error);
  } catch (err) {
    console.error('Inspector error:', err);
  }
}

inspect();
