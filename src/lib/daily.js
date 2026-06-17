/**
 * Daily.co room creation helper.
 *
 * Strategy (tried in order):
 *  1. Supabase Edge Function `create-daily-room`  ← API key stays on the server (safest)
 *  2. Direct Daily REST API call with VITE_DAILY_API_KEY   ← fallback for local dev
 *
 * Setup:
 *  Option A (recommended — production):
 *    npx supabase secrets set DAILY_API_KEY=<your_key>
 *    npx supabase functions deploy create-daily-room
 *
 *  Option B (local dev only):
 *    Add VITE_DAILY_API_KEY=<your_key> to .env.local and restart.
 *    The key will be in the client bundle — OK for local dev, not for production.
 */

import { supabase } from './supabase';

const DAILY_API_KEY  = import.meta.env.VITE_DAILY_API_KEY?.trim();
const DAILY_API_BASE = 'https://api.daily.co/v1';

// Log at module load so you can verify the key is being read
console.log('[Daily] Module loaded | API key present:', !!DAILY_API_KEY,
  DAILY_API_KEY ? `| first 8 chars: ${DAILY_API_KEY.slice(0, 8)}...` : '');

/**
 * Create (or reuse) a Daily room for a workspace huddle.
 * Returns { roomUrl: string, roomName: string }
 * Throws with a descriptive message if all strategies fail.
 */
export async function createDailyRoom(workspaceId) {
  console.log('[Daily] createDailyRoom called for workspace:', workspaceId);

  // ── Strategy 1: Supabase Edge Function ──────────────────────────
  try {
    console.log('[Daily] Trying edge function create-daily-room…');
    const { data, error } = await supabase.functions.invoke('create-daily-room', {
      body: { workspaceId },
    });

    if (error) {
      console.warn('[Daily] Edge function error (will try fallback):', error.message || error);
    } else if (data?.roomUrl) {
      console.log('[Daily] ✓ Room via edge function:', data.roomUrl);
      return { roomUrl: data.roomUrl, roomName: data.roomName };
    } else {
      console.warn('[Daily] Edge function returned no roomUrl:', data);
    }
  } catch (edgeErr) {
    console.warn('[Daily] Edge function unreachable (will try fallback):', edgeErr.message);
  }

  // ── Strategy 2: Direct browser API call ─────────────────────────
  if (!DAILY_API_KEY) {
    throw new Error(
      'Daily room creation failed.\n\n' +
      'Option A — Deploy the edge function (recommended):\n' +
      '  npx supabase secrets set DAILY_API_KEY=your_key\n' +
      '  npx supabase functions deploy create-daily-room\n\n' +
      'Option B — Local dev fallback:\n' +
      '  Add VITE_DAILY_API_KEY=your_key to .env.local and restart npm run dev'
    );
  }

  const roomName = `nexus-${workspaceId.replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 34)}`;
  console.log('[Daily] Direct API fallback | room name:', roomName);

  let response;
  try {
    response = await fetch(`${DAILY_API_BASE}/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DAILY_API_KEY}`,
      },
      body: JSON.stringify({
        name: roomName,
        privacy: 'public',
        properties: {
          enable_screenshare: true,
          enable_chat:        false,
          start_video_off:    false,
          start_audio_off:    false,
          exp: Math.floor(Date.now() / 1000) + 60 * 60 * 6,
          max_participants:   20,
        },
      }),
    });
  } catch (networkErr) {
    console.error('[Daily] Network error on direct API call:', networkErr);
    throw new Error(`Network error reaching Daily API: ${networkErr.message}`);
  }

  console.log('[Daily] Direct API response status:', response.status);

  if (response.ok) {
    const data = await response.json();
    console.log('[Daily] ✓ Room created via direct API:', data.url);
    return { roomUrl: data.url, roomName: data.name };
  }

  // Read response body text once
  const errBody = await response.text().catch(() => '(unreadable)');

  // 409 or 400 with "already exists" = room already exists → GET it
  if (response.status === 409 || (response.status === 400 && errBody.includes('already exists'))) {
    console.log('[Daily] Room already exists, fetching:', roomName);
    return await fetchExistingRoom(roomName);
  }

  // Any other HTTP error — log the body for diagnosis
  console.error('[Daily] ✗ Daily API error:', response.status, response.statusText, '\nBody:', errBody);

  throw new Error(
    `Daily API returned HTTP ${response.status}: ${errBody}\n` +
    'Check that your API key is valid at https://dashboard.daily.co/developers'
  );
}

/**
 * Fetch an existing room by name.
 */
async function fetchExistingRoom(roomName) {
  const res = await fetch(`${DAILY_API_BASE}/rooms/${roomName}`, {
    headers: { Authorization: `Bearer ${DAILY_API_KEY}` },
  });
  if (res.ok) {
    const data = await res.json();
    console.log('[Daily] ✓ Fetched existing room:', data.url);
    return { roomUrl: data.url, roomName: data.name };
  }
  const body = await res.text().catch(() => '');
  throw new Error(`Failed to fetch existing room "${roomName}": HTTP ${res.status} ${body}`);
}
