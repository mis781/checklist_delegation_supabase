import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Drop-in replacement for the old "send-whatsapp" function invoked by
// src/services/whatsappService.js whenever a checklist/delegation/EA task is
// assigned. Same request contract (phoneNumber, templateName, parameters,
// languageCode) — the only difference is it now ALSO persists the outbound
// send into whatsapp_messages/whatsapp_conversations (via fn_get_or_create_conversation
// + fn_send_whatsapp_message) so task-assignment notifications show up as
// real conversation history in the WhatsApp inbox, and Meta's delivery/
// read status webhooks (which key off the wamid) attach to the right row.
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const whatsappAccessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN')
  const whatsappPhoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  if (!whatsappAccessToken || !whatsappPhoneNumberId) {
    return new Response(
      JSON.stringify({ error: 'Missing WhatsApp configuration secrets on server.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  try {
    const { phoneNumber, templateName, parameters = [], languageCode = 'en', headerMediaUrl = null, headerFileName = null } = await req.json()

    // Meta error 132018: template text params must not contain newlines, tabs,
    // or more than 4 consecutive spaces. Sanitize every param value here so
    // callers (client service OR cron functions) don't have to remember to do it.
    const sanitizeParam = (v: string): string =>
      String(v)
        .replace(/[\r\n\t]+/g, ' ')   // strip newlines and tabs
        .replace(/ {5,}/g, '    ')      // collapse 5+ spaces to 4
        .trim()

    if (!phoneNumber || !templateName) {
      return new Response(JSON.stringify({ error: 'phoneNumber and templateName are required.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Media-header templates (IMAGE/VIDEO/DOCUMENT) need a header component or Meta rejects the send.
    const components: any[] = []
    const { data: tplMeta } = await supabase
      .from('whatsapp_templates')
      .select('header_type, header_sample_url')
      .eq('element_name', templateName)
      .is('deleted_at', null)
      .maybeSingle()
    const hType = (tplMeta?.header_type || '').toUpperCase()
    if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(hType)) {
      const mediaLink = headerMediaUrl || tplMeta?.header_sample_url
      if (!mediaLink) {
        return new Response(
          JSON.stringify({ error: `Template "${templateName}" needs a ${hType.toLowerCase()} headerMediaUrl.` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
      const key = hType.toLowerCase()
      const media: any = { link: mediaLink }
      if (hType === 'DOCUMENT') media.filename = headerFileName || 'document.pdf'
      components.push({ type: 'header', parameters: [{ type: key, [key]: media }] })
    }
    if (parameters.length) {
      components.push({ type: 'body', parameters: parameters.map((v: string) => ({ type: 'text', text: sanitizeParam(v) })) })
    }

    const graphPayload = {
      messaging_product: 'whatsapp',
      to: phoneNumber,
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        components,
      },
    }

    const graphResponse = await fetch(
      `https://graph.facebook.com/v21.0/${whatsappPhoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${whatsappAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(graphPayload),
      },
    )

    const graphData = await graphResponse.json()

    if (!graphResponse.ok) {
      await supabase.from('whatsapp_error_logs').insert({
        error_source: 'EDGE_FUNCTION',
        error_code: String(graphData?.error?.code ?? graphResponse.status),
        error_message: graphData?.error?.message ?? 'Meta Graph API rejected the request.',
        payload_dump: { graphPayload, graphData },
      })
      return new Response(JSON.stringify({ error: graphData?.error?.message ?? 'Failed to send message.' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const wamid = graphData?.messages?.[0]?.id

    // Best-effort persistence — a Meta send that succeeded should never be
    // reported as failed to the caller just because our own bookkeeping hiccups.
    if (wamid) {
      try {
        const { data: conversationId, error: convError } = await supabase.rpc(
          'fn_get_or_create_conversation',
          { p_raw_phone: phoneNumber, p_display_name: null },
        )
        if (convError) throw convError

        const { data: tpl } = await supabase
          .from('whatsapp_templates')
          .select('id, body_text')
          .eq('element_name', templateName)
          .is('deleted_at', null)
          .maybeSingle()

        const renderedBody = tpl?.body_text
          ? parameters.reduce(
              (acc: string, val: string, idx: number) => acc.split(`{{${idx + 1}}}`).join(String(val ?? `{{${idx + 1}}}`)),
              tpl.body_text,
            )
          : `[${templateName}] ${parameters.join(' | ')}`

        const { error: rpcError } = await supabase.rpc('fn_send_whatsapp_message', {
          p_wamid: wamid,
          p_conversation_id: conversationId,
          p_message_type: 'template',
          p_body: renderedBody,
          p_template_id: tpl?.id ?? null,
          p_media_url: null,
          p_mime_type: null,
          p_metadata: { source: 'task_assignment', template_name: templateName },
        })
        if (rpcError) throw rpcError
      } catch (persistErr: any) {
        console.error('⚠️ whatsapp-template-dispatch persistence failed:', persistErr.message)
        await supabase.from('whatsapp_error_logs').insert({
          error_source: 'EDGE_FUNCTION',
          error_code: 'PERSIST_TASK_TEMPLATE_FAILED',
          error_message: persistErr.message,
          payload_dump: { phoneNumber, templateName, wamid },
        })
      }
    }

    return new Response(JSON.stringify({ success: true, wamid, response: graphData }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('❌ whatsapp-template-dispatch error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
