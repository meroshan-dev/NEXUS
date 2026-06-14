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
    console.log('Connected successfully. Re-creating notifications table...');

    // Drop existing table if it exists
    await client.query(`DROP TABLE IF EXISTS public.notifications CASCADE;`);
    console.log('Dropped old notifications table.');

    // Create notifications table matching requested schema
    await client.query(`
      CREATE TABLE public.notifications (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
        type text, -- 'chat_message' | 'task_assigned'
        title text,
        body text,
        read boolean DEFAULT false,
        created_at timestamp DEFAULT now()
      );
    `);
    console.log('Created notifications table.');

    // Enable Row Level Security (RLS)
    await client.query(`ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;`);
    console.log('Enabled RLS on notifications.');

    // Setup RLS Policies
    await client.query(`
      DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
      CREATE POLICY "notifications_select" ON public.notifications 
          FOR SELECT TO authenticated USING (user_id = auth.uid());

      DROP POLICY IF EXISTS "notifications_update" ON public.notifications;
      CREATE POLICY "notifications_update" ON public.notifications 
          FOR UPDATE TO authenticated USING (user_id = auth.uid());

      DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;
      CREATE POLICY "notifications_insert" ON public.notifications 
          FOR INSERT TO authenticated WITH CHECK (true);

      DROP POLICY IF EXISTS "notifications_delete" ON public.notifications;
      CREATE POLICY "notifications_delete" ON public.notifications 
          FOR DELETE TO authenticated USING (user_id = auth.uid());
    `);
    console.log('Configured RLS policies.');

    // Add to Realtime publication
    await client.query(`
      DO $$
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM pg_publication_tables 
              WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
          ) THEN
              ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
          END IF;
      EXCEPTION
          WHEN OTHERS THEN
              RAISE NOTICE 'Could not add table to publication: %', SQLERRM;
      END $$;
    `);
    console.log('Added notifications table to realtime publication.');

    // Reload Postgrest schema cache
    await client.query(`NOTIFY pgrst, 'reload schema';`);
    console.log('Reloaded Postgrest schema cache.');

    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    await client.end();
  }
});
