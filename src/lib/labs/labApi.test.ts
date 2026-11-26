import {act,renderHook,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {writeScopedLabSession,type LabScope} from './labScope';

const mocks=vi.hoisted(()=>({from:vi.fn(),rpc:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:mocks}));
import {myAttempts,useLiveLab} from './labApi';

const scope:LabScope={id:'learner-a',tenantId:'centre-a',role:'student'};
const id='12345678-1234-4234-8234-123456789abc';
const row={id,tenant_id:scope.tenantId,kind:'tech',status:'live',title:'Class'};
function query(result:Promise<unknown>){
 const q={select:vi.fn(),eq:vi.fn(),order:vi.fn(),limit:vi.fn(()=>result),maybeSingle:vi.fn(()=>result)};
 q.select.mockReturnValue(q);q.eq.mockReturnValue(q);q.order.mockReturnValue(q);
 mocks.from.mockReturnValue(q);
 return q;
}
beforeEach(()=>{vi.resetAllMocks();sessionStorage.clear();mocks.rpc.mockResolvedValue({data:null,error:null});});
afterEach(()=>sessionStorage.clear());
describe('lab API centre containment',()=>{
 it('filters history and rejects a mixed-centre response',async()=>{
  const attempt={user_id:scope.id,tenant_id:scope.tenantId,lab_kind:'tech'};
  const q=query(Promise.resolve({data:[attempt],error:null}));
  expect(await myAttempts(scope.id,scope.tenantId,'tech')).toEqual([attempt]);
  expect(q.eq).toHaveBeenCalledWith('user_id',scope.id);
  expect(q.eq).toHaveBeenCalledWith('tenant_id',scope.tenantId);
  query(Promise.resolve({data:[attempt,{...attempt,tenant_id:'centre-b'}],error:null}));
  await expect(myAttempts(scope.id,scope.tenantId,'tech')).rejects.toThrow('could not be verified');
 });
 it('does not send presence before restoring a verified live session',async()=>{
  writeScopedLabSession(sessionStorage,'tech',scope,id);
  let finish:(value:unknown)=>void=()=>{};
  const q=query(new Promise(resolve=>{finish=resolve;}));
  const hook=renderHook(()=>useLiveLab('tech',scope));
  await act(async()=>{await hook.result.current.sendPresence({activity:'practice'});});
  expect(mocks.rpc).not.toHaveBeenCalled();
  expect(q.eq).toHaveBeenCalledWith('tenant_id',scope.tenantId);
  await act(async()=>{finish({data:row,error:null});});
  await waitFor(()=>expect(hook.result.current.session?.id).toBe(id));
  expect(mocks.rpc).toHaveBeenCalledWith('touch_interactive_lab',expect.objectContaining({p_session:id}));
  hook.unmount();
 });
 it('discards delayed join responses after leaving',async()=>{
  let finish:(value:unknown)=>void=()=>{};
  mocks.rpc.mockReturnValueOnce(new Promise(resolve=>{finish=resolve;}));
  const hook=renderHook(()=>useLiveLab('tech',scope));
  let pending:Promise<boolean>|undefined;
  act(()=>{pending=hook.result.current.join('ABC123','remote');});
  act(()=>{hook.result.current.leave();});
  await act(async()=>{finish({data:id,error:null});expect(await pending).toBe(false);});
  expect(hook.result.current.session).toBeNull();
  expect(mocks.from).not.toHaveBeenCalled();
  hook.unmount();
 });
});
