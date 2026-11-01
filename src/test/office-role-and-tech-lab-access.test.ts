import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {
 CAPABILITY_KEYS,STAFF_CAPABILITIES,STAFF_DEFAULTS,effectiveStaffPermissions,
 parseCapabilityOverrides,staffCan,staffRoleValid,UNIPATHWAY_SIGN_IN
} from '@/lib/staffPermissionProfiles';
import {READINESS_TRACKS,trackInternalEvidenceCount} from '@/lib/operationsReadinessCatalog';
describe('UniPathway office roles and per-person permissions',()=>{
 it('distinguishes three verified jobs and denies every unknown capability',()=>{
  expect(staffRoleValid('office_admin')).toBe(true);
  expect(staffRoleValid('hr_officer')).toBe(true);
  expect(staffRoleValid('secretary')).toBe(true);
  expect(staffRoleValid('superadmin')).toBe(false);
  expect(staffRoleValid('student')).toBe(false);
  expect(STAFF_CAPABILITIES.map(x=>x.key)).toEqual(CAPABILITY_KEYS);
  expect(UNIPATHWAY_SIGN_IN).toBe('https://unipathway.pk/login');
  for(const input of [null,[],{}, {superadmin:'allow'},{'finance.payments':'allow'},
   {staff_directory:'yes'},{'student.tech_lab':'allow'}, {view_own_tasks:'grant'}]){
    if(input&&typeof input==='object'&&!Array.isArray(input)&&!Object.keys(input).length)
     expect(parseCapabilityOverrides(input)).toEqual({});
    else expect(()=>parseCapabilityOverrides(input)).toThrow();
  }
 });
 it('allows explicit extra permissions and explicit denials without widening the cap allowlist',()=>{
  expect(STAFF_DEFAULTS.office_admin).toContain('invite_limited_staff');
  expect(STAFF_DEFAULTS.secretary).not.toContain('staff_directory');
  expect(staffCan('office_admin',{invite_limited_staff:'deny'},'invite_limited_staff')).toBe(false);
  expect(staffCan('secretary',{staff_directory:'allow'},'staff_directory')).toBe(true);
  expect(staffCan('hr_officer',{view_leave_summary:'deny'},'view_leave_summary')).toBe(false);
  for(const role of ['office_admin','hr_officer','secretary'] as const){
   expect(effectiveStaffPermissions(role,{}).every(c=>CAPABILITY_KEYS.includes(c))).toBe(true);
  }
 });
 it('does not add sensitive permissions for KYC, payments, identity or award issuance',()=>{
  const names=CAPABILITY_KEYS.join(',');
  for(const forbidden of ['superadmin','director','certificate','payment','KYC','grade','aws_key','identity','safeguard']){
   expect(names.toLowerCase()).not.toContain(forbidden.toLowerCase());
  }
 });
 it('links roles to own dashboard and independently verified manager review routes',()=>{
  const app=readFileSync('src/App.tsx','utf8');
  expect(app).toContain('<Route path="/office" element={<Office><OfficeStaffDashboard /></Office>} />');
  expect(app).toContain('<Route path="/director/staff-access" element={<Director><StaffAccessManager /></Director>} />');
  expect(app).toContain('<Route path="/landlord/staff-access" element={<Landlord><StaffAccessManager /></Landlord>} />');
  const roleGuard=readFileSync('src/components/RoleGuard.tsx','utf8');
  expect(roleGuard).toContain('activeRoleVerified(user)');
  expect(roleGuard).toContain('canUseActiveRole(user,allowed)');
 });
 it('uses only server-returned centre and effective capabilities, never a browser checkbox as authority',()=>{
  const dashboard=readFileSync('src/pages/office/OfficeStaffDashboard.tsx','utf8');
  const manager=readFileSync('src/pages/office/StaffAccessManager.tsx','utf8');
  expect(dashboard).toContain('VITE_UNIPATHWAY_OFFICE_ACCESS_ENABLED');
  expect(dashboard).toContain('get_my_unipathway_office_workspace');
  expect(dashboard).toContain('row.centreId===centre');
  expect(manager).toContain('set_unipathway_staff_access');
  expect(manager).toContain('p_expected_revision:current.revision');
  expect(manager).toContain('data.centreId!==tenant');
  expect(manager).not.toContain('.from(\'user_roles\').insert');
 });
 it('keeps permission override RPCs scoped, audited and manager-reviewed in a staged SQL patch',()=>{
  const sql=readFileSync('scripts/activation/unipathway-office-access-forward.sql','utf8');
  expect(sql).toContain('CREATE FUNCTION unipathway_acl.verified_office_role');
  expect(sql).toContain('user_id=auth.uid()');
  expect(sql).toContain('p_target=auth.uid()');
  expect(sql).toContain('staff_manager(v_tenant)');
  expect(sql).toContain('staff_permissions_changed');
  expect(sql).toContain('FOR SELECT TO authenticated');
  expect(sql).not.toContain('FOR ALL TO PUBLIC');
  const invitations=readFileSync('scripts/activation/unipathway-staff-invitations-forward.sql','utf8');
  expect(invitations).toContain("current_setting('request.jwt.claim.role',true) IS DISTINCT FROM 'service_role'");
  expect(invitations).toContain('v_manager');
  expect(invitations).toContain('p_permissions');
  expect(invitations).toContain('role::text NOT IN');
  const edge=readFileSync('supabase/functions/invite-staff/index.ts','utf8');
  expect(edge).toContain("UNIPATHWAY_STAFF_INVITES_ENABLED')!=='true'");
  expect(edge).toContain('https://unipathway.pk/reset-password');
  expect(edge).toContain('prepare_unipathway_account_invitation');
  expect(edge).toContain('complete_unipathway_account_invitation');
 });
});
describe('Tech course entitlements are per-module and per-student',()=>{
 it('blocks direct student lab routes unless the independent tech lab gate approves',()=>{
  const app=readFileSync('src/App.tsx','utf8');
  for(const path of ['/student/labs','/student/managed-labs']){
   expect(app).toMatch(new RegExp('<Route path="'+path+'" element=\\{<StudentR><TechLabAccessGate>'));
  }
  const gate=readFileSync('src/components/labs/TechLabAccessGate.tsx','utf8');
  expect(gate).toContain("user.role==='student'");
  expect(gate).toContain('my_unipathway_tech_lab_modules');
  expect(gate).toContain('VITE_UNIPATHWAY_TECH_LAB_ENTITLEMENTS_ENABLED');
 });
 it('requires active enrolment, approved module, per-student grant and current expiry in SQL',()=>{
  const sql=readFileSync('scripts/activation/unipathway-tech-lab-entitlements-forward.sql','utf8');
  expect(sql).toContain("e.status='active'");
  expect(sql).toContain('g.student_id=p_student');
  expect(sql).toContain('g.valid_until>now()');
  expect(sql).toContain('g.revoked_at IS NULL');
  expect(sql).toContain('AS RESTRICTIVE');
  expect(sql).toContain('check_my_unipathway_tech_lab');
  const gateway=readFileSync('supabase/functions/unipathway-aws-lab-gateway/index.ts','utf8');
  expect(gateway).toContain("UNIPATHWAY_TECH_LAB_ENTITLEMENTS_ENABLED')!=='true'");
  expect(gateway.match(/check_my_unipathway_tech_lab/g)?.length).toBe(2);
  expect(gateway.indexOf('check_my_unipathway_tech_lab')).toBeLessThan(gateway.indexOf('request_unipathway_managed_lab'));
 });
});
describe('Evidence-first compliance catalogue',()=>{
 it('covers all requested awarding bodies and teaching/lab services without manufactured accreditation',()=>{
  const labels=READINESS_TRACKS.map(x=>x.label).join(' ');
  for(const name of ['OTHM','Qualifi','ATHE','IAB','Pearson','Cambridge','FBISE','Rawalpindi','Lahore',
   'NAVTTC','PSDF','IELTS','German','Language lab','Cloud'])expect(labels).toContain(name);
  expect(READINESS_TRACKS.length).toBeGreaterThan(18);
  for(const track of READINESS_TRACKS){
   expect(track.requirements.length).toBeGreaterThan(1);
   expect(track.officialUrl.startsWith('https://')).toBe(true);
   const result=trackInternalEvidenceCount(track,[], 'centre-a');
   expect(result.recorded).toBe(0);expect(result.evidenced).toBe(0);
  }
 });
});
