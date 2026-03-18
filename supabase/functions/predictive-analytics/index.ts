import { corsHeaders, rateLimit, rateLimitResponse, getClientIp } from '../_shared/cors.ts'
import { authenticateRequest } from '../_shared/auth.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.57.2'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const ip = getClientIp(req)
  if (!rateLimit(ip, 10, 60_000)) return rateLimitResponse()

  try {
    const auth = await authenticateRequest(req)
    if (auth instanceof Response) return auth

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    )

    const { action, tenant_id } = await req.json()

    if (action === 'dropout_risk') {
      // Fetch students with low attendance and grades
      const { data: attendance } = await supabase
        .from('attendance_records')
        .select('student_id, status')
        .eq('tenant_id', tenant_id)

      const { data: submissions } = await supabase
        .from('submissions')
        .select('student_id, grade, status')
        .eq('tenant_id', tenant_id)

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .eq('tenant_id', tenant_id)

      // Calculate risk per student
      const studentStats: Record<string, { name: string; absences: number; totalAtt: number; avgGrade: number; gradeCount: number; missedSubmissions: number }> = {}

      for (const p of profiles || []) {
        studentStats[p.user_id] = { name: p.full_name || 'Unknown', absences: 0, totalAtt: 0, avgGrade: 0, gradeCount: 0, missedSubmissions: 0 }
      }

      for (const a of attendance || []) {
        if (studentStats[a.student_id]) {
          studentStats[a.student_id].totalAtt++
          if (a.status === 'absent') studentStats[a.student_id].absences++
        }
      }

      for (const s of submissions || []) {
        if (studentStats[s.student_id]) {
          if (s.grade != null) {
            studentStats[s.student_id].avgGrade += Number(s.grade)
            studentStats[s.student_id].gradeCount++
          }
          if (s.status === 'overdue') studentStats[s.student_id].missedSubmissions++
        }
      }

      const atRisk = Object.entries(studentStats)
        .map(([id, s]) => {
          const attRate = s.totalAtt > 0 ? ((s.totalAtt - s.absences) / s.totalAtt) * 100 : 100
          const avgGrade = s.gradeCount > 0 ? s.avgGrade / s.gradeCount : 50
          // Risk score: higher = more at risk
          let riskScore = 0
          if (attRate < 60) riskScore += 40
          else if (attRate < 75) riskScore += 20
          if (avgGrade < 40) riskScore += 35
          else if (avgGrade < 55) riskScore += 15
          if (s.missedSubmissions > 2) riskScore += 25
          else if (s.missedSubmissions > 0) riskScore += 10

          return {
            student_id: id,
            name: s.name,
            attendance_rate: Math.round(attRate),
            avg_grade: Math.round(avgGrade),
            missed_submissions: s.missedSubmissions,
            risk_score: Math.min(100, riskScore),
            risk_level: riskScore >= 60 ? 'high' : riskScore >= 30 ? 'medium' : 'low',
          }
        })
        .filter(s => s.risk_score > 0)
        .sort((a, b) => b.risk_score - a.risk_score)
        .slice(0, 20)

      return new Response(JSON.stringify({ students: atRisk }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })

    } else if (action === 'revenue_forecast') {
      const { data: invoices } = await supabase
        .from('invoices')
        .select('amount, paid, status, issued_date, due_date, type')
        .eq('tenant_id', tenant_id)

      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const byMonth: Record<string, { collected: number; outstanding: number }> = {}
      months.forEach(m => byMonth[m] = { collected: 0, outstanding: 0 })

      for (const inv of invoices || []) {
        const m = months[new Date(inv.issued_date).getMonth()]
        if (m) {
          byMonth[m].collected += Number(inv.paid || 0)
          byMonth[m].outstanding += Number(inv.amount || 0) - Number(inv.paid || 0)
        }
      }

      // Simple linear forecast for next 3 months
      const historical = months.map(m => byMonth[m].collected)
      const recent = historical.slice(-3).filter(v => v > 0)
      const avgRecent = recent.length > 0 ? recent.reduce((a, b) => a + b, 0) / recent.length : 0
      const trend = recent.length >= 2 ? (recent[recent.length - 1] - recent[0]) / recent.length : 0

      const forecast = months.map((m, i) => ({
        month: m,
        collected: byMonth[m].collected,
        outstanding: byMonth[m].outstanding,
        forecast: byMonth[m].collected > 0 ? null : Math.max(0, Math.round(avgRecent + trend * (i - 9))),
      }))

      const totalCollected = (invoices || []).reduce((s, i) => s + Number(i.paid || 0), 0)
      const totalOutstanding = (invoices || []).reduce((s, i) => s + (Number(i.amount || 0) - Number(i.paid || 0)), 0)
      const overdueCount = (invoices || []).filter(i => i.status === 'overdue').length

      return new Response(JSON.stringify({
        forecast,
        summary: { totalCollected, totalOutstanding, overdueCount, avgMonthly: Math.round(avgRecent) }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })

    } else {
      return new Response(JSON.stringify({ error: 'Invalid action' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
