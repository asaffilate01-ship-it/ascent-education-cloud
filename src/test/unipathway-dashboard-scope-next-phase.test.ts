import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
const src=(p:string)=>readFileSync(p,'utf8');
describe('21-role source dashboard fail-closed checks',()=>{
 it('verifies each sensitive dashboard before making queries',()=>{
  for(const path of [
   'src/pages/landlord/LandlordDashboard.tsx',
   'src/pages/director/ProgrammeManagement.tsx',
   'src/pages/finance/FinanceDashboard.tsx',
   'src/pages/student/StudentDashboard.tsx',
   'src/pages/health/HealthRecords.tsx',
   'src/pages/exams/ExamsDashboard.tsx',
   'src/pages/parent/ParentDashboard.tsx',
  ])expect(src(path)).toMatch(/roles\?\.includes\(/);
 });
 it('requires a verified receipt for student health updates and rejects unrelated login roles',()=>{
  const health=src('src/pages/health/HealthRecords.tsx');
  expect(health).toContain(".select('id,student_id,tenant_id').single()");
  expect(health).toContain('result.data?.tenant_id!==tenantId');
  expect(src('src/pages/parent/ParentDashboard.tsx')).toContain("user.role==='parent_guardian'");
 });
 it('does not report mutually exclusive marketing stage counts as measured transitions',()=>{
  const marketing=src('src/pages/marketing/MarketingDashboard.tsx');
  expect(marketing).not.toContain('Recruitment Funnel');
  expect(marketing).toContain('Current application stages');
  expect(marketing).toContain('stage.count/largestStage');
  expect(marketing).not.toContain('funnel[i + 1].count / funnel[i].count');
 });
});
