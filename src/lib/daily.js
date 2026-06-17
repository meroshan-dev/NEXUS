/**
 * Daily.co room creation helper.
 *
 * Setup:
 *  1. Go to https://dashboard.daily.co/developers → copy your API key
 *  2. Add to .env.local:  VITE_DAILY_API_KEY=your_key_here
 *
 * Without a key the app will warn in the console and set roomUrl = null.
 * DailyCallScreen will show a clear "not configured" message.
 */

const DAILY_API_KEY  = import.meta.env.VITE_DAILY_API_KEY?.trim();
const DAILY_API_BASE = 'https://api.daily.co/v1';

/**
 * Create (or reuse) a Daily room for a workspace huddle.
 * Returns { roomUrl: string, roomName: string }
 * Throws if creation fails and no valid URL can be produced.
 */
export async function createDailyRoom(workspaceId) {
  if (!DAILY_API_KEY) {
    const msg =
      '[Daily] ✗ VITE_DAILY_API_KEY is not set.\n' +
      '  → Get a free key at https://dashboard.daily.co/developers\n' +
      '  → Add VITE_DAILY_API_KEY=<key> to your .env.local and restart the dev server.';
    console.error(msg);
    throw new Error('Daily API key not configured. See console for setup instructions.');
  }

  // Deterministic room name from workspace ID (safe chars only, max 40)
  const roomName = `nexus-${workspaceId.replace(/[^a-z0-9]/gi, '').slice(0, 34)}`;
  console.log('[Daily] Creating room:', roomName, '(workspace:', workspaceId, ')');

  // --- Try to create a new room ---
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
          enable_screenshare:  true,
          enable_chat:         false,
          start_video_off:     false,
          start_audio_off:     false,
          exp: Math.floor(Date.now() / 1000) + 60 * 60 * 6, // expires in 6 h
          max_participants: 20,
        },
      }),
    });
  } catch (networkErr) {
    console.error('[Daily] Network error calling Daily API:', networkErr);
    throw new Error(`Daily API network error: ${networkErr.message}`);
  }

  // Room created successfully
  if (response.ok) {
    const data = await response.json();
    console.log('[Daily] ✓ Room created:', data.url, '| name:', data.name);
    return { roomUrl: data.url, roomName: data.name };
  }

  // Room already exists (409 Conflict) → fetch it
  if (response.status === 409) {
    console.log('[Daily] Room already exists, fetching:', roomName);
    return await getDailyRoom(roomName);
  }

  // Any other error
  const errBody = await response.text().catch(() => '(no body)');
  console.error('[Daily] ✗ Room creation failed:', response.status, errBody);
  throw new Error(`Daily room creation failed: HTTP ${response.status} — ${errBody}`);
}

/**
 * Fetch an existing Daily room by name.
 * Returns { roomUrl, roomName }.
 */
async function getDailyRoom(roomName) {
  try {
    const res = await fetch(`${DAILY_API_BASE}/rooms/${roomName}`, {
      headers: { Authorization: `Bearer ${DAILY_API_KEY}` },
    });

    if (res.ok) {
      const data = await res.json();
      console.log('[Daily] ✓ Fetched existing room:', data.url);
      return { roomUrl: data.url, roomName: data.name };
    }

    // Room doesn't exist → fall back to URL-only (domain lookup)
    const domain = await getDailyDomain();
    const url = `https://${domain}.daily.co/${roomName}`;
    console.warn('[Daily] Room not found, using constructed URL:', url);
    return { roomUrl: url, roomName };
  } catch (err) {
    const domain = await getDailyDomain().catch(() => 'unknown');
    const url = `https://${domain}.daily.co/${roomName}`;
    console.warn('[Daily] getDailyRoom error, falling back to:', url, err);
    return { roomUrl: url, roomName };
  }
}

/**
 * Fetch the Daily domain for the configured API key.
 */
async function getDailyDomain() {
  try {
    const res = await fetch(`${DAILY_API_BASE}/domain`, {
      headers: { Authorization: `Bearer ${DAILY_API_KEY}` },
    });
    if (res.ok) {
      const data = await res.json();
      console.log('[Daily] Domain:', data.domain_name);
      return data.domain_name;
    }
  } catch (err) {
    console.warn('[Daily] Could not fetch domain:', err);
  }
  return 'your-domain'; // placeholder — will fail gracefully
}
