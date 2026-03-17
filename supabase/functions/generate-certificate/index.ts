import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, rateLimit, rateLimitResponse, getClientIp } from '../_shared/cors.ts'
import { authenticateRequest } from '../_shared/auth.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const ip = getClientIp(req)
  if (!rateLimit(ip, 10, 60_000)) return rateLimitResponse()

  try {
    const auth = await authenticateRequest(req)
    if (auth instanceof Response) return auth

    const { studentName, programmeName, awardingBody, grade, completionDate, certificateType } = await req.json()

    if (!studentName || !programmeName) {
      return new Response(JSON.stringify({ error: 'studentName and programmeName are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Sanitize inputs
    const safeName = String(studentName).slice(0, 200).replace(/[<>&"']/g, '')
    const safeProgramme = String(programmeName).slice(0, 300).replace(/[<>&"']/g, '')
    const safeBody = String(awardingBody || 'OTHM').slice(0, 100).replace(/[<>&"']/g, '')
    const safeGrade = grade ? String(grade).slice(0, 50).replace(/[<>&"']/g, '') : null

    const certDate = completionDate || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    const certType = certificateType || 'completion'
    const certId = `CERT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;600&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 842px; height: 595px; background: #fff; font-family: 'Inter', sans-serif; }
  .certificate { width: 100%; height: 100%; border: 3px solid #1a365d; padding: 20px; position: relative; }
  .inner { border: 1px solid #c9a84c; height: 100%; padding: 40px 60px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
  .logo-row { font-size: 14px; color: #666; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 8px; }
  h1 { font-family: 'Playfair Display', serif; font-size: 36px; color: #1a365d; margin: 12px 0; }
  .subtitle { font-size: 14px; color: #666; margin-bottom: 24px; }
  .name { font-family: 'Playfair Display', serif; font-size: 28px; color: #c9a84c; margin: 8px 0; }
  .programme { font-size: 16px; font-weight: 600; color: #1a365d; margin: 12px 0; }
  .details { font-size: 13px; color: #555; margin: 4px 0; }
  .grade-badge { background: #1a365d; color: #fff; padding: 6px 24px; border-radius: 4px; font-weight: 600; margin: 16px 0; display: inline-block; }
  .footer { display: flex; justify-content: space-between; width: 100%; margin-top: 32px; padding: 0 40px; }
  .sig { text-align: center; font-size: 12px; color: #666; }
  .sig-line { width: 160px; border-top: 1px solid #999; margin-bottom: 4px; }
  .cert-id { position: absolute; bottom: 28px; right: 68px; font-size: 10px; color: #999; }
</style></head>
<body><div class="certificate"><div class="inner">
  <div class="logo-row">${safeBody} Accredited</div>
  <h1>Certificate of ${certType === 'distinction' ? 'Distinction' : certType === 'merit' ? 'Merit' : 'Completion'}</h1>
  <div class="subtitle">This is to certify that</div>
  <div class="name">${safeName}</div>
  <div class="subtitle">has successfully completed the programme</div>
  <div class="programme">${safeProgramme}</div>
  ${safeGrade ? `<div class="grade-badge">${safeGrade}</div>` : ''}
  <div class="details">Date of Completion: ${certDate}</div>
  <div class="details">Awarding Body: ${safeBody}</div>
  <div class="footer">
    <div class="sig"><div class="sig-line"></div>Centre Director</div>
    <div class="sig"><div class="sig-line"></div>External Verifier</div>
  </div>
  <div class="cert-id">${certId}</div>
</div></div></body></html>`

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    await adminClient.from('audit_logs').insert({
      user_id: auth.userId,
      user_email: auth.email,
      action: 'certificate_generated',
      entity_type: 'certificate',
      details: { certId, studentName: safeName, programmeName: safeProgramme, grade: safeGrade, awardingBody: safeBody },
    })

    return new Response(JSON.stringify({ success: true, certificateId: certId, html }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
