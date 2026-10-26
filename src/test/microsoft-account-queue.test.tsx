import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {describe,it,expect,vi} from 'vitest';
import MicrosoftAccountQueue from '@/components/classroom/MicrosoftAccountQueue';
const mock=vi.hoisted(()=>({rpc:vi.fn(),jobs:[] as unknown[]}));
vi.mock('@/lib/db',()=>({db:{rpc:mock.rpc,from:(table:string)=>{
 const query={select:()=>query,eq:()=>query,order:()=>query,limit:async()=>({data:table==='profiles'?[{user_id:'learner',full_name:'Example student'}]:mock.jobs,error:null})};return query;
}}}));
describe('Microsoft account queue',()=>{
 it('requests only the selected LMS user and explains queued versus active status',async()=>{
  mock.jobs=[];mock.rpc.mockResolvedValue({data:'job',error:null});render(<MicrosoftAccountQueue tenantId="centre"/>);
  await screen.findByText('No account requests yet.');
  fireEvent.change(screen.getByLabelText('Account holder'),{target:{value:'learner'}});
  fireEvent.click(screen.getByRole('button',{name:'Queue Microsoft account'}));
  await waitFor(()=>expect(mock.rpc).toHaveBeenCalledWith('request_unipathway_microsoft_account',{p_user:'learner'}));
  await screen.findByText(/Account request queued/);
  expect(screen.getByText(/completed request does not mean Teams is ready/)).toBeInTheDocument();
 });
 it('shows failed jobs and explicit retries without calling Graph from the browser',async()=>{
  mock.jobs=[{id:'job',user_id:'learner',role_type:'student',status:'failed',error_code:'graph_429',attempts:1}];mock.rpc.mockResolvedValue({data:'job',error:null});
  render(<MicrosoftAccountQueue tenantId="centre"/>);
  fireEvent.click(await screen.findByRole('button',{name:'Retry account request'}));
  await waitFor(()=>expect(mock.rpc).toHaveBeenCalledWith('request_unipathway_microsoft_account',{p_user:'learner'}));
 });
});
