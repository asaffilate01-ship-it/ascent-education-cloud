import {afterEach,beforeEach,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import StaffTaskBoard from '@/components/StaffTaskBoard';
const state=vi.hoisted(()=>({role:'lecturer',rows:[] as any[],fail:false,writes:[] as any[]}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:{id:'teacher',tenantId:'centre',role:state.role}})}));
vi.mock('@/lib/db',()=>({db:{rpc:async()=>({data:[{user_id:'teacher',full_name:'Teacher One'},{user_id:'colleague',full_name:'Teacher Two'}]}),from:(table:string)=>{
 let value:any;const q:any={select:()=>q,eq:()=>q,in:()=>q,order:()=>q,limit:()=>q,insert:(v:any)=>{value=v;return q;},update:(v:any)=>{value=v;return q;},single:async()=>{state.writes.push(value);if(state.fail)return{error:{message:'conflict'}};state.rows=[{...value,version:1,updated_at:'2026-10-26'}];return{data:{id:value.id}};},then:(resolve:any)=>resolve({data:table==='unipathway_staff_tasks'?state.rows:[]})};return q;
}}}));
beforeEach(()=>{state.role='lecturer';state.rows=[];state.writes=[];state.fail=false;});afterEach(cleanup);
function show(){return render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><StaffTaskBoard/></QueryClientProvider>);}
it('creates an owned follow-up and confirms persistence before showing it',async()=>{
 show();await screen.findByText('No tasks match this view.');fireEvent.click(screen.getByRole('button',{name:'New task'}));
 fireEvent.change(screen.getByLabelText('Task',{exact:true}),{target:{value:'Prepare lesson pack'}});
 fireEvent.change(screen.getByLabelText('Owner'),{target:{value:'colleague'}});
 fireEvent.click(screen.getByRole('button',{name:'Save task'}));await screen.findByRole('heading',{name:'Prepare lesson pack'});
 expect(state.writes[0]).toMatchObject({created_by:'teacher',tenant_id:'centre',assigned_to:'colleague',status:'open'});
});
it('keeps the editor open when persistence is uncertain',async()=>{
 state.fail=true;show();fireEvent.click(screen.getByRole('button',{name:'New task'}));fireEvent.change(screen.getByLabelText('Task',{exact:true}),{target:{value:'Check the register'}});fireEvent.click(screen.getByRole('button',{name:'Save task'}));
 await screen.findByRole('alert');expect(screen.getByRole('button',{name:'Save task'})).toBeInTheDocument();expect(screen.queryByRole('heading',{name:'Check the register'})).toBeNull();
});
it('requires a reason when a task is blocked and hides the board from students',async()=>{
 show();fireEvent.click(screen.getByRole('button',{name:'New task'}));fireEvent.change(screen.getByLabelText('Task',{exact:true}),{target:{value:'Review outstanding work'}});fireEvent.change(screen.getByLabelText('Status'),{target:{value:'blocked'}});fireEvent.click(screen.getByRole('button',{name:'Save task'}));await screen.findByText(/Record the outcome or blocker/);expect(state.writes).toEqual([]);cleanup();state.role='student';show();expect(screen.queryByText('Follow-up tasks')).toBeNull();
});

it('searches only loaded, role-scoped follow-up tasks and explains the result count',async()=>{
 state.rows=[
  {id:'a',title:'Review OTHM coursework',detail:'Confirm unit feedback',assigned_to:'teacher',due_on:'2026-11-01',status:'open',priority:'normal'},
  {id:'b',title:'Check Qualifi moderation',detail:'Request assessor evidence',assigned_to:'colleague',due_on:'2026-11-02',status:'open',priority:'high'},
 ];
 show();await screen.findByRole('heading',{name:'Review OTHM coursework'});
 fireEvent.change(screen.getByRole('searchbox',{name:'Search loaded tasks'}),{target:{value:'Qualifi'}});
 expect(screen.queryByRole('heading',{name:'Review OTHM coursework'})).toBeNull();
 expect(screen.getByRole('heading',{name:'Check Qualifi moderation'})).toBeInTheDocument();
 expect(screen.getByRole('status')).toHaveTextContent('1 of 2 loaded tasks match');
 expect(screen.getByRole('status')).toHaveTextContent('up to 250 tasks');
});
it('does not reuse another active role’s previously cached task list',async()=>{
 const cache=new QueryClient({defaultOptions:{queries:{retry:false,staleTime:60000}}});
 state.rows=[{id:'teacher-a',title:'Lecturer-only task',detail:'Prepare lesson',assigned_to:'teacher',due_on:'2026-11-01',status:'open',priority:'normal'}];
 const view=render(<QueryClientProvider client={cache}><StaffTaskBoard/></QueryClientProvider>);
 await screen.findByRole('heading',{name:'Lecturer-only task'});
 state.role='centre_director';
 state.rows=[{id:'director-a',title:'Director-only task',detail:'Review centre records',assigned_to:'teacher',due_on:'2026-11-02',status:'open',priority:'high'}];
 view.rerender(<QueryClientProvider client={cache}><StaffTaskBoard/></QueryClientProvider>);
 expect(screen.queryByRole('heading',{name:'Lecturer-only task'})).toBeNull();
 await screen.findByRole('heading',{name:'Director-only task'});
 cache.clear();
});
