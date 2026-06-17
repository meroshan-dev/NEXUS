import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const DAILY_API_KEY = Deno.env.get('DAILY_API_KEY')
    if (!DAILY_API_KEY) {
      console.error('[create-daily-room] DAILY_API_KEY secret not set in Supabase')
      return new Response(
        JSON.stringify({ error: 'DAILY_API_KEY secret not configured in Supabase edge function secrets.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    const { workspaceId } = await req.json()
    if (!workspaceId) {
      return new Response(
        JSON.stringify({ error: 'workspaceId is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Build a deterministic, safe room name from workspace ID
    const roomName = `nexus-${workspaceId.replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 34)}`
    console.log('[create-daily-room] Creating room:', roomName, 'for workspace:', workspaceId)

    // Call Daily REST API (server-side — API key is never exposed to the browser)
    const dailyRes = await fetch('https://api.daily.co/v1/rooms', {
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
          enable_chat: false,
          start_video_off: false,
          start_audio_off: false,
          exp: Math.floor(Date.now() / 1000) + 60 * 60 * 6, // 6-hour expiry
          max_participants: 20,
        },
      }),
    })

    // Room created
    if (dailyRes.ok) {
      const data = await dailyRes.json()
      console.log('[create-daily-room] ✓ Room created:', data.url)
      return new Response(
        JSON.stringify({ roomUrl: data.url, roomName: data.name }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const body = await dailyRes.text()

    // Room already exists (409 or 400 with "already exists") — fetch it
    if (dailyRes.status === 409 || (dailyRes.status === 400 && body.includes('already exists'))) {
      console.log('[create-daily-room] Room exists, fetching:', roomName)
      const getRes = await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
        headers: { Authorization: `Bearer ${DAILY_API_KEY}` },
      })
      if (getRes.ok) {
        const data = await getRes.json()
        console.log('[create-daily-room] ✓ Fetched existing room:', data.url)
        return new Response(
          JSON.stringify({ roomUrl: data.url, roomName: data.name }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
      }
    }

    // Any other Daily API error
    console.error('[create-daily-room] ✗ Daily API error:', dailyRes.status, body)
    return new Response(
      JSON.stringify({ error: `Daily API error ${dailyRes.status}: ${body}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 }
    )

  } catch (err) {
    console.error('[create-daily-room] ✗ Unexpected error:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
