import {render,screen,fireEvent,cleanup,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({roles:['admissions_admin'],read:vi.fn(),insert:vi.fn(),update:vi.fn(),single:vi.fn(),eq:vi.fn(),success:vi.fn(),error:vi.fn()}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:{id:'staff-1',tenantId:'tenant-1',roles:mocks.roles}})}));
vi.mock('sonner',()=>({toast:{success:mocks.success,error:mocks.error}}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{from:()=>{
 const chain={select:()=>chain,eq:(...args:unknown[])=>{mocks.eq(...args);return chain;},order:()=>chain,range:()=>mocks.read(),insert:(value:unknown)=>mocks.insert(value),update:(value:unknown)=>{mocks.update(value);return chain;},maybeSingle:()=>mocks.single()};return chain;
}}}));
import SupportTasks from '@/components/progression/SupportTasks';
const task={id:'task-1',title:'Confirm arrival arrangements',task_type:'arrival',status:'pending',notes:'Use the LMS',due_at:'2020-01-01T10:00:00Z',completed_at:null,updated_at:'2026-10-15T12:00:00.123456Z'};
afterEach(cleanup);beforeEach(()=>{vi.clearAllMocks();mocks.roles=['admissions_admin'];mocks.read.mockResolvedValue({data:[task],error:null});});
async function open(student=false){render(<SupportTasks tenant="tenant-1" application="application-1" student={student}/>);fireEvent.click(screen.getByRole('button',{name:'View support tasks'}));await screen.findByText(task.title);}
describe('Application support workflow',()=>{
 it('shows learner instructions without mutation controls',async()=>{mocks.roles=['student'];await open(true);expect(screen.getByText('Use the LMS')).toBeInTheDocument();expect(screen.queryByRole('button',{name:'Complete'})).not.toBeInTheDocument();expect(screen.queryByRole('button',{name:'Add support task'})).not.toBeInTheDocument();expect(mocks.eq).toHaveBeenCalledWith('application_id','application-1');expect(mocks.eq).toHaveBeenCalledWith('tenant_id','tenant-1');});
 it('creates a task with case, tenant and authenticated owner',async()=>{mocks.insert.mockResolvedValue({error:null});await open();fireEvent.change(screen.getByRole('textbox',{name:'Task title'}),{target:{value:'Confirm accommodation'}});fireEvent.submit(screen.getByRole('button',{name:'Add support task'}).closest('form')!);await waitFor(()=>expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({tenant_id:'tenant-1',application_id:'application-1',owner_id:'staff-1',title:'Confirm accommodation'})));});
 it('refuses to claim success when a task changed concurrently',async()=>{mocks.single.mockResolvedValue({data:null,error:null});await open();fireEvent.click(screen.getByRole('button',{name:'Complete'}));await waitFor(()=>expect(mocks.error).toHaveBeenCalledWith(expect.stringContaining('task changed')));expect(mocks.eq).toHaveBeenCalledWith('updated_at',task.updated_at);expect(mocks.success).not.toHaveBeenCalled();});
 it('fails closed when task loading fails',async()=>{mocks.read.mockResolvedValue({data:null,error:{message:'denied'}});render(<SupportTasks tenant="tenant-1" application="application-1"/>);fireEvent.click(screen.getByRole('button',{name:'View support tasks'}));expect(await screen.findByRole('alert')).toHaveTextContent('could not be loaded');expect(screen.queryByRole('button',{name:'Add support task'})).not.toBeInTheDocument();});
});
