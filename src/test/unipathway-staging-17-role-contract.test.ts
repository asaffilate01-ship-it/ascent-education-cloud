import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

const file=(path:string)=>readFileSync(path,'utf8');
const academic=file('scripts/verify-unipathway-staging-academic.mjs');
const classic=file('scripts/verify-unipathway-staging.mjs');
const workflow=file('.github/workflows/unipathway-staging-acceptance.yml');
const app=file('src/App.tsx');
const sidebar=file('src/components/layout/DashboardSidebar.tsx');
const publicNav=file('src/components/PublicNav.tsx');

const roles=['superadmin','director','admissions','lecturer','programme','qa','exams',
 'finance','marketing','agent','student','unipartner','employer','assessor','eqa','welfare','parent'];

function isKnownRoute(dest:string,actualRoutes:string[]){
 const path=dest.split(/[?#]/)[0];
 return actualRoutes.some(route=>{
  const escaped=route.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/:[^/]+/g,'[^/]+');
  return new RegExp('^'+escaped+'$').test(path);
 });
}

describe('protected UniPathway academic staging acceptance',()=>{
 it('requires all 17 roles plus two student isolation fixtures',()=>{
  for(const role of roles)expect(academic).toMatch(new RegExp('\\b'+role+':\\['));
  expect(academic).toContain("'studentB','uninvitedStudentA'");
  expect(academic).toContain('profiles');
  expect(academic).toContain('user_roles');
  expect(academic).toContain('assert.equal(matches.length,1');
 });
 it('refuses ambiguous production project, missing confirmation and malformed staging URL',()=>{
  expect(academic).toContain("acknowledge!=='UNIPATHWAY_STAGING_ONLY'");
  expect(academic).toContain('ref===productionRef');
  expect(academic).toContain("ref==='sthrhcmjypwuorlbscfw'");
  expect(academic).toContain("parsed.hostname!==ref+'.supabase.co'");
  expect(classic).toContain('STAGING_RUN_ACK');
  const denied=spawnSync(process.execPath,['scripts/verify-unipathway-staging-academic.mjs'],{
   env:{},encoding:'utf8',timeout:8000
  });
  expect(denied.status).not.toBe(0);
  expect(denied.stderr).toContain('STAGING_RUN_ACK');
 });
 it('never touches production or writes fixture data in a read-only acceptance run',()=>{
  expect(academic).toContain('academic-staging-read-only');
  expect(academic).toContain(".select(column)");
  expect(academic).toContain("createSignedUrl(path,30)");
  for(const forbidden of ['.insert(','.update(','.upsert(','.delete(','.upload(','.remove('])
   expect(academic).not.toContain(forbidden);
  expect(academic).not.toContain('SERVICE_ROLE_KEY');
 });
 it('checks cross-tenant classrooms, private lab work, IQA and released-only marks',()=>{
  for(const table of ['live_class_sessions','lesson_whiteboards','unipathway_module_materials',
   'unipathway_assessment_attempts','unipathway_assessment_ai_drafts',
   'unipathway_assessment_human_marks','unipathway_assessment_released_results',
   'unipathway_lab_code_workspaces'])expect(academic).toContain("'"+table+"'");
  expect(academic).toContain('same-tenant student without invite');
  expect(academic).toContain('revoked class');
  expect(academic).toContain('unreleased provisional mark');
  expect(academic).toContain('other tenant coding work');
  expect(academic).toContain('unenrolled learner notes');
 });
 it('requires protected staging workflows and production-project ref separation',()=>{
  expect(workflow).toContain('environment: unipathway-staging');
  expect(workflow).toContain('scripts/verify-unipathway-staging-academic.mjs');
  expect(workflow).toContain('UNIPATHWAY_PRODUCTION_PROJECT_REF');
  expect(workflow).toContain('UNIPATHWAY_STAGING_ACADEMIC_FIXTURES_JSON');
  expect(workflow).toContain("inputs.confirmation == 'UNIPATHWAY_STAGING_ONLY'");
 });
});

describe('all role sidebar links resolve to a registered app route',()=>{
 const routes=[...app.matchAll(/<Route path="([^"]+)"/g)].map(m=>m[1]);
 const internal=[...sidebar.matchAll(/\bpath:\s*['"]([^'"]+)['"]/g)]
  .map(m=>m[1]).filter(x=>x.startsWith('/'));
 const external=[...publicNav.matchAll(/\bto:\s*['"]([^'"]+)['"]/g)]
  .map(m=>m[1]).filter(x=>x.startsWith('/'));
 it('covers all configured sidebar and public study links, not just home routes',()=>{
  expect(routes.length).toBeGreaterThan(200);
  expect(internal.length).toBeGreaterThan(150);
  expect(external.length).toBeGreaterThan(10);
  expect([...new Set([...internal,...external].filter(to=>!isKnownRoute(to,routes)))]).toEqual([]);
 });
 it('retains separate route guards for sensitive actor dashboards',()=>{
  expect(app).toContain('<AssessorR><IndependentMarkerQueue /></AssessorR>');
  expect(app).toContain('<QA><QualityAssessmentApproval /></QA>');
  expect(app).toContain('<StudentR><StudentReleasedResults /></StudentR>');
  expect(app).toContain('<ClassroomBoardR><LiveWhiteboard /></ClassroomBoardR>');
  expect(app).toContain('<LecturerR><LecturerAssessmentBriefs /></LecturerR>');
 });
});
