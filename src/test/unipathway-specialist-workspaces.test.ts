import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
const src=(path:string)=>readFileSync(path,'utf8');

describe('UniPathway director and office workflow separation',()=>{
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
