import {MemoryRouter} from 'react-router-dom';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {Library} from '@/pages/student/StudentLibrary';
const mock=vi.hoisted(()=>({tables:{} as Record<string,unknown>,signed:vi.fn()}));
vi.mock('@/components/layout/DashboardLayout',()=>({default:({children}:{children:React.ReactNode})=><main>{children}</main>}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:{id:'student',tenantId:'centre'}})}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{storage:{from:()=>({createSignedUrl:mock.signed})}}}));
vi.mock('@/lib/db',()=>({db:{from:(name:string)=>{const filters:Array<{key:string;values:unknown[]}>=[];const q:Record<string,unknown>={then:(resolve:(value:unknown)=>unknown)=>Promise.resolve(mock.tables[name]||{data:[]}).then(resolve)};for(const method of ['select','eq','order','limit','in','lte'])q[method]=()=>q;q.in=(key:string,values:unknown[])=>{filters.push({key,values});return q;};q.range=(from:number,to:number)=>{const r=mock.tables[name] as {data?:unknown[];error?:unknown}|undefined;return Promise.resolve({...r,data:r?.data?.filter(row=>filters.every(f=>f.values.includes((row as Record<string,unknown>)[f.key]))).slice(from,to+1)});};return q;}}}));
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

it('module navigation filters both materials and recordings without granting access',async()=>{
 render(<MemoryRouter><Library userId="student" tenantId="centre" moduleId="other"/></MemoryRouter>);
 await screen.findByText('No published resources match your library yet.');expect(screen.queryByText('Approved notes')).toBeNull();expect(screen.queryByText('Not enrolled notes')).toBeNull();expect(screen.queryByText('Released class')).toBeNull();
});
it('recording navigation selects released recordings for the enrolled module',async()=>{
 render(<MemoryRouter><Library userId="student" tenantId="centre" moduleId="m" initialKind="recording"/></MemoryRouter>);
 await screen.findByText('Released class');expect(screen.queryByText('Approved notes')).toBeNull();expect(screen.getByLabelText('Resource type')).toHaveValue('recording');
});

it('finds older authorised resources beyond 500 and paginates the displayed list',async()=>{
 mock.tables.unipathway_module_materials={data:Array.from({length:601},(_,i)=>({id:`a${i}`,module_id:'m',title:i===600?'Oldest authorised worksheet':`Worksheet ${i}`,kind:'document',object_path:`centre/m/${i}.pdf`}))};
 render(<Library userId="student" tenantId="centre"/>);
 await screen.findByRole('navigation',{name:'Library pages'});
 fireEvent.change(screen.getByLabelText('Search library'),{target:{value:'Oldest authorised'}});
 await screen.findByText('Oldest authorised worksheet');expect(screen.queryByText('Next resources')).toBeNull();
});
it('resolves a released recording from a class beyond the first 500 sessions',async()=>{
 mock.tables.live_class_sessions={data:Array.from({length:601},(_,i)=>({id:`s${i}`,title:`Class ${i}`,module_id:'m'}))};
 mock.tables.live_class_artifacts={data:[{id:'old',session_id:'s600',artifact_type:'recording',storage_reference:'centre/s600/old.mp4',available_at:'2020-01-01'}]};
 render(<Library userId="student" tenantId="centre" initialKind="recording"/>);
 await screen.findByText('Class 600');expect(screen.getAllByText('Get private access')).toHaveLength(1);
});

it('ignores a late private link after refresh while allowing a new access request',async()=>{
 let resolveOld:(value:unknown)=>void=()=>{};
 mock.signed.mockImplementationOnce(()=>new Promise(resolve=>{resolveOld=resolve;}));
 render(<Library userId="student" tenantId="centre"/>);await screen.findByText('Approved notes');
 fireEvent.click(screen.getAllByText('Get private access')[0]);
 fireEvent.click(screen.getByText('Refresh library'));await screen.findByText('Approved notes');
 mock.signed.mockResolvedValueOnce({data:{signedUrl:'https://storage.invalid/current'}});
 fireEvent.click(screen.getAllByText('Get private access')[0]);
 const link=await screen.findByRole('link',{name:'Open or download Approved notes'});
 expect(link).toHaveAttribute('href','https://storage.invalid/current');
 await act(async()=>{resolveOld({data:{signedUrl:'https://storage.invalid/stale'}});});
 expect(link).toHaveAttribute('href','https://storage.invalid/current');expect(screen.queryByRole('alert')).toBeNull();
});
it('suppresses an old access failure after the module scope changes',async()=>{
 let rejectOld:(reason:unknown)=>void=()=>{};
 mock.signed.mockImplementationOnce(()=>new Promise((_,reject)=>{rejectOld=reject;}));
 const view=render(<MemoryRouter><Library userId="student" tenantId="centre" moduleId="m"/></MemoryRouter>);
 await screen.findByText('Approved notes');fireEvent.click(screen.getAllByText('Get private access')[0]);
 view.rerender(<MemoryRouter><Library userId="student" tenantId="centre" moduleId="other"/></MemoryRouter>);
 await screen.findByText('No published resources match your library yet.');
 await act(async()=>{rejectOld(new Error('Old access denied'));});
 expect(screen.queryByRole('alert')).toBeNull();expect(screen.queryByRole('link',{name:/Open or download/})).toBeNull();
});
it('distinguishes filtered results and resets both filters with search focus',async()=>{
 render(<Library userId="student" tenantId="centre"/>);await screen.findByText('Approved notes');
 const input=screen.getByLabelText('Search library');
 fireEvent.change(input,{target:{value:'  Approved notes  '}});expect(screen.getByRole('status')).toHaveTextContent('1 of 2');
 fireEvent.change(screen.getByLabelText('Resource type'),{target:{value:'recording'}});
 expect(screen.getByText(/No resources match your filters/)).toBeInTheDocument();
 fireEvent.click(screen.getByText('Clear library filters'));
 expect(input).toHaveFocus();expect(input).toHaveValue('');expect(screen.getByLabelText('Resource type')).toHaveValue('all');
 expect(screen.getByRole('status')).toHaveTextContent('2 of 2');
});
