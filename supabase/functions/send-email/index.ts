import "jsr:@supabase/functions-js/edge-runtime.d.ts";

interface EmailPayload {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  fromEmail: string;
  fromName: string;
  accessToken: string;
  provider: 'microsoft' | 'google';
}

interface MicrosoftEmailRequest {
  message: {
    subject: string;
    body: {
      contentType: 'HTML';
      content: string;
    };
    toRecipients: Array<{ emailAddress: { address: string } }>;
    ccRecipients?: Array<{ emailAddress: { address: string } }>;
    bccRecipients?: Array<{ emailAddress: { address: string } }>;
    from?: { emailAddress: { address: string; name?: string } };
  };
  saveToSentItems: boolean;
}

Deno.serve(async (req: Request) => {
  // CORS handling
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    // Parse the request payload
    const payload: EmailPayload = await req.json();
    console.log('📧 SEND EMAIL - Received payload:', {
      provider: payload.provider,
      to: payload.to?.length || 0,
      cc: payload.cc?.length || 0,
      bcc: payload.bcc?.length || 0,
      subject: payload.subject?.substring(0, 50) + '...',
      fromEmail: payload.fromEmail,
      hasAccessToken: !!payload.accessToken
    });

    // Validate required fields
    if (!payload.to || payload.to.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Recipients (to) are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!payload.subject || !payload.body) {
      return new Response(
        JSON.stringify({ error: 'Subject and body are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!payload.accessToken) {
      return new Response(
        JSON.stringify({ error: 'Access token is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let emailSent = false;

    if (payload.provider === 'microsoft') {
      // Microsoft Graph API implementation
      const emailRequest: MicrosoftEmailRequest = {
        message: {
          subject: payload.subject,
          body: {
            contentType: 'HTML',
            content: payload.body
          },
          toRecipients: payload.to.map(email => ({ 
            emailAddress: { address: email.trim() } 
          })),
          ...(payload.cc && payload.cc.length > 0 && {
            ccRecipients: payload.cc.map(email => ({ 
              emailAddress: { address: email.trim() } 
            }))
          }),
          ...(payload.bcc && payload.bcc.length > 0 && {
            bccRecipients: payload.bcc.map(email => ({ 
              emailAddress: { address: email.trim() } 
            }))
          }),
          ...(payload.fromEmail && {
            from: { 
              emailAddress: { 
                address: payload.fromEmail,
                ...(payload.fromName && { name: payload.fromName })
              } 
            }
          })
        },
        saveToSentItems: true
      };

      console.log('📧 MICROSOFT - Sending email via Graph API:', {
        toCount: emailRequest.message.toRecipients.length,
        ccCount: emailRequest.message.ccRecipients?.length || 0,
        bccCount: emailRequest.message.bccRecipients?.length || 0,
        from: emailRequest.message.from?.emailAddress.address
      });

      const response = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${payload.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(emailRequest)
      });

      if (response.ok) {
        emailSent = true;
        console.log('✅ MICROSOFT - Email sent successfully');
      } else {
        const errorText = await response.text();
        console.error('❌ MICROSOFT - Email send failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        
        return new Response(
          JSON.stringify({ 
            error: `Microsoft Graph API error: ${response.status} - ${errorText}` 
          }),
          { status: response.status, headers: { 'Content-Type': 'application/json' } }
        );
      }

    } else if (payload.provider === 'google') {
      // Gmail API implementation
      const emailMessage = [
        `To: ${payload.to.join(', ')}`,
        ...(payload.cc && payload.cc.length > 0 ? [`Cc: ${payload.cc.join(', ')}`] : []),
        ...(payload.bcc && payload.bcc.length > 0 ? [`Bcc: ${payload.bcc.join(', ')}`] : []),
        `Subject: ${payload.subject}`,
        'Content-Type: text/html; charset=utf-8',
        '',
        payload.body
      ].join('\r\n');

      const encodedMessage = btoa(emailMessage).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

      console.log('📧 GMAIL - Sending email via Gmail API:', {
        toCount: payload.to.length,
        ccCount: payload.cc?.length || 0,
        bccCount: payload.bcc?.length || 0,
        encodedLength: encodedMessage.length
      });

      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${payload.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ raw: encodedMessage })
      });

      if (response.ok) {
        emailSent = true;
        console.log('✅ GMAIL - Email sent successfully');
      } else {
        const errorText = await response.text();
        console.error('❌ GMAIL - Email send failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        
        return new Response(
          JSON.stringify({ 
            error: `Gmail API error: ${response.status} - ${errorText}` 
          }),
          { status: response.status, headers: { 'Content-Type': 'application/json' } }
        );
      }

    } else {
      return new Response(
        JSON.stringify({ error: `Unsupported email provider: ${payload.provider}` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (emailSent) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Email sent successfully',
          provider: payload.provider,
          timestamp: new Date().toISOString()
        }),
        { 
          status: 200, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          } 
        }
      );
    } else {
      return new Response(
        JSON.stringify({ error: 'Failed to send email' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('❌ SEND EMAIL - Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    );
  }
});