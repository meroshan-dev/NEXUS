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

const supabase = createClient(env['VITE_SUPABASE_URL'], env['VITE_SUPABASE_ANON_KEY']);

async function testRPC() {
  const queries = [
    { name: 'exec_sql', params: { sql: 'SELECT version();' } },
    { name: 'execute_sql', params: { query: 'SELECT version();' } },
    { name: 'run_sql', params: { sql: 'SELECT version();' } },
    { name: 'exec_query', params: { sql: 'SELECT version();' } }
  ];

  for (const q of queries) {
    console.log(`Trying RPC: ${q.name}...`);
    const { data, error } = await supabase.rpc(q.name, q.params);
    if (error) {
      console.log(`RPC ${q.name} failed:`, error.message);
    } else {
      console.log(`RPC ${q.name} succeeded! Data:`, data);
      return;
    }
  }
}

testRPC();
