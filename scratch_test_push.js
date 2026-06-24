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

async function testPush() {
  const targetUserId = "a6c63fc4-0562-4f67-b004-fe64979de3b3"; // roshan
  console.log(`Attempting to invoke send-push-notification Edge Function for userId: ${targetUserId}...`);
  
  try {
    const { data, error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        userId: targetUserId,
        title: "Test Notification",
        body: "If you see this, the FCM HTTP v1 flow is working perfectly!"
      }
    });

    console.log('Edge Function Response:');
    console.log('Data:', data);
    console.log('Error:', error);
  } catch (err) {
    console.error('Invoke error:', err);
  }
}

testPush();
