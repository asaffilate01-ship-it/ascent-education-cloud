import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, rateLimit, rateLimitResponse, getClientIp } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const ip = getClientIp(req)
  // Webhooks can be bursty — generous limit
  if (!rateLimit(ip, 100, 60_000)) return rateLimitResponse()

  try {
    const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')
    if (!STRIPE_WEBHOOK_SECRET) {
      console.error('STRIPE_WEBHOOK_SECRET not configured')
      return new Response(JSON.stringify({ error: 'Webhook secret not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const body = await req.text()
    const signature = req.headers.get('stripe-signature')

    if (!signature) {
      return new Response(JSON.stringify({ error: 'Missing stripe-signature header' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Stripe signature verification
    const elements = signature.split(',')
    const timestampEl = elements.find(e => e.startsWith('t='))
    const sigEl = elements.find(e => e.startsWith('v1='))

    if (!timestampEl || !sigEl) {
      return new Response(JSON.stringify({ error: 'Invalid signature format' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const timestamp = timestampEl.split('=')[1]
    
    // Reject events older than 5 minutes (replay attack prevention)
    const eventAge = Math.floor(Date.now() / 1000) - parseInt(timestamp, 10)
    if (eventAge > 300) {
      return new Response(JSON.stringify({ error: 'Webhook timestamp too old' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const signedPayload = `${timestamp}.${body}`
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw', encoder.encode(STRIPE_WEBHOOK_SECRET),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    )
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload))
    const expectedSig = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
    const receivedSig = sigEl.split('=')[1]

    if (expectedSig !== receivedSig) {
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const event = JSON.parse(body)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object
        const invoiceId = pi.metadata?.invoice_id
        const tenantId = pi.metadata?.tenant_id

        if (invoiceId) {
          await supabase.from('invoices').update({
            status: 'paid',
            paid: pi.amount / 100,
          }).eq('id', invoiceId)

          const { data: invoice } = await supabase.from('invoices').select('student_id, student_name, amount').eq('id', invoiceId).single()

          if (invoice?.student_id) {
            await supabase.from('notifications').insert({
              user_id: invoice.student_id,
              tenant_id: tenantId,
              title: 'Payment Received',
              message: `Your payment of Rs.${(pi.amount / 100).toFixed(2)} has been confirmed.`,
              type: 'finance',
              severity: 'success',
            })
          }
        }

        await supabase.from('audit_logs').insert({
          action: 'stripe_payment_succeeded',
          entity_type: 'payment',
          entity_id: pi.id,
          tenant_id: pi.metadata?.tenant_id,
          details: { amount: pi.amount, currency: pi.currency, invoice_id: invoiceId },
        })
        break
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object
        const invoiceId = pi.metadata?.invoice_id

        if (invoiceId) {
          const { data: invoice } = await supabase.from('invoices').select('student_id').eq('id', invoiceId).single()
          if (invoice?.student_id) {
            await supabase.from('notifications').insert({
              user_id: invoice.student_id,
              tenant_id: pi.metadata?.tenant_id,
              title: 'Payment Failed',
              message: 'Your payment could not be processed. Please try again or contact finance.',
              type: 'finance',
              severity: 'error',
            })
          }
        }

        await supabase.from('audit_logs').insert({
          action: 'stripe_payment_failed',
          entity_type: 'payment',
          entity_id: pi.id,
          details: { amount: pi.amount, error: pi.last_payment_error?.message },
        })
        break
      }

      case 'invoice.paid': {
        const stripeInvoice = event.data.object
        await supabase.from('audit_logs').insert({
          action: 'stripe_invoice_paid',
          entity_type: 'stripe_invoice',
          entity_id: stripeInvoice.id,
          details: { amount_paid: stripeInvoice.amount_paid, customer: stripeInvoice.customer },
        })
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('Webhook error:', msg)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
