// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

declare const Deno: any

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: any) => {
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
  const configuredWabaId = Deno.env.get('WHATSAPP_BUSINESS_ACCOUNT_ID') || Deno.env.get('WHATSAPP_WABA_ID')

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  if (!whatsappAccessToken || !whatsappPhoneNumberId) {
    return new Response(
      JSON.stringify({ error: 'Missing WhatsApp configuration secrets on server.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  try {
    const body = await req.json()
    const { action = 'create' } = body

    // 1. Resolve WhatsApp Business Account ID (WABA ID)
    let wabaId = configuredWabaId || body.wabaId
    if (!wabaId) {
      try {
        const phoneRes = await fetch(
          `https://graph.facebook.com/v21.0/${whatsappPhoneNumberId}?fields=whatsapp_business_account`,
          {
            headers: { Authorization: `Bearer ${whatsappAccessToken}` },
          }
        )
        if (phoneRes.ok) {
          const phoneData = await phoneRes.json()
          wabaId = phoneData?.whatsapp_business_account?.id
        }
      } catch (err) {
        console.warn('Failed to resolve WABA ID from phone number ID:', err)
      }
    }

    if (!wabaId) {
      return new Response(
        JSON.stringify({
          error: 'Could not determine WhatsApp Business Account ID (WABA ID). Please set WHATSAPP_BUSINESS_ACCOUNT_ID in Supabase Secrets or pass wabaId in request body.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Resolve Meta App ID for Resumable Upload
    let appId = Deno.env.get('WHATSAPP_APP_ID') || Deno.env.get('META_APP_ID') || body.appId
    if (!appId) {
      try {
        const appRes = await fetch(
          `https://graph.facebook.com/v21.0/app?access_token=${whatsappAccessToken}`
        )
        if (appRes.ok) {
          const appData = await appRes.json()
          if (appData?.id) appId = appData.id
        }
      } catch (err) {
        console.warn('Failed to resolve App ID from /app:', err)
      }
    }
    if (!appId) {
      try {
        const debugRes = await fetch(
          `https://graph.facebook.com/v21.0/debug_token?input_token=${whatsappAccessToken}&access_token=${whatsappAccessToken}`
        )
        if (debugRes.ok) {
          const debugData = await debugRes.json()
          if (debugData?.data?.app_id) appId = debugData.data.app_id
        }
      } catch (err) {
        console.warn('Failed to resolve App ID from debug_token:', err)
      }
    }
    if (!appId) {
      appId = '1331677068445559'
    }

    // --- ACTION: SYNC TEMPLATES FROM META ---
    if (action === 'sync') {
      const metaRes = await fetch(
        `https://graph.facebook.com/v21.0/${wabaId}/message_templates?limit=100`,
        {
          headers: { Authorization: `Bearer ${whatsappAccessToken}` },
        }
      )
      const metaData = await metaRes.json()
      if (!metaRes.ok) {
        return new Response(
          JSON.stringify({ error: metaData?.error?.message || 'Failed to fetch templates from Meta' }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      let updatedCount = 0
      const metaTemplates = metaData.data || []
      const metaApprovedNames = new Set(
        metaTemplates.filter((t: any) => t.status === 'APPROVED').map((t: any) => t.name)
      )

      for (const tpl of metaTemplates) {
        const bodyComp = tpl.components?.find((c: any) => c.type === 'BODY')
        const headerComp = tpl.components?.find((c: any) => c.type === 'HEADER')
        const footerComp = tpl.components?.find((c: any) => c.type === 'FOOTER')

        const headerType = headerComp ? headerComp.format : 'NONE'
        const bodyText = bodyComp ? bodyComp.text : ''
        const footerText = footerComp ? footerComp.text : null

        const { error: updErr } = await supabase
          .from('whatsapp_templates')
          .upsert(
            {
              element_name: tpl.name,
              category: tpl.category || 'MARKETING',
              language: tpl.language || 'en',
              status: tpl.status, // e.g. 'APPROVED', 'PENDING', 'REJECTED'
              header_type: headerType,
              body_text: bodyText,
              footer_text: footerText,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'element_name' }
          )
        if (!updErr) updatedCount++
      }

      // Demote any templates in Supabase marked APPROVED that do NOT exist in Meta's approved list
      const { data: localApproved } = await supabase
        .from('whatsapp_templates')
        .select('id, element_name')
        .eq('status', 'APPROVED')
        .is('deleted_at', null)

      if (localApproved && localApproved.length > 0) {
        for (const loc of localApproved) {
          if (!metaApprovedNames.has(loc.element_name)) {
            await supabase
              .from('whatsapp_templates')
              .update({ status: 'PENDING', updated_at: new Date().toISOString() })
              .eq('id', loc.id)
          }
        }
      }

      return new Response(
        JSON.stringify({ success: true, count: metaTemplates.length, updated: updatedCount }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // --- ACTION: DELETE TEMPLATE ---
    if (action === 'delete') {
      const { templateId, elementName } = body
      if (!elementName) {
        return new Response(
          JSON.stringify({ error: 'elementName is required to delete a template' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Delete from Meta Graph API
      const delRes = await fetch(
        `https://graph.facebook.com/v21.0/${wabaId}/message_templates?name=${encodeURIComponent(elementName)}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${whatsappAccessToken}` },
        }
      )
      const delData = await delRes.json()

      // Soft delete in Supabase
      if (templateId) {
        await supabase
          .from('whatsapp_templates')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', templateId)
      } else {
        await supabase
          .from('whatsapp_templates')
          .update({ deleted_at: new Date().toISOString() })
          .eq('element_name', elementName)
      }

      return new Response(
        JSON.stringify({ success: true, meta: delData }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // --- ACTION: CREATE TEMPLATE ---
    const {
      name,
      elementName,
      category = 'MARKETING',
      language = 'en',
      headerType = 'NONE',
      headerText = null,
      headerSample = null,
      headerMediaUrl = null,
      headerSampleUrl = null,
      status: requestedStatus = null,
      autoApprove = false,
      bodyText,
      variables = [],
      footerText = null,
      buttons = [],
    } = body

    const effectiveHeaderMediaUrl = headerMediaUrl || headerSampleUrl || (headerSample && headerSample.startsWith('http') ? headerSample : null)

    const rawName = (name || elementName || '').trim()
    if (!rawName) {
      return new Response(
        JSON.stringify({ error: 'Template name is required.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Sanitize template name: Meta requires lowercase letters, numbers, and underscores only
    const sanitizedName = rawName.toLowerCase().replace(/[^a-z0-9_]/g, '_')

    if (!bodyText || !bodyText.trim()) {
      return new Response(
        JSON.stringify({ error: 'bodyText is required.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Format buttons for DB and Meta
    const formattedButtonsForDb = (buttons || []).map((b: any) => ({
      type: (b.type || 'QUICK_REPLY').toUpperCase(),
      text: b.text || '',
      url: b.url || null,
      phone_number: b.phone_number || b.phoneNumber || null,
    }))

    // Construct Meta components array
    const components: Record<string, unknown>[] = []

    // 1. Header Component
    const upperHeaderType = (headerType || 'NONE').toUpperCase()
    if (upperHeaderType === 'TEXT' && headerText && headerText.trim()) {
      const headerComp: Record<string, unknown> = {
        type: 'HEADER',
        format: 'TEXT',
        text: headerText.trim(),
      }
      if (headerText.includes('{{1}}')) {
        headerComp.example = {
          header_text: [headerSample || 'Sample Title'],
        }
      }
      components.push(headerComp)
    } else if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(upperHeaderType)) {
      const mediaComp: Record<string, unknown> = {
        type: 'HEADER',
        format: upperHeaderType,
      }

      let mediaHandle = headerSample || effectiveHeaderMediaUrl

      // If effectiveHeaderMediaUrl is an HTTP URL, attempt upload to Meta Resumable Upload API
      if (effectiveHeaderMediaUrl && (effectiveHeaderMediaUrl.startsWith('http://') || effectiveHeaderMediaUrl.startsWith('https://'))) {
        try {
          console.log('[whatsapp-create-template] Downloading media sample from:', effectiveHeaderMediaUrl)
          const fileRes = await fetch(effectiveHeaderMediaUrl)
          if (fileRes.ok) {
            const fileBlob = await fileRes.blob()
            const fileBuffer = await fileBlob.arrayBuffer()
            const fileLength = fileBuffer.byteLength
            const fileMime = fileBlob.type || (upperHeaderType === 'IMAGE' ? 'image/jpeg' : upperHeaderType === 'VIDEO' ? 'video/mp4' : 'application/pdf')

            if (appId) {
              console.log(`[whatsapp-create-template] Initiating Meta upload session for App ID ${appId}, length: ${fileLength}, mime: ${fileMime}`)
              const sessionRes = await fetch(
                `https://graph.facebook.com/v21.0/${appId}/uploads?file_length=${fileLength}&file_type=${encodeURIComponent(fileMime)}`,
                {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${whatsappAccessToken}`,
                  },
                }
              )
              const sessionData = await sessionRes.json()
              if (sessionData?.id) {
                const uploadSessionId = sessionData.id
                console.log('[whatsapp-create-template] Upload session created:', uploadSessionId)
                const uploadRes = await fetch(`https://graph.facebook.com/v21.0/${uploadSessionId}`, {
                  method: 'POST',
                  headers: {
                    Authorization: `OAuth ${whatsappAccessToken}`,
                    file_offset: '0',
                    'Content-Type': 'application/octet-stream',
                  },
                  body: fileBuffer,
                })
                const uploadData = await uploadRes.json()
                if (uploadData?.h) {
                  console.log('[whatsapp-create-template] Meta upload handle obtained successfully:', uploadData.h)
                  mediaHandle = uploadData.h
                } else {
                  console.warn('[whatsapp-create-template] Meta binary upload failed:', uploadData)
                }
              } else {
                console.warn('[whatsapp-create-template] Meta upload session creation failed:', sessionData)
              }
            }
          }
        } catch (mediaErr: any) {
          console.warn('[whatsapp-create-template] Resumable upload error:', mediaErr?.message)
        }
      }

      // If sample handle is provided (Meta header_handle must be a Meta upload handle, not a URL)
      if (mediaHandle && !mediaHandle.startsWith('http://') && !mediaHandle.startsWith('https://')) {
        mediaComp.example = {
          header_handle: [mediaHandle],
        }
      }
      components.push(mediaComp)
    }

    // 2. Body Component
    const bodyComp: Record<string, unknown> = {
      type: 'BODY',
      text: bodyText.trim(),
    }

    // Check if body contains {{1}}, {{2}}, etc.
    const varMatches = bodyText.match(/\{\{(\d+)\}\}/g)
    if (varMatches && varMatches.length > 0) {
      // Build sample values array
      const sampleArray = varMatches.map((_: string, idx: number) => {
        return (variables && variables[idx]) ? String(variables[idx]) : `Sample ${idx + 1}`
      })
      bodyComp.example = {
        body_text: [sampleArray],
      }
    }
    components.push(bodyComp)

    // 3. Footer Component
    if (footerText && footerText.trim()) {
      components.push({
        type: 'FOOTER',
        text: footerText.trim(),
      })
    }

    // 4. Buttons Component
    if (Array.isArray(buttons) && buttons.length > 0) {
      const metaButtons = buttons.slice(0, 3).map((btn: any) => {
        const btnType = (btn.type || 'QUICK_REPLY').toUpperCase()
        if (btnType === 'URL') {
          const btnObj: Record<string, unknown> = {
            type: 'URL',
            text: btn.text || 'Visit Link',
            url: btn.url || 'https://example.com',
          }
          if (btn.url?.includes('{{1}}')) {
            btnObj.example = [btn.sampleUrl || 'https://example.com/order/123']
          }
          return btnObj
        } else if (btnType === 'PHONE_NUMBER') {
          return {
            type: 'PHONE_NUMBER',
            text: btn.text || 'Call Us',
            phone_number: btn.phone_number || btn.phoneNumber || '+910000000000',
          }
        } else {
          return {
            type: 'QUICK_REPLY',
            text: btn.text || 'Quick Reply',
          }
        }
      })

      components.push({
        type: 'BUTTONS',
        buttons: metaButtons,
      })
    }

    // Meta Payload
    const metaPayload = {
      name: sanitizedName,
      category: category.toUpperCase(),
      language: language || 'en',
      components,
    }

    // Send creation request to Meta Graph API
    let metaResponse: any = null
    let metaData: any = null
    try {
      const metaGraphUrl = `https://graph.facebook.com/v21.0/${wabaId}/message_templates`
      metaResponse = await fetch(metaGraphUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${whatsappAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metaPayload),
      })
      metaData = await metaResponse.json()
    } catch (fetchErr: any) {
      console.warn('Network call to Meta Graph API failed:', fetchErr?.message)
    }

    if (!metaResponse || !metaResponse.ok) {
      // Log error to whatsapp_error_logs
      await supabase.from('whatsapp_error_logs').insert({
        error_source: 'EDGE_FUNCTION_CREATE_TEMPLATE',
        error_code: String(metaData?.error?.code ?? metaResponse?.status ?? 'UNKNOWN'),
        error_message: metaData?.error?.message ?? 'Meta Graph API rejected the template.',
        payload_dump: { metaPayload, metaData },
      })

      // Graceful fallback: Persist locally to Supabase whatsapp_templates as PENDING so user work is NOT lost
      const metaErrMsg = metaData?.error?.message || metaData?.error?.error_user_msg || 'Meta Graph API rejected the template.'
      const { data: savedTemplate, error: fallbackDbError } = await supabase
        .from('whatsapp_templates')
        .upsert(
          {
            element_name: sanitizedName,
            category: category.toUpperCase(),
            language: language || 'en',
            body_text: bodyText.trim(),
            status: 'PENDING',
            header_type: upperHeaderType,
            header_text: upperHeaderType === 'TEXT' ? (headerText?.trim() || null) : null,
            header_sample_url: effectiveHeaderMediaUrl,
            footer_text: footerText?.trim() || null,
            buttons: formattedButtonsForDb,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'element_name' }
        )
        .select()
        .single()

      if (fallbackDbError) {
        console.error('Fallback DB persist error:', fallbackDbError)
      }

      return new Response(
        JSON.stringify({
          success: false,
          isStaged: true,
          template: savedTemplate,
          status: 'PENDING',
          error: metaErrMsg,
          warning: metaErrMsg,
          details: metaData?.error,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Success response from Meta: { id: "...", status: "PENDING" | "APPROVED", category: "..." }
    const templateStatus = requestedStatus || (autoApprove ? 'APPROVED' : (metaData.status || 'PENDING'))

    // Upsert into Supabase whatsapp_templates table
    const { data: savedTemplate, error: dbError } = await supabase
      .from('whatsapp_templates')
      .upsert(
        {
          element_name: sanitizedName,
          category: category.toUpperCase(),
          language: language || 'en',
          body_text: bodyText.trim(),
          status: templateStatus,
          header_type: upperHeaderType,
          header_text: upperHeaderType === 'TEXT' ? (headerText?.trim() || null) : null,
          header_sample_url: effectiveHeaderMediaUrl,
          footer_text: footerText?.trim() || null,
          buttons: formattedButtonsForDb,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'element_name' }
      )
      .select()
      .single()

    if (dbError) {
      console.error('Database persist error:', dbError)
      return new Response(
        JSON.stringify({
          success: true,
          warning: 'Template submitted to Meta successfully, but failed to persist locally.',
          meta: metaData,
          dbError: dbError.message,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        template: savedTemplate,
        meta: metaData,
        status: templateStatus,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('❌ whatsapp-create-template error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal Server Error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
