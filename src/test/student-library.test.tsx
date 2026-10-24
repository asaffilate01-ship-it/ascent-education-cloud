import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {Library} from '@/pages/student/StudentLibrary';
const mock=vi.hoisted(()=>({tables:{} as Record<string,unknown>,signed:vi.fn()}));
vi.mock('@/components/layout/DashboardLayout',()=>({default:({children}:{children:React.ReactNode})=><main>{children}</main>}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:{id:'student',tenantId:'centre'}})}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{storage:{from:()=>({createSignedUrl:mock.signed})}}}));
vi.mock('@/lib/db',()=>({db:{from:(name:string)=>{const q:Record<string,unknown>={then:(resolve:(value:unknown)=>unknown)=>Promise.resolve(mock.tables[name]||{data:[]}).then(resolve)};for(const method of ['select','eq','order','limit','in','lte'])q[method]=()=>q;return q;}}}));
afterEach(cleanup);beforeEach(()=>{mock.signed.mockReset();mock.tables={student_enrolments:{data:[{programme_id:'p'}]},modules:{data:[{id:'m',title:'Maths',programme_id:'p'},{id:'other',title:'Other',programme_id:'not-enrolled'}]},unipathway_module_materials:{data:[{id:'a',module_id:'m',title:'Approved notes',kind:'document',object_path:'centre/m/a.pdf'},{id:'b',module_id:'other',title:'Not enrolled notes',kind:'document',object_path:'secret'}]},live_class_sessions:{data:[{id:'s',title:'Released class',module_id:'m'}]},live_class_artifacts:{data:[{id:'r',session_id:'s',artifact_type:'recording',storage_reference:'centre/s/r.mp4',available_at:'2020-01-01'}]}};});
it('shows enrolled real resources and obtains short lived links only on request',async()=>{
 mock.signed.mockResolvedValue({data:{signedUrl:'https://storage.invalid/private'}});render(<Library userId="student" tenantId="centre"/>);
 await screen.findByText('Approved notes');expect(screen.queryByText('Not enrolled notes')).toBeNull();expect(screen.getByText('Released class')).toBeInTheDocument();expect(mock.signed).not.toHaveBeenCalled();
 fireEvent.click(screen.getAllByText('Get private access')[0]);await screen.findByRole('link',{name:'Open or download Approved notes'});expect(mock.signed).toHaveBeenCalledWith('centre/m/a.pdf',120);
});
it('reports query and signed-access failures without demo fallback',async()=>{
 mock.tables.modules={error:{message:'denied'}};render(<Library userId="student" tenantId="centre"/>);await screen.findByRole('alert');expect(screen.queryByText('Approved notes')).toBeNull();
 mock.tables.modules={data:[{id:'m',title:'Maths',programme_id:'p'}]};fireEvent.click(screen.getByText('Refresh library'));await screen.findByText('Approved notes');mock.signed.mockResolvedValue({error:{message:'revoked'}});fireEvent.click(screen.getAllByText('Get private access')[0]);await waitFor(()=>expect(screen.getByRole('alert')).toHaveTextContent('no longer available'));expect(screen.queryByRole('link')).toBeNull();
});
