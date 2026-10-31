import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {reportTypeAllowed,safeCsvValue} from '../../supabase/functions/_shared/report-authorization';

const finance=[{role:'finance_officer',tenant_id:'centre-a'}];
const admissions=[{role:'admissions_admin',tenant_id:'centre-a'}];
const director=[{role:'centre_director',tenant_id:'centre-a'}];
const superadmin=[{role:'superadmin',tenant_id:null}];
describe('UniPathway privileged report export boundaries',()=>{
 it('finance can only export invoices for their own assigned centre',()=>{
  expect(reportTypeAllowed('invoices',finance,'centre-a')).toBe(true);
  for(const report of ['students','applications','attendance'] as const)
   expect(reportTypeAllowed(report,finance,'centre-a')).toBe(false);
  expect(reportTypeAllowed('invoices',finance,'centre-b')).toBe(false);
 });
 it('admissions, programme, examinations and managers get only their own report type permissions',()=>{
  expect(reportTypeAllowed('applications',admissions,'centre-a')).toBe(true);
  expect(reportTypeAllowed('invoices',admissions,'centre-a')).toBe(false);
  expect(reportTypeAllowed('attendance',[{role:'programme_leader',tenant_id:'centre-a'}],'centre-a')).toBe(true);
  expect(reportTypeAllowed('students',[{role:'programme_leader',tenant_id:'centre-a'}],'centre-a')).toBe(false);
  expect(reportTypeAllowed('students',director,'centre-a')).toBe(true);
  expect(reportTypeAllowed('applications',director,'centre-b')).toBe(false);
  expect(reportTypeAllowed('invoices',superadmin,'centre-a')).toBe(true);
  expect(reportTypeAllowed('invoices',superadmin,'')).toBe(false);
 });
 it('neutralises formula injection, including leading spaces, before spreadsheet export',()=>{
  for(const value of ['=HYPERLINK("x","open")','+SUM(1,2)','-1+2','@SUM(A1:A2)','   =cmd','\t=command'])
   expect(safeCsvValue(value)).toContain("'");
  expect(safeCsvValue('Normal learner')).toBe('Normal learner');
  expect(safeCsvValue('A,"B"')).toBe('"A,""B"""');
  expect(safeCsvValue(null)).toBe('');
 });
 it('removes the old service-role broad raw submissions export and requires a tenant',()=>{
  const edge=readFileSync('supabase/functions/export-report/index.ts','utf8');
  expect(edge).toContain('reportTypeAllowed(');
  expect(edge).toContain('effectiveTenantId');
  expect(edge).toContain("query = query.eq('tenant_id', effectiveTenantId)");
  expect(edge).not.toContain("case 'submissions':");
  expect(edge).not.toContain("userRoles.some(r => allowedRoles.includes(r))");
  expect(edge).toContain('if(auditError)throw Error');
 });
 it('finance UI binds its invoice read and CSV request to the authenticated centre',()=>{
  const source=readFileSync('src/pages/finance/FinanceDashboard.tsx','utf8');
  expect(source).toContain("enabled:allowed");
  expect(source).toContain("filters:[{column:'tenant_id',operator:'eq',value:user?.tenantId||''}]");
  expect(source).toContain('tenantId:user.tenantId');
  expect(source).toContain('tenantId={user?.tenantId || null}');
 });
});
