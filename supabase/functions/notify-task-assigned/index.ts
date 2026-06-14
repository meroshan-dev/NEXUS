import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

    const { assignedUserId, taskName, workspaceName } = await req.json()

    // Fetch user email and name
    const { data, error } = await supabaseClient
      .from('profiles')
      .select('email, name')
      .eq('id', assignedUserId)
      .single()

    if (error) throw error;

    const email = data.email;
    const fullName = data.name || 'User';

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (resendApiKey) {
      // Send email via Resend
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendApiKey}`
        },
        body: JSON.stringify({
          from: 'nexus@yourdomain.com',
          to: email,
          subject: `Task assigned: ${taskName}`,
          html: `<p>Hi ${fullName}, a new task "${taskName}" has been assigned to you in ${workspaceName}.</p>`
        })
      });
      const resData = await res.json();
      console.log('Resend send response:', resData);
    } else {
      console.log(`Simulated email to ${email}: Task "${taskName}" assigned in ${workspaceName}. (Please set RESEND_API_KEY in Supabase to send actual emails)`);
    }

    return new Response(JSON.stringify({ success: true, message: 'Notification processed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
