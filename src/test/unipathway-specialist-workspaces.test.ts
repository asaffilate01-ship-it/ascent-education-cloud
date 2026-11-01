import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
const src=(path:string)=>readFileSync(path,'utf8');

describe('UniPathway director and office workflow separation',()=>{
 it('does not allow old management memberships to bypass CCTV centre isolation',()=>{
  const camera=src('src/pages/security/SecurityWorkspace.tsx');
  expect(camera).toContain('user.roles?.includes(user.role)');
  expect(camera).toContain(".eq('tenant_id',user!.tenantId!).order('name')");
  expect(camera).toContain(".eq('id',c.id).eq('tenant_id',user!.tenantId!)");
  expect(camera).toContain("to-from>86_400_000");
  expect(camera).toContain("stream.protocol!=='https:'");
  expect(camera).not.toContain("user?.roles.some(r=>['superadmin'");
 });
 it('never opens the personal agent dashboard as a Centre Director',()=>{
  const app=src('src/App.tsx');
  expect(app).toContain('<Route path="/director/agents" element={<Director><DirectorAgentAllocationOverview /></Director>} />');
  expect(app).not.toContain('<Director><AgentDashboard /></Director>');
  const director=src('src/pages/director/DirectorAgentAllocationOverview.tsx');
  expect(director).toContain("select:'id,tenant_id,agent_id,stage'");
  expect(director).toContain("filters:[{column:'tenant_id',operator:'eq'");
  expect(director).not.toMatch(/invoices|email|phone|student_name/);
  expect(director).toContain("user.roles?.includes(user.role)");
  expect(director).toContain("Review applicant pipeline");
 });
 it('keeps marketing analytics separate from private admissions CRM actions',()=>{
  const app=src('src/App.tsx');
  expect(app).toContain('<Route path="/marketing/leads" element={<Marketing><MarketingLeadInsights /></Marketing>} />');
  expect(app).not.toContain('<Marketing><AdmissionsCRM /></Marketing>');
  const insights=src('src/pages/marketing/MarketingLeadInsights.tsx');
  expect(insights).toContain("select:'id,tenant_id,stage,source,created_at,programme_name'");
  expect(insights).toContain("filters:[{column:'tenant_id',operator:'eq'");
  expect(insights).toContain('enabled:permitted');
  expect(insights).not.toMatch(/student_name|email:|phone:|kyc_documents|invoices|\.insert\(/);
 });
 it('checks personal office compliance permission with a real backend response',()=>{
  const app=src('src/App.tsx');
  expect(app).toContain('<Route path="/office/compliance-preparation" element={<Office><OfficeCompliancePreparation /></Office>} />');
  const prep=src('src/pages/office/OfficeCompliancePreparation.tsx');
  expect(prep).toContain('VITE_UNIPATHWAY_OFFICE_ACCESS_ENABLED');
  expect(prep).toContain("get_my_unipathway_office_workspace");
  expect(prep).toContain("p_role:role");
  expect(prep).toContain("record.centreId!==tenant");
  expect(prep).toContain("record.role!==role");
  expect(prep).toContain("record.capabilities.includes('prepare_compliance')");
  expect(prep).not.toMatch(/\.insert\(|\.update\(|\.upsert\(/);
  expect(prep).toContain('No records have been loaded or changed.');
 });
});
