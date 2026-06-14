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

const url = `${env['VITE_SUPABASE_URL']}/rest/v1/?apikey=${env['VITE_SUPABASE_ANON_KEY']}`;

async function run() {
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log('Tables exposed in API:');
    console.log(Object.keys(data.paths || {}));
    console.log('\nDefinitions:');
    console.log(Object.keys(data.definitions || {}));
  } catch (err) {
    console.error('Error fetching OpenAPI schema:', err);
  }
}

run();
