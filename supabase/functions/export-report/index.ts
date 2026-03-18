import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, rateLimit, rateLimitResponse, getClientIp } from '../_shared/cors.ts'
import { authenticateRequest } from '../_shared/auth.ts'

function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  const lines = [
    headers.join(','),
    ...rows.map(row =>
      headers.map(h => {
        const val = row[h]
        const str = val === null || val === undefined ? '' : String(val)
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str
      }).join(',')
    )
  ]
  return lines.join('\n')
}

const VALID_REPORT_TYPES = ['students', 'invoices', 'attendance', 'submissions', 'applications'] as const

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const ip = getClientIp(req)
  if (!rateLimit(ip, 10, 60_000)) return rateLimitResponse()

  try {
    const auth = await authenticateRequest(req)
    if (auth instanceof Response) return auth

    const { reportType, tenantId, filters } = await req.json()

    if (!reportType || !VALID_REPORT_TYPES.includes(reportType)) {
      return new Response(JSON.stringify({ error: `reportType must be one of: ${VALID_REPORT_TYPES.join(', ')}` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Verify user has appropriate role
    const { data: roles } = await adminClient.from('user_roles').select('role').eq('user_id', auth.userId)
    const userRoles = roles?.map(r => r.role) || []
    const allowedRoles = ['superadmin', 'centre_director', 'finance_officer', 'admissions_admin', 'exams_officer']
    if (!userRoles.some(r => allowedRoles.includes(r))) {
      return new Response(JSON.stringify({ error: 'Insufficient permissions to export reports' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Enforce tenant isolation: non-superadmins can only export their own tenant's data
    const isSuperadmin = userRoles.includes('superadmin')
    let effectiveTenantId = tenantId
    if (!isSuperadmin) {
      const { data: profile } = await adminClient.from('profiles').select('tenant_id').eq('user_id', auth.userId).single()
      if (!profile?.tenant_id) {
        return new Response(JSON.stringify({ error: 'User has no tenant assigned' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      // Force tenant_id to user's own tenant regardless of what was passed
      effectiveTenantId = profile.tenant_id
    }

    let data: Record<string, unknown>[] = []
    let filename = ''

    switch (reportType) {
      case 'students': {
        let query = adminClient.from('profiles').select('full_name, email, phone, tenant_id, created_at')
        if (effectiveTenantId) query = query.eq('tenant_id', effectiveTenantId)
        const { data: rows } = await query.limit(5000)
        data = (rows || []) as Record<string, unknown>[]
        filename = 'students-export.csv'
        break
      }
      case 'invoices': {
        let query = adminClient.from('invoices').select('student_name, type, amount, paid, status, issued_date, due_date')
        if (effectiveTenantId) query = query.eq('tenant_id', effectiveTenantId)
        if (filters?.status && typeof filters.status === 'string') query = query.eq('status', filters.status)
        const { data: rows } = await query.limit(5000)
        data = (rows || []) as Record<string, unknown>[]
        filename = 'invoices-export.csv'
        break
      }
      case 'attendance': {
        let query = adminClient.from('attendance_records').select('student_id, date, status, method, module_id')
        if (tenantId) query = query.eq('tenant_id', tenantId)
        if (filters?.dateFrom && typeof filters.dateFrom === 'string') query = query.gte('date', filters.dateFrom)
        if (filters?.dateTo && typeof filters.dateTo === 'string') query = query.lte('date', filters.dateTo)
        const { data: rows } = await query.limit(5000)
        data = (rows || []) as Record<string, unknown>[]
        filename = 'attendance-export.csv'
        break
      }
      case 'submissions': {
        let query = adminClient.from('submissions').select('student_name, assignment_id, status, grade, plagiarism_score, word_count, submitted_at')
        if (tenantId) query = query.eq('tenant_id', tenantId)
        const { data: rows } = await query.limit(5000)
        data = (rows || []) as Record<string, unknown>[]
        filename = 'submissions-export.csv'
        break
      }
      case 'applications': {
        let query = adminClient.from('applications').select('student_name, email, phone, programme_name, stage, source, counsellor, created_at')
        if (tenantId) query = query.eq('tenant_id', tenantId)
        if (filters?.stage && typeof filters.stage === 'string') query = query.eq('stage', filters.stage)
        const { data: rows } = await query.limit(5000)
        data = (rows || []) as Record<string, unknown>[]
        filename = 'applications-export.csv'
        break
      }
    }

    const csv = toCSV(data)

    await adminClient.from('audit_logs').insert({
      user_id: auth.userId,
      user_email: auth.email,
      action: 'report_exported',
      entity_type: 'report',
      details: { reportType, tenantId, rowCount: data.length, filters },
    })

    return new Response(csv, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      }
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
