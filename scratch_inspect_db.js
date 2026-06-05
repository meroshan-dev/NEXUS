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
    // Inspect workspaces table
    const { data: workspaces, error: wsError } = await supabase.from('workspaces').select('*').limit(1);
    console.log('Workspaces schema check:', { keys: workspaces ? Object.keys(workspaces[0] || {}) : null, error: wsError });

    // Inspect files table
    const { data: files, error: filesError } = await supabase.from('files').select('*').limit(1);
    console.log('Files schema check:', { keys: files ? Object.keys(files[0] || {}) : null, error: filesError });

    // Inspect workspace_members table
    const { data: members, error: membersError } = await supabase.from('workspace_members').select('*').limit(1);
    console.log('Workspace members schema check:', { keys: members ? Object.keys(members[0] || {}) : null, error: membersError });
  } catch (err) {
    console.error('Inspector error:', err);
  }
}

inspect();
