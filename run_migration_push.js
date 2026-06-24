import pg from 'pg';
import fs from 'fs';
import readline from 'readline';

const envPath = './.env.local';
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length === 2) {
    env[parts[0].trim()] = parts[1].trim();
  }
});

const projectRef = 'mwzugokkumkorslkynum';
const host = `db.${projectRef}.supabase.co`;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Please enter your Supabase database password: ', async (password) => {
  rl.close();
  
  if (!password) {
    console.error('Password cannot be empty.');
    process.exit(1);
  }

  const connectionString = `postgresql://postgres:${encodeURIComponent(password)}@${host}:5432/postgres`;
  
  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log(`Connecting to database ${host}...`);
    await client.connect();
    console.log('Connected successfully. Running migrations...');

    // 1. Add push_token column to profiles table
    console.log('Adding push_token column to profiles table...');
    await client.query(`
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS push_token text;
    `);

    // 2. Reload Postgrest schema cache
    console.log('Reloading Postgrest schema cache...');
    await client.query(`NOTIFY pgrst, 'reload schema';`);

    console.log('Migration completed successfully! push_token column added and schema cache refreshed.');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    await client.end();
  }
});
