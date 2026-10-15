import {render,screen,fireEvent,cleanup,waitFor,act} from '@testing-library/react';
import {afterEach,beforeEach,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({user:{id:'staff-1',tenantId:'centre-1',roles:['centre_director']},rows:vi.fn(),invoke:vi.fn(),rpc:vi.fn()}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:mocks.user})}));
vi.mock('@/lib/workflowRows',()=>({workflowRows:(...args:unknown[])=>mocks.rows(...args)}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{functions:{invoke:(...args:unknown[])=>mocks.invoke(...args)},rpc:(...args:unknown[])=>mocks.rpc(...args)}}));
import FactoryOperations from '@/components/progression/FactoryOperations';
import {factoryQueueState,factoryBatchResult,localProcessingCount,type FactoryQueueEvent} from '@/lib/factoryQueue';
const now=Date.parse('2026-10-15T12:00:00Z');
const row=(patch:Partial<FactoryQueueEvent>={}):FactoryQueueEvent=>({id:'event-1',event_type:'lab.completed',status:'pending',attempts:0,processed_at:'2026-10-15T10:00:00Z',created_at:'2026-10-15T10:00:00Z',exported_at:null,lease_until:null,next_attempt_at:'2026-10-15T10:00:00Z',factory_run_id:null,last_error:null,...patch});
afterEach(cleanup);beforeEach(()=>{vi.clearAllMocks();mocks.user={id:'staff-1',tenantId:'centre-1',roles:['centre_director']};mocks.rows.mockResolvedValue({data:[row()],error:null});});
it('matches lease, backoff and attempt limits without implying job completion',()=>{
 expect(factoryQueueState(row({processed_at:null}),now)).toBe('local');expect(factoryQueueState(row(),now)).toBe('ready');expect(factoryQueueState(row({status:'processing',attempts:10,lease_until:'2026-10-15T12:01:00Z'}),now)).toBe('leased');expect(factoryQueueState(row({status:'processing',attempts:10,lease_until:'2026-10-15T11:59:00Z'}),now)).toBe('attention');expect(factoryQueueState(row({status:'failed',next_attempt_at:'2026-10-15T12:01:00Z'}),now)).toBe('backoff');expect(factoryQueueState(row({status:'exported',attempts:10}),now)).toBe('accepted');
});
it('rejects malformed delivery counts instead of reporting successful delivery',()=>{
 for(const value of [null,{}, {accepted:9,failed:0,localProcessed:0},{accepted:3,failed:3,localProcessed:0},{accepted:-1,failed:0,localProcessed:0}])expect(()=>factoryBatchResult(value)).toThrow();expect(()=>localProcessingCount('100')).toThrow();expect(factoryBatchResult({accepted:2,failed:1,localProcessed:5}).accepted).toBe(2);
});
it('does not start delivery on page load and scopes metadata reads',async()=>{
 render(<FactoryOperations/>);await screen.findByText('lab.completed');expect(mocks.invoke).not.toHaveBeenCalled();expect(mocks.rows.mock.calls[0][2]).toBe('centre-1');expect(mocks.rows.mock.calls[0][4]).not.toContain('payload');expect(mocks.rows.mock.calls[0][4]).not.toContain('student_id');
});
it('reports local processing when Factory credentials are missing',async()=>{
 mocks.invoke.mockResolvedValue({data:null,error:{context:{status:409,json:async()=>({localProcessed:3})}}});render(<FactoryOperations/>);await screen.findByText('lab.completed');fireEvent.click(screen.getByRole('button',{name:'Deliver next Factory batch'}));expect(await screen.findByRole('alert')).toHaveTextContent('3 events were processed locally. No delivery was attempted');expect(mocks.invoke).toHaveBeenCalledWith('omniqora-factory-dispatch',{body:{tenantId:'centre-1'}});
});
it('prevents duplicate dispatch clicks and rejects a malformed success response',async()=>{
 let finish:(r:unknown)=>void=()=>{};mocks.invoke.mockReturnValue(new Promise(resolve=>{finish=resolve;}));render(<FactoryOperations/>);await screen.findByText('lab.completed');const button=screen.getByRole('button',{name:'Deliver next Factory batch'});fireEvent.click(button);fireEvent.click(button);expect(mocks.invoke).toHaveBeenCalledTimes(1);await act(async()=>finish({data:{accepted:99,failed:0,localProcessed:0},error:null}));expect(await screen.findByRole('alert')).toHaveTextContent('could not be confirmed');
});
it('discards old-centre rows and suppresses an old-centre operation result',async()=>{
 let finish:(r:unknown)=>void=()=>{};mocks.invoke.mockReturnValue(new Promise(resolve=>{finish=resolve;}));const view=render(<FactoryOperations/>);await screen.findByText('lab.completed');fireEvent.click(screen.getByRole('button',{name:'Deliver next Factory batch'}));mocks.rows.mockResolvedValue({data:[row({id:'new-event',event_type:'new.centre'})],error:null});mocks.user={...mocks.user,tenantId:'centre-2'};view.rerender(<FactoryOperations/>);await screen.findByText('new.centre');await act(async()=>finish({data:{accepted:1,failed:0,localProcessed:0},error:null}));expect(screen.queryByText(/1 accepted by Factory/)).not.toBeInTheDocument();expect(screen.queryByText('lab.completed')).not.toBeInTheDocument();
});
it('blocks processors on queue-load errors',async()=>{mocks.rows.mockResolvedValue({data:[],error:{message:'denied'}});render(<FactoryOperations/>);await screen.findByRole('alert');expect(screen.getByRole('button',{name:'Process local signals'})).toBeDisabled();expect(screen.getByRole('button',{name:'Deliver next Factory batch'})).toBeDisabled();});
it('does not query or expose the queue to learners',()=>{mocks.user.roles=['student'];render(<FactoryOperations/>);expect(mocks.rows).not.toHaveBeenCalled();expect(screen.queryByText('Factory event connection')).not.toBeInTheDocument();});
it('describes local processing as event ingestion rather than score calculation',async()=>{mocks.rpc.mockResolvedValue({data:2,error:null});render(<FactoryOperations/>);await screen.findByText('lab.completed');fireEvent.click(screen.getByRole('button',{name:'Process local signals'}));await waitFor(()=>expect(screen.getByText(/2 events added to the local event log/)).toHaveTextContent('does not calculate new intelligence scores'));});
