import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {readFileSync} from 'node:fs';
import {settingsCapabilities,settingsIntegrationEvidence} from '@/lib/settingsAccess';
import SettingsOperationalPanels from '@/components/settings/SettingsOperationalPanels';
import type {UserRole} from '@/types/platform';

const mock=vi.hoisted(()=>({
 user:{id:'director',tenantId:'centre-a',role:'centre_director' as UserRole,roles:['centre_director'] as UserRole[]},
 from:vi.fn(),
}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:mock.user}),ROLE_LABELS:{centre_director:'Centre Director',superadmin:'Platform Owner',student:'Student',finance_officer:'Finance Officer'}}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{from:mock.from}}));
vi.mock('@/lib/db',()=>({db:{from:mock.from}}));

const now=Date.parse('2026-11-28T12:00:00Z');
const provider=(changes:Record<string,unknown>={})=>({
 id:'teams-1',tenant_id:'centre-a',integration_key:'microsoft_education',category:'teaching',required_for_launch:true,status:'healthy',last_health_at:'2026-11-28T11:00:00Z',last_error:null,...changes
});
const director={id:'director',tenantId:'centre-a',role:'centre_director' as const,roles:['centre_director'] as const};
const mount=(area:'general'|'branding'|'integrations'|'data')=>render(<MemoryRouter><SettingsOperationalPanels area={area}/></MemoryRouter>);
beforeEach(()=>{
 mock.user={id:'director',tenantId:'centre-a',role:'centre_director',roles:['centre_director']};
 mock.from.mockReset();
});
afterEach(cleanup);

describe('settings scope and operational evidence',()=>{
 it('never enables leadership actions through secondary or unverified memberships',()=>{
  expect(settingsCapabilities({...director,role:'student',roles:['student','centre_director']})).toMatchObject({integrations:false,branding:false,users:false,data:false,financePath:null});
  expect(settingsCapabilities({...director,roles:[]})).toMatchObject({role:null,leadership:false});
  expect(settingsCapabilities({...director,tenantId:null})).toMatchObject({integrations:false,users:false,studentPath:null,financePath:null,brandingPath:null});
  expect(settingsCapabilities({...director,role:'superadmin',roles:['superadmin'],tenantId:null})).toMatchObject({brandingPath:'/landlord/centres',integrations:false});
  expect(settingsCapabilities({...director,role:'finance_officer',roles:['finance_officer']})).toMatchObject({data:true,financePath:'/finance',studentPath:null,integrations:false,auditPath:null});
 });
 it('accepts only current scoped health evidence and never assumes connection from stale or configured records',()=>{
  expect(settingsIntegrationEvidence([provider()],'centre-a',now)[0]).toMatchObject({name:'Microsoft Teams Education',current:true,status:'Health verified within 24 hours'});
  expect(settingsIntegrationEvidence([provider({last_health_at:'2026-11-27T11:00:00Z'})],'centre-a',now)[0]).toMatchObject({current:false,status:'Verification expired or invalid'});
  expect(settingsIntegrationEvidence([provider({status:'configured'})],'centre-a',now)[0].current).toBe(false);
  expect(settingsIntegrationEvidence([provider({last_health_at:'2026-11-29T11:00:00Z'})],'centre-a',now)[0].checkedAt).toBeNull();
  expect(settingsIntegrationEvidence([provider({status:'__proto__'})],'centre-a',now)[0].status).toContain('Unrecognised');
  expect(()=>settingsIntegrationEvidence([provider({tenant_id:'centre-b'})],'centre-a',now)).toThrow();
  expect(()=>settingsIntegrationEvidence([provider(),provider({id:'other'})],'centre-a',now)).toThrow();
 });
 it('reads recorded providers with an explicit centre filter and recovers from failed reads',async()=>{
  const records=[provider({last_health_at:new Date(Date.now()-60000).toISOString()}),provider({id:'payments',integration_key:'institutional_payments',required_for_launch:false,status:'configured',last_health_at:null})];
  const range=vi.fn().mockResolvedValueOnce({data:null,error:{message:'Unavailable'}}).mockResolvedValueOnce({data:records,error:null});
  const order=vi.fn(()=>({range})),eq=vi.fn(()=>({order})),select=vi.fn(()=>({eq}));
  mock.from.mockReturnValue({select});
  mount('integrations');
  expect(await screen.findByRole('alert')).toHaveTextContent('Provider evidence could not be verified');
  expect(screen.queryByText('Current health evidence')).toBeNull();
  fireEvent.click(screen.getByRole('button',{name:'Refresh records'}));
  expect(await screen.findByText('Microsoft Teams Education')).toBeInTheDocument();
  expect(screen.getByText('Configured — health unverified')).toBeInTheDocument();
  expect(eq).toHaveBeenCalledWith('tenant_id','centre-a');
  fireEvent.click(screen.getByRole('button',{name:'Required only'}));
  expect(screen.queryByText('Institutional payments')).toBeNull();
  fireEvent.change(screen.getByLabelText('Find an integration'),{target:{value:'nonexistent'}});
  expect(screen.getByText('No records match the filters.')).toBeInTheDocument();
 });
 it('does not query provider records for an active student role',()=>{
  mock.user={id:'student',tenantId:'centre-a',role:'student',roles:['student','centre_director']};
  mount('integrations');
  expect(screen.getByRole('status')).toHaveTextContent('verified centre leadership role');
  expect(mock.from).not.toHaveBeenCalled();
 });
 it('routes finance staff to scoped reports without offering broad student exports',()=>{
  mock.user={id:'finance',tenantId:'centre-a',role:'finance_officer',roles:['finance_officer']};
  mount('data');
  expect(screen.getByRole('link',{name:'Open finance reporting'})).toHaveAttribute('href','/finance');
  expect(screen.queryByRole('link',{name:'Open student registry'})).toBeNull();
  expect(mock.from).not.toHaveBeenCalled();
 });
 it('uses recorded centre identity rather than a fabricated default or an unwired save button',async()=>{
  mock.from.mockReturnValue({select:()=>({eq:()=>({maybeSingle:async()=>({data:{id:'centre-a',name:'Synthetic Jhelum centre',brand_name:'UniPathway'},error:null})})})});
  mount('general');
  expect(await screen.findByText('Synthetic Jhelum centre')).toBeInTheDocument();
  expect(screen.getByRole('link',{name:'Manage centre identity'})).toHaveAttribute('href','/director/branding');
  expect(screen.queryByRole('button',{name:'Save Changes'})).toBeNull();
 });
 it('removes superseded direct writes, unscoped exports and hard-coded connection/compliance claims',()=>{
  const source=readFileSync('src/pages/settings/SettingsPage.tsx','utf8');
  for(const obsolete of ['UniPathway Lahore','Jitsi Meet','connected: true','GDPR Compliant','handleSaveBranding','students-export-','invoices-export-'])expect(source).not.toContain(obsolete);
  expect(source).toContain('SettingsOperationalPanels area="integrations"');
  expect(source).toContain('Profile update verified');
  expect(source).toContain('Notification preferences verified');
  expect(source).toContain('INSTITUTIONAL_MIN_PASSWORD');
 });
});
