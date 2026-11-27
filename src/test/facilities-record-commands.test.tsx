import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({rpc:vi.fn()}));
vi.mock('@/lib/db',()=>({db:mocks}));
import FacilitiesRecordCommands from '@/components/security/FacilitiesRecordCommands';
const tenant='centre-a';
const recordId='12345678-1234-4234-8234-123456789abc';
beforeEach(()=>mocks.rpc.mockReset());
afterEach(cleanup);
describe('facilities command workspace',()=>{
 it('keeps the exact request after an uncertain response and refreshes after confirmed retry',async()=>{
  const refresh=vi.fn();
  mocks.rpc.mockResolvedValueOnce({data:null,error:{message:'Uncertain'}});
  mocks.rpc.mockImplementationOnce(async(_name,args)=>({data:{id:recordId,tenant_id:tenant,kind:args.p_kind,request_id:args.p_request_id},error:null}));
  render(<FacilitiesRecordCommands tenant={tenant} snapshot={{assets:[],inspections:[]}} refresh={refresh}/>);
  fireEvent.change(screen.getByLabelText('Asset reference'),{target:{value:'ALARM-01'}});
  fireEvent.change(screen.getByLabelText('Confirmed location'),{target:{value:'Reception'}});
  fireEvent.change(screen.getByLabelText('Planned inspection date (Pakistan)'),{target:{value:'2027-01-01'}});
  fireEvent.click(screen.getByRole('button',{name:'Register asset'}));
  await waitFor(()=>expect(screen.getByRole('alert')).toHaveTextContent('could not be confirmed'));
  expect(screen.getByLabelText('Asset reference')).toBeDisabled();
  expect(mocks.rpc).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button',{name:'Retry same request'}));
  await waitFor(()=>expect(screen.getByRole('status')).toHaveTextContent('Database acknowledged'));
  expect(mocks.rpc).toHaveBeenCalledTimes(2);
  expect(mocks.rpc.mock.calls[1]).toEqual(mocks.rpc.mock.calls[0]);
  expect(refresh).toHaveBeenCalledTimes(2);
  expect(screen.getByLabelText('Asset reference')).toHaveValue('');
 });
 it('does not enable new commands without a verified register',()=>{
  render(<FacilitiesRecordCommands tenant={tenant} snapshot={null} refresh={()=>{}}/>);
  expect(screen.getByRole('button',{name:'Register asset'})).toBeDisabled();
  expect(screen.getByRole('button',{name:'Record inspection'})).toBeDisabled();
  expect(mocks.rpc).not.toHaveBeenCalled();
 });
});
