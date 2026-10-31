import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {cleanup,render,screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {readFileSync} from 'node:fs';
const state=vi.hoisted(()=>({user:{id:'partner',tenantId:'centre-a',role:'university_partner',roles:['university_partner']} as any}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:state.user})}));
vi.mock('@/components/layout/DashboardLayout',()=>({default:({children,title}:{children:React.ReactNode;title:string})=><main><h1>{title}</h1>{children}</main>}));
import UniversityPartnerPortal from '@/pages/partner/UniversityPartnerPortal';
beforeEach(()=>{state.user={id:'partner',tenantId:'centre-a',role:'university_partner',roles:['university_partner']};});
afterEach(cleanup);
it('does not show any student names or offers without verified institutional ownership',()=>{
 render(<MemoryRouter initialEntries={['/partner/applications']}><UniversityPartnerPortal/></MemoryRouter>);
 expect(screen.getByRole('heading',{name:'Institution-level access not yet verified'})).toBeInTheDocument();
 expect(screen.queryByRole('button',{name:/Confirm Enrolment|Conditional Offer|Start Review/})).toBeNull();
 expect(screen.getByText(/not displaying student applications, private assessment records/)).toBeInTheDocument();
 expect(screen.getByRole('link',{name:'Commissions'})).toHaveAttribute('href','/partner/commissions');
});
it('a secondary inactive university role cannot open the partner content',()=>{
 state.user={id:'student',tenantId:'centre-a',role:'student',roles:['student','university_partner']};
 render(<MemoryRouter><UniversityPartnerPortal/></MemoryRouter>);
 expect(screen.getByRole('alert')).toHaveTextContent('active verified university partner role');
 expect(screen.queryByRole('heading',{name:'Institution-level access not yet verified'})).toBeNull();
});
it('all partner routes remain separate but cannot read general applications or invoices',()=>{
 const app=readFileSync('src/App.tsx','utf8');
 const code=readFileSync('src/pages/partner/UniversityPartnerPortal.tsx','utf8');
 for(const route of ['referrals','applications','offers','commissions'])
  expect(app).toContain('path="/partner/'+route+'"');
 expect(app).toContain('path="/partner/commissions" element={<PartnerR><UniversityPartnerPortal /></PartnerR>}');
 expect(code).not.toContain("from('applications')");
 expect(code).not.toContain("useSupabaseQuery('applications'");
 expect(code).not.toContain("from('invoices')");
 expect(code).not.toContain("from('referral_income')");
 expect(code).not.toContain(".update({ stage:");
 expect(code).not.toContain("handleUpdateStage");
});
