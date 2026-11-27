import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import type {FacilityRegister} from '@/lib/facilitiesRegister';
const mocks=vi.hoisted(()=>({rpc:vi.fn()}));
vi.mock('@/lib/db',()=>({db:mocks}));
vi.mock('@/lib/facilitiesPlanning',async(importOriginal)=>{
 const actual=await importOriginal<typeof import('@/lib/facilitiesPlanning')>();
 return {...actual,pakistanCalendarDate:()=> '2026-11-27'};
});
import FacilitiesFollowupWorkspace from '@/components/security/FacilitiesFollowupWorkspace';
const tenant='centre-a',asset='10000000-0000-4000-8000-000000000001',inspection='10000000-0000-4000-8000-000000000002',action='10000000-0000-4000-8000-000000000003';
const register:FacilityRegister={assets:[{id:asset,tenant_id:tenant,category:'extinguisher',asset_code:'F01',location:'Reception',planned_inspection_date:'2026-11-27'}],inspections:[{id:inspection,tenant_id:tenant,asset_id:asset,inspected_on:'2026-11-27',outcome:'defect',notes:'Observed defect',next_due_date:null,recorded_at:'2026-11-27T06:00:00Z'}]};
const row={id:action,tenant_id:tenant,asset_id:asset,inspection_id:inspection,task:'Arrange inspection',team:'facilities',target_date:'2026-11-27',created_at:'2026-11-27T07:00:00Z',resolved_at:null,resolution_evidence:null};
beforeEach(()=>mocks.rpc.mockReset());
afterEach(cleanup);
describe('facilities follow-up workspace',()=>{
 it('preserves the exact open request after an uncertain response',async()=>{
  let confirmed=false,attempts=0;const writes:unknown[]=[];
  mocks.rpc.mockImplementation(async(name,args)=>{
   if(name==='get_unipathway_facilities_followups')return {data:confirmed?[{...row,id:(writes[0] as {p_request:string}).p_request}]:[],error:null};
   writes.push(args);attempts++;
   if(attempts===1)return {data:null,error:{message:'Uncertain'}};
   confirmed=true;return {data:{tenant_id:tenant,request_id:args.p_request,kind:'open',action_id:args.p_request},error:null};
  });
  render(<FacilitiesFollowupWorkspace tenant={tenant} register={register} writer/>);
  await waitFor(()=>expect(screen.getByLabelText('Inspection finding')).toBeEnabled());
  fireEvent.change(screen.getByLabelText('Inspection finding'),{target:{value:inspection}});
  fireEvent.change(screen.getByLabelText('Required work'),{target:{value:'Arrange inspection'}});
  fireEvent.click(screen.getByRole('button',{name:'Record follow-up'}));
  await screen.findByText(/The result could not be confirmed/);
  expect(screen.getByLabelText('Required work')).toBeDisabled();
  fireEvent.click(screen.getByRole('button',{name:'Retry exact follow-up request'}));
  await screen.findByText(/Database acknowledged the follow-up/);
  expect(writes[0]).toEqual(writes[1]);
  await screen.findByText('Arrange inspection');
 });
 it('keeps a security officer read-only and fails closed for a foreign row',async()=>{
  mocks.rpc.mockResolvedValue({data:[row],error:null});
  const view=render(<FacilitiesFollowupWorkspace tenant={tenant} register={register} writer={false}/>);
  await screen.findByText('Arrange inspection');
  expect(screen.queryByRole('button',{name:'Record follow-up'})).toBeNull();
  expect(screen.queryByRole('button',{name:'Record resolution'})).toBeNull();
  mocks.rpc.mockResolvedValue({data:[{...row,tenant_id:'centre-b'}],error:null});
  fireEvent.click(screen.getByRole('button',{name:'Refresh follow-ups'}));
  await screen.findByText(/Follow-up records could not be verified/);
  expect(screen.queryByText('Arrange inspection')).toBeNull();
  view.unmount();
 });
});
