import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGINS') || 'https://tm-case-booking.vercel.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  fromEmail?: string;
  fromName?: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const emailData: EmailRequest = await req.json();
    
    // Microsoft Graph API endpoint for sending mail
    const graphUrl = 'https://graph.microsoft.com/v1.0/users/SpineCaseBooking@transmedicgroup.com/sendMail';
    
    // Get access token using client credentials flow
    const tenantId = Deno.env.get('MICROSOFT_TENANT_ID') || 'd213fe2b-9fcd-42cf-90a4-8ea84de3103e';
    const tokenResponse = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: Deno.env.get('MICROSOFT_CLIENT_ID') || '',
        client_secret: Deno.env.get('MICROSOFT_CLIENT_SECRET') || '',
        scope: 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials',
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to get access token');
    }

    const { access_token } = await tokenResponse.json();

    // Prepare email message
    const message = {
      message: {
        subject: emailData.subject,
        body: {
          contentType: 'HTML',
          content: emailData.body,
        },
        toRecipients: emailData.to.map(email => ({
          emailAddress: { address: email }
        })),
        ccRecipients: emailData.cc?.map(email => ({
          emailAddress: { address: email }
        })) || [],
        bccRecipients: emailData.bcc?.map(email => ({
          emailAddress: { address: email }
        })) || [],
        from: {
          emailAddress: {
            address: 'SpineCaseBooking@transmedicgroup.com',
            name: emailData.fromName || 'TM Case Booking System'
          }
        }
      },
      saveToSentItems: true
    };

    // Send email via Microsoft Graph API
    const sendResponse = await fetch(graphUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!sendResponse.ok) {
      const error = await sendResponse.text();
      throw new Error(`Failed to send email: ${error}`);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Email sent successfully' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error sending email:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});