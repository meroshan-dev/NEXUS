import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as jose from 'https://deno.land/x/jose@v4.14.4/index.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { userId, title, body } = await req.json();

    const { data: profile, error } = await supabaseClient
      .from('profiles')
      .select('push_token')
      .eq('id', userId)
      .single();

    if (error || !profile?.push_token) {
      return new Response(JSON.stringify({ error: 'No token found or query failed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    let serviceAccountJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
    const base64Secret = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_BASE64');

    if (base64Secret) {
      try {
        console.log('FCM v1: Found FIREBASE_SERVICE_ACCOUNT_BASE64 secret, decoding...');
        // Standard Deno/Web atob decodes base64 strings
        serviceAccountJson = atob(base64Secret.trim());
      } catch (decodeErr) {
        console.error('Failed to decode FIREBASE_SERVICE_ACCOUNT_BASE64:', decodeErr);
      }
    }

    // Temporary debug logs
    console.log('Raw secret first 100 chars:', serviceAccountJson?.substring(0, 100));
    console.log('Raw secret length:', serviceAccountJson?.length);

    if (!serviceAccountJson) {
      console.log(`FCM send simulated (v1): Title: "${title}", Body: "${body}". (Please set FIREBASE_SERVICE_ACCOUNT_BASE64 or FIREBASE_SERVICE_ACCOUNT in Supabase to send actual push notifications)`);
      return new Response(JSON.stringify({ success: true, message: 'Simulated send successfully' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    const serviceAccount = JSON.parse(serviceAccountJson);
    const privateKeyPEM = serviceAccount.private_key;
    const clientEmail = serviceAccount.client_email;
    const projectId = serviceAccount.project_id;

    if (!privateKeyPEM || !clientEmail || !projectId) {
      return new Response(JSON.stringify({ error: 'Invalid service account details inside FIREBASE_SERVICE_ACCOUNT' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    // Import the private key for signing RS256 JWT
    const privateKey = await jose.importPKCS8(privateKeyPEM, 'RS256');

    // Sign the JWT for Google API Authorization
    const jwt = await new jose.SignJWT({
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
    })
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuer(clientEmail)
      .setAudience('https://oauth2.googleapis.com/token')
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(privateKey);

    // Exchange the signed JWT for a Google Access Token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    if (!tokenRes.ok) {
      const tokenErr = await tokenRes.text();
      throw new Error(`Google token exchange failed: ${tokenErr}`);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // Send HTTP v1 Push Notification request to FCM endpoint
    const fcmRes = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          token: profile.push_token,
          notification: { title, body },
        },
      }),
    });

    const fcmResult = await fcmRes.text();
    console.log('FCM v1 Response:', fcmResult);

    if (!fcmRes.ok) {
      throw new Error(`FCM v1 call failed: ${fcmResult}`);
    }

    return new Response(JSON.stringify({ success: true, message: 'Push sent successfully via FCM v1' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });
  } catch (err) {
    console.error('send-push-notification error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });
  }
})
