import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {MemoryRouter} from 'react-router-dom';
import ModuleMaterials from '@/pages/learning/ModuleMaterials';
const mock=vi.hoisted(()=>({user:{id:'student',tenantId:'centre',role:'student',roles:['student']},tables:{} as Record<string,Record<string,unknown>[]>,failPage:false,ranges:[] as number[],rights:null as null|{review_status:string;expires_at:string|null},signed:vi.fn(),updated:vi.fn(),success:vi.fn(),error:vi.fn()}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:mock.user})}));
vi.mock('@/components/layout/DashboardLayout',()=>({default:({children}:{children:React.ReactNode})=><main>{children}</main>}));
vi.mock('@/components/assessment/ModuleJourney',()=>({default:()=>null}));
vi.mock('sonner',()=>({toast:{success:mock.success,error:mock.error}}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{storage:{from:()=>({createSignedUrl:mock.signed})}}}));
vi.mock('@/lib/db',()=>({db:{from:(table:string)=>{const filters:((r:Record<string,unknown>)=>boolean)[]=[];const q={select:()=>q,eq:(key:string,value:unknown)=>{filters.push(r=>r[key]===value);return q;},in:(key:string,ids:string[])=>{filters.push(r=>ids.includes(r[key] as string));return q;},order:()=>q,update:()=>q,single:()=>mock.updated(),maybeSingle:async()=>({data:mock.rights,error:null}),range:async(a:number,b:number)=>{if(table==='unipathway_module_materials'){mock.ranges.push(a);if(mock.failPage&&a>=250)return {data:null,error:{message:'offline'}};}return {data:(mock.tables[table]||[]).filter(r=>filters.every(f=>f(r))).slice(a,b+1),error:null};}};return q;}}}));
const material=(id:number)=>({id:String(id),tenant_id:'centre',module_id:'module',title:`Resource ${id}`,kind:'reading',object_path:`private/${id}`,publication_status:'published',available_at:null,created_at:'2026-01-01'});
beforeEach(()=>{vi.clearAllMocks();mock.user={id:'student',tenantId:'centre',role:'student',roles:['student']};mock.failPage=false;mock.ranges=[];mock.rights=null;mock.tables={modules:[{id:'module',tenant_id:'centre',programme_id:'programme',lecturer_id:'teacher',title:'Mathematics'}],student_enrolments:[{id:'enrolment',tenant_id:'centre',student_id:'student',programme_id:'programme',status:'active'}],unipathway_module_materials:[material(1)]};});afterEach(()=>{cleanup();vi.unstubAllEnvs();});
const mount=()=>render(<MemoryRouter><ModuleMaterials/></MemoryRouter>);
it('searches resources beyond the old cap and paginates the complete history',async()=>{
 mock.tables.unipathway_module_materials=Array.from({length:351},(_,i)=>material(i));mount();await screen.findByText('Page 1 of 18');expect(mock.ranges).toEqual([0,250]);expect(screen.getAllByRole('article')).toHaveLength(20);
 fireEvent.change(screen.getByLabelText('Search materials'),{target:{value:'Resource 350'}});expect(screen.getByRole('heading',{name:'Resource 350'})).toBeInTheDocument();expect(screen.getAllByRole('article')).toHaveLength(1);
});
it('hides partial or old records on failure and recovers with refresh',async()=>{
 mock.tables.unipathway_module_materials=Array.from({length:300},(_,i)=>material(i));mock.failPage=true;mount();await screen.findByRole('alert');expect(screen.queryAllByRole('article')).toHaveLength(0);
 mock.failPage=false;fireEvent.click(screen.getByText('Refresh materials'));await screen.findByText('Page 1 of 15');mock.failPage=true;fireEvent.click(screen.getByText('Refresh materials'));expect(screen.queryAllByRole('article')).toHaveLength(0);await screen.findByRole('alert');
});
it('only shows released materials for enrolled students',async()=>{
 mock.tables.unipathway_module_materials=[material(1),{...material(2),publication_status:'draft'},{...material(3),available_at:'2099-01-01'},{...material(4),module_id:'other'}];mount();await screen.findByRole('heading',{name:'Resource 1'});expect(screen.getAllByRole('article')).toHaveLength(1);expect(screen.queryByText('Publish')).toBeNull();
});
it('leaves draft publishing disabled when the independent rights registry is not activated',async()=>{
 mock.user={id:'teacher',tenantId:'centre',role:'lecturer',roles:['lecturer']};
 mock.tables.unipathway_module_materials=[{...material(1),publication_status:'draft'}];
 mount();const publish=await screen.findByRole('button',{name:'Publish'});
 expect(publish).toBeDisabled();
 expect(screen.getByRole('button',{name:'Rights evidence'})).toBeDisabled();
 expect(mock.updated).not.toHaveBeenCalled();
});
it('does not claim publication when the verified backend update confirms no changed row',async()=>{
 vi.stubEnv('VITE_UNIPATHWAY_COURSE_REGISTRY_ENABLED','true');
 mock.user={id:'teacher',tenantId:'centre',role:'lecturer',roles:['lecturer']};
 mock.rights={review_status:'approved',expires_at:null};
 mock.tables.unipathway_module_materials=[{...material(1),publication_status:'draft'}];
 mock.updated.mockResolvedValue({data:null,error:null});
 mount();fireEvent.click(await screen.findByRole('button',{name:'Publish'}));
 await waitFor(()=>expect(mock.error).toHaveBeenCalledWith(expect.stringContaining('Release could not be confirmed')));
 expect(mock.success).not.toHaveBeenCalled();
});
it('does not attempt publication without independently approved current rights',async()=>{
 vi.stubEnv('VITE_UNIPATHWAY_COURSE_REGISTRY_ENABLED','true');
 mock.user={id:'teacher',tenantId:'centre',role:'lecturer',roles:['lecturer']};
 mock.tables.unipathway_module_materials=[{...material(1),publication_status:'draft'}];
 mount();fireEvent.click(await screen.findByRole('button',{name:'Publish'}));
 await waitFor(()=>expect(mock.error).toHaveBeenCalledWith(expect.stringContaining('Release could not be confirmed')));
 expect(mock.updated).not.toHaveBeenCalled();
});
it('does not open a late private link after switching account',async()=>{
 let finish!:(v:unknown)=>void;mock.signed.mockReturnValueOnce(new Promise(resolve=>{finish=resolve;}));const close=vi.fn(),replace=vi.fn();const open=vi.spyOn(window,'open').mockImplementation(()=>({opener:null,close,location:{replace}} as unknown as Window));const view=mount();fireEvent.click(await screen.findByText('Open'));
 mock.user={id:'other',tenantId:'centre',role:'student',roles:['student']};view.rerender(<MemoryRouter><ModuleMaterials/></MemoryRouter>);await act(async()=>finish({data:{signedUrl:'https://example.test/private'},error:null}));expect(open).toHaveBeenCalledWith('about:blank','_blank');expect(replace).not.toHaveBeenCalled();expect(close).toHaveBeenCalled();expect(screen.queryByRole('heading',{name:'Resource 1'})).toBeNull();open.mockRestore();
});
it('opens the exact search result and offers a return to all materials in that module',async()=>{
 mock.tables.unipathway_module_materials=[material(1),material(2)];render(<MemoryRouter initialEntries={['/student/materials?module=module&material=2']}><ModuleMaterials/></MemoryRouter>);
 await screen.findByRole('heading',{name:'Resource 2'});expect(screen.queryByRole('heading',{name:'Resource 1'})).toBeNull();fireEvent.click(screen.getByText('Show all module materials'));await screen.findByRole('heading',{name:'Resource 1'});expect(screen.getAllByRole('article')).toHaveLength(2);
});
it('does not reveal an unavailable material supplied in a search URL',async()=>{
 render(<MemoryRouter initialEntries={['/student/materials?module=module&material=unavailable']}><ModuleMaterials/></MemoryRouter>);await screen.findByText(/This material is no longer available/);expect(screen.queryByText('Open')).toBeNull();expect(mock.signed).not.toHaveBeenCalled();
});

it('requires the active lecturer role even for accounts with a second lecturer assignment',async()=>{
 mock.user={id:'teacher',tenantId:'centre',role:'student',roles:['student','lecturer']};
 mock.tables.unipathway_module_materials=[{...material(1),publication_status:'draft'}];
 mount();await screen.findByText(/No released materials/);
 expect(screen.queryByRole('heading',{name:'Upload teaching material'})).toBeNull();
 expect(screen.queryByText('Publish')).toBeNull();
});
it('requires a teaching-content rights acknowledgement before offering a secure draft upload',async()=>{
 mock.user={id:'teacher',tenantId:'centre',role:'lecturer',roles:['lecturer']};
 mount();await screen.findByText('Upload teaching material');
 const save=screen.getByRole('button',{name:'Save secure draft'});
 expect(save).toBeDisabled();
 fireEvent.click(screen.getByRole('checkbox',{name:'Confirm teaching material distribution rights'}));
 expect(save).toBeEnabled();
 fireEvent.click(save);
 await waitFor(()=>expect(mock.error).toHaveBeenCalledWith(expect.stringContaining('distribution rights')));
});
