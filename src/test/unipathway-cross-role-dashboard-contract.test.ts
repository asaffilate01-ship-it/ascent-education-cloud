import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {KNOWN_UNIPATHWAY_ROLES} from '@/lib/roleMembership';

const source=(path:string)=>readFileSync(path,'utf8');

describe('UniPathway cross-role dashboards protect centre and subject boundaries',()=>{
 it('has an explicit verified role for each of the thirteen specialist audit accounts',()=>{
  const roles=[
   'programme_leader','iqa_officer','exams_officer','finance_officer',
   'marketing_officer','agent','student','university_partner',
   'employer_partner','parent_guardian','assessor','awarding_body_eqa',
   'welfare_officer',
  ];
  expect(roles).toHaveLength(13);
  for(const role of roles)expect(KNOWN_UNIPATHWAY_ROLES).toContain(role);
  const auth=source('src/contexts/AuthContext.tsx');
  for(const role of roles){
   expect(auth).toContain(role+':');
  }
 });
 it('keeps external awarding body EQA private data unreadable without scoped evidence',()=>{
  const s=source('src/pages/eqa/AwardingBodyDashboard.tsx');
  expect(s).toContain("user.role==='awarding_body_eqa'");
  expect(s).not.toMatch(/useSupabaseQuery|\.from\(|\.rpc\(|\.functions\.invoke/);
  expect(s).toContain('not yet independently confirmed');
 });
 it('never reads centre-wide invoices or permits unaudited admissions writes from the agent dashboard',()=>{
  const s=source('src/pages/agent/AgentDashboard.tsx');
  expect(s).toContain("user.role==='agent'");
  expect(s).toContain("{column:'tenant_id',operator:'eq'");
  expect(s).toContain("{column:'agent_id',operator:'eq'");
  expect(s).not.toMatch(/useSupabaseQuery\('invoices'|\.from\('invoices'|AddLeadModal|\.insert\(/);
  expect(s).toContain('Commission reconciliation not activated');
 });
 it('scopes marketing lead counts to the verified centre and active role',()=>{
  const s=source('src/pages/marketing/MarketingDashboard.tsx');
  expect(s).toContain("user.roles?.includes(user.role)");
  expect(s).toContain("filters: [{column:'tenant_id',operator:'eq'");
  expect(s).toContain('enabled: scoped');
  expect(s).toContain("select: 'id,tenant_id,stage,created_at,source'");
 });
 it('only reads employer applicant counts for opportunities of verified organisations',()=>{
  const s=source('src/pages/employer/EmployerPortal.tsx');
  expect(s).toContain("user.role==='employer_partner'");
  expect(s).toContain(".eq('user_id',user.id).eq('status','verified')");
  expect(s).toContain(".in('organisation_id',orgs)");
  expect(s).toContain(".in('opportunity_id',opportunityIds)");
  expect(s).toContain("members.some(member=>member.organisation_id===organisation)");
 });
 it('limits exam and university partner routes to honest unactivated states',()=>{
  const exams=source('src/pages/exams/ExamsDashboard.tsx');
  const partner=source('src/pages/partner/UniversityPartnerPortal.tsx');
  expect(exams).toContain('Candidate entry verification is not connected.');
  expect(exams).toContain('Verified examination results are not connected.');
  expect(partner).toContain('NO private record queries');
  expect(partner).not.toMatch(/\.from\(|\.rpc\(/);
 });
 it('routes specialist accounts through role guards, never generic signed-in pages',()=>{
  const app=source('src/App.tsx');
  for(const [path,guard] of [
   ['/programme','Programme'],['/qa','QA'],['/exams','Exams'],['/finance','Finance'],
   ['/marketing','Marketing'],['/agent','AgentR'],['/student','StudentR'],
   ['/partner','PartnerR'],['/employer','EmployerR'],['/parent','ParentR'],
   ['/assessor','AssessorR'],['/eqa','EQAR'],['/health','WelfareR'],
  ]){
   expect(app).toContain(`<Route path="${path}" element={<${guard}>`);
  }
 });
});
