import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    )
    const token = authHeader.replace('Bearer ', '')
    const { data: claims, error: authError } = await supabase.auth.getUser(token)
    if (authError || !claims.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { reportType, tenantId, filters } = await req.json()

    if (!reportType) {
      return new Response(JSON.stringify({ error: 'reportType is required (students, invoices, attendance, submissions, applications)' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Use service role for full data access
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Verify user has appropriate role
    const { data: roles } = await adminClient.from('user_roles').select('role').eq('user_id', claims.user.id)
    const userRoles = roles?.map(r => r.role) || []
    const allowedRoles = ['superadmin', 'centre_director', 'finance_officer', 'admissions_admin', 'exams_officer']
    if (!userRoles.some(r => allowedRoles.includes(r))) {
      return new Response(JSON.stringify({ error: 'Insufficient permissions to export reports' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    let data: Record<string, unknown>[] = []
    let filename = ''

    switch (reportType) {
      case 'students': {
        let query = adminClient.from('profiles').select('full_name, email, phone, tenant_id, created_at')
        if (tenantId) query = query.eq('tenant_id', tenantId)
        const { data: rows } = await query.limit(5000)
        data = (rows || []) as Record<string, unknown>[]
        filename = 'students-export.csv'
        break
      }
      case 'invoices': {
        let query = adminClient.from('invoices').select('student_name, type, amount, paid, status, issued_date, due_date')
        if (tenantId) query = query.eq('tenant_id', tenantId)
        if (filters?.status) query = query.eq('status', filters.status)
        const { data: rows } = await query.limit(5000)
        data = (rows || []) as Record<string, unknown>[]
        filename = 'invoices-export.csv'
        break
      }
      case 'attendance': {
        let query = adminClient.from('attendance_records').select('student_id, date, status, method, module_id')
        if (tenantId) query = query.eq('tenant_id', tenantId)
        if (filters?.dateFrom) query = query.gte('date', filters.dateFrom)
        if (filters?.dateTo) query = query.lte('date', filters.dateTo)
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
        if (filters?.stage) query = query.eq('stage', filters.stage)
        const { data: rows } = await query.limit(5000)
        data = (rows || []) as Record<string, unknown>[]
        filename = 'applications-export.csv'
        break
      }
      default:
        return new Response(JSON.stringify({ error: `Unknown reportType: ${reportType}` }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }

    const csv = toCSV(data)

    // Audit log
    await adminClient.from('audit_logs').insert({
      user_id: claims.user.id,
      user_email: claims.user.email,
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
