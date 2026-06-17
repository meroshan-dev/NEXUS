/**
 * Daily.co room creation helper.
 * Uses the Daily REST API directly from the client (requires VITE_DAILY_API_KEY).
 * If no API key is configured, falls back to a predictable room-name pattern
 * using the workspace ID — rooms are auto-created on first join by Daily.
 */

const DAILY_API_KEY = import.meta.env.VITE_DAILY_API_KEY;
const DAILY_API_BASE = 'https://api.daily.co/v1';

/**
 * Create a Daily room for a workspace huddle.
 * Returns an object with { roomUrl, roomName }.
 */
export async function createDailyRoom(workspaceId) {
  const roomName = `nexus-ws-${workspaceId.replace(/-/g, '').slice(0, 20)}`;

  if (DAILY_API_KEY) {
    try {
      const response = await fetch(`${DAILY_API_BASE}/rooms`, {
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
            enable_chat: true,
            start_video_off: false,
            start_audio_off: false,
            exp: Math.floor(Date.now() / 1000) + 60 * 60 * 4, // 4-hour expiry
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return { roomUrl: data.url, roomName: data.name };
      }

      // If room already exists (409), build its URL
      if (response.status === 409) {
        const domain = await getDailyDomain();
        return {
          roomUrl: `https://${domain}.daily.co/${roomName}`,
          roomName,
        };
      }

      console.warn('[Daily] Room creation failed, using predictable URL fallback:', response.status);
    } catch (err) {
      console.warn('[Daily] API error, using predictable URL fallback:', err);
    }
  }

  // No API key: use Daily's instant-meeting rooms feature.
  // NOTE: instant meeting rooms require a Daily account; replace 'nexus-app' below
  // with your own Daily subdomain if you have one, or add VITE_DAILY_API_KEY.
  const domain = import.meta.env.VITE_DAILY_DOMAIN || 'nexus-demo';
  return {
    roomUrl: `https://${domain}.daily.co/${roomName}`,
    roomName,
  };
}

/**
 * Fetch the Daily domain for the configured API key.
 * Returns the domain slug (e.g. "myteam" → myteam.daily.co).
 */
async function getDailyDomain() {
  if (!DAILY_API_KEY) return 'nexus-demo';
  try {
    const res = await fetch(`${DAILY_API_BASE}/domain`, {
      headers: { Authorization: `Bearer ${DAILY_API_KEY}` },
    });
    if (res.ok) {
      const data = await res.json();
      return data.domain_name;
    }
  } catch (_) { /* ignore */ }
  return 'nexus-demo';
}
