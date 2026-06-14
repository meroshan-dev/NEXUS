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

  // Supabase PostgreSQL Connection configuration
  // Using direct connection port 5432 or pooler port 6543
  const connectionString = `postgresql://postgres:${encodeURIComponent(password)}@${host}:5432/postgres`;
  
  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log(`Connecting to database ${host}...`);
    await client.connect();
    console.log('Connected successfully. Running migrations...');

    // 1. Add missing columns to profiles table
    console.log('Adding location and bio columns to profiles table...');
    await client.query(`
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location TEXT;
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;
    `);

    // 2. Ensure RLS is enabled and set correct policies
    console.log('Setting RLS policies for profiles table...');
    await client.query(`
      ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
      CREATE POLICY "Public profiles are viewable by everyone"
          ON public.profiles FOR SELECT
          USING (true);

      DROP POLICY IF EXISTS "Users can manage their own profiles" ON public.profiles;
      CREATE POLICY "Users can manage their own profiles"
          ON public.profiles FOR ALL
          USING (auth.uid() = id)
          WITH CHECK (auth.uid() = id);
    `);

    // 3. Reload Postgrest schema cache
    console.log('Reloading Postgrest schema cache...');
    await client.query(`NOTIFY pgrst, 'reload schema';`);

    console.log('Migration completed successfully! All columns added, RLS set, and schema cache refreshed.');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    await client.end();
  }
});
