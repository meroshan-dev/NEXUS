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
    const { data, error } = await supabase.from('profiles').select('*').limit(1);
    console.log('Profiles table query response:');
    console.log('Data:', data);
    console.log('Error:', error);
  } catch (err) {
    console.error('Inspector error:', err);
  }
}

inspect();
