import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, rateLimit, rateLimitResponse, getClientIp } from '../_shared/cors.ts'
import { authenticateRequest } from '../_shared/auth.ts'
import {safeCsvValue,reportTypeAllowed,type ReportType} from '../_shared/report-authorization.ts'

function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  const lines = [
    headers.join(','),
    ...rows.map(row =>
      headers.map(h => safeCsvValue(row[h])      ).join(',')
    )
  ]
  return lines.join('\n')
}

const VALID_REPORT_TYPES = ['students', 'invoices', 'attendance', 'applications'] as const
// The old generic submissions export exposed unreleased/provisional marks.
// Rebuild it only from independently released academic records with board policy.


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

    // Check the requested report, centre and role together before a service-role read.
    const { data: roles, error: roleError } = await adminClient.from('user_roles')
      .select('role,tenant_id').eq('user_id',auth.userId)
    if (roleError || !Array.isArray(roles) || !roles.length) {
      return new Response(JSON.stringify({error:'Verified report role unavailable'}),{
        status:403,headers:{...corsHeaders,'Content-Type':'application/json'}
      })
    }
    const isSuperadmin=roles.some(r=>r.role==='superadmin')
    let effectiveTenantId:string
    if (isSuperadmin) {
      // Even a global administrator must choose one explicit centre per export.
      if (typeof tenantId!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(tenantId)) {
        return new Response(JSON.stringify({error:'An explicit valid centre ID is required'}),{
          status:400,headers:{...corsHeaders,'Content-Type':'application/json'}
        })
      }
      effectiveTenantId=tenantId
    } else {
      const {data:profile,error:profileError}=await adminClient.from('profiles')
        .select('tenant_id').eq('user_id',auth.userId).single()
      if (profileError||!profile?.tenant_id||typeof profile.tenant_id!=='string'||tenantId&&tenantId!==profile.tenant_id) {
        return new Response(JSON.stringify({error:'Centre assignment does not match the requested export'}),{
          status:403,headers:{...corsHeaders,'Content-Type':'application/json'}
        })
      }
      effectiveTenantId=profile.tenant_id
    }
    const authorised=reportTypeAllowed(reportType as ReportType,roles,effectiveTenantId)
    if (!authorised) {
      return new Response(JSON.stringify({error:'This role cannot export the selected report'}),{
        status:403,headers:{...corsHeaders,'Content-Type':'application/json'}
      })
    }

    let data: Record<string, unknown>[] = []
    let filename = ''

    switch (reportType) {
      case 'students': {
        let query = adminClient.from('profiles').select('full_name, email, phone, tenant_id, created_at')
        query = query.eq('tenant_id', effectiveTenantId)
        const { data: rows,error:readError } = await query.limit(5000)
        if (readError || !Array.isArray(rows)) throw Error('Report data could not be verified')
        data = rows as Record<string, unknown>[]
        filename = 'students-export.csv'
        break
      }
      case 'invoices': {
        let query = adminClient.from('invoices').select('student_name, type, amount, paid, status, issued_date, due_date')
        query = query.eq('tenant_id', effectiveTenantId)
        if (filters?.status && typeof filters.status === 'string') query = query.eq('status', filters.status)
        const { data: rows,error:readError } = await query.limit(5000)
        if (readError || !Array.isArray(rows)) throw Error('Report data could not be verified')
        data = rows as Record<string, unknown>[]
        filename = 'invoices-export.csv'
        break
      }
      case 'attendance': {
        let query = adminClient.from('attendance_records').select('student_id, date, status, method, module_id')
        query = query.eq('tenant_id', effectiveTenantId)
        if (filters?.dateFrom && typeof filters.dateFrom === 'string') query = query.gte('date', filters.dateFrom)
        if (filters?.dateTo && typeof filters.dateTo === 'string') query = query.lte('date', filters.dateTo)
        const { data: rows,error:readError } = await query.limit(5000)
        if (readError || !Array.isArray(rows)) throw Error('Report data could not be verified')
        data = rows as Record<string, unknown>[]
        filename = 'attendance-export.csv'
        break
      }
      case 'applications': {
        let query = adminClient.from('applications').select('student_name, email, phone, programme_name, stage, source, counsellor, created_at')
        query = query.eq('tenant_id', effectiveTenantId)
        if (filters?.stage && typeof filters.stage === 'string') query = query.eq('stage', filters.stage)
        const { data: rows,error:readError } = await query.limit(5000)
        if (readError || !Array.isArray(rows)) throw Error('Report data could not be verified')
        data = rows as Record<string, unknown>[]
        filename = 'applications-export.csv'
        break
      }
    }

    const csv = toCSV(data)

    const {error:auditError}=await adminClient.from('audit_logs').insert({
      user_id: auth.userId,
      user_email: auth.email,
      action: 'report_exported',
      entity_type: 'report',
      details: {reportType,tenantId:effectiveTenantId,rowCount:data.length},
    })
    if(auditError)throw Error('Export could not be recorded in the audit trail')

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
