import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {GuardianDiscussion} from '@/components/guardian/GuardianDiscussion';
const mock=vi.hoisted(()=>({rpc:vi.fn(),rows:[] as Record<string,unknown>[],fail:false}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:{id:'parent',tenantId:'centre'}})}));
vi.mock('@/lib/db',()=>({db:{rpc:mock.rpc,from:()=>{const q={select:()=>q,eq:()=>q,order:()=>q,range:async(a:number,b:number)=>({data:mock.fail?null:mock.rows.slice(a,b+1),error:mock.fail?{message:'offline'}:null})};return q;}}}));
beforeEach(()=>{mock.rows=[];mock.fail=false;mock.rpc.mockReset();});afterEach(cleanup);
it('retries uncertain delivery with the same payload and request ID',async()=>{
 mock.rpc.mockResolvedValueOnce({error:{message:'network'}}).mockResolvedValueOnce({data:'message-id'});
 render(<GuardianDiscussion linkId="link"/>);await screen.findByText('No messages are currently available.');
 fireEvent.change(screen.getByLabelText('Message to centre or guardian'),{target:{value:'Please arrange a progress review.'}});fireEvent.click(screen.getByText('Send message'));
 await screen.findByRole('alert');expect(screen.getByLabelText('Message to centre or guardian')).toBeDisabled();
 fireEvent.click(screen.getByText('Retry same message'));await waitFor(()=>expect(mock.rpc).toHaveBeenCalledTimes(2));
 expect(mock.rpc.mock.calls[0]).toEqual(mock.rpc.mock.calls[1]);expect(mock.rpc.mock.calls[0][0]).toBe('send_unipathway_guardian_message_once');
 await screen.findByText('Message saved.');expect(screen.getByLabelText('Message to centre or guardian')).toHaveValue('');
});
it('reconciles a lost acknowledgement by finding the saved request on refresh',async()=>{
 mock.rpc.mockImplementation(async(_name,args)=>{mock.rows=[{id:'saved',author_id:'parent',body:args.p_body,request_id:args.p_request,created_at:'2026-01-01'}];return {error:{message:'lost acknowledgement'}};});
 render(<GuardianDiscussion linkId="link"/>);await screen.findByText('No messages are currently available.');
 fireEvent.change(screen.getByLabelText('Message to centre or guardian'),{target:{value:'My saved message'}});fireEvent.click(screen.getByText('Send message'));await screen.findByRole('alert');
 fireEvent.click(screen.getByText('Refresh conversation'));await screen.findByText('Your message is confirmed in the conversation.');expect(mock.rpc).toHaveBeenCalledTimes(1);expect(screen.getByLabelText('Message to centre or guardian')).toHaveValue('');expect(screen.queryByRole('alert')).toBeNull();
});
it('searches more than 100 messages and clears old history on a failed refresh',async()=>{
 mock.rows=Array.from({length:301},(_,i)=>({id:`m${i}`,author_id:'parent',body:`Conversation entry ${i}`,created_at:'2026-01-01',request_id:null}));
 render(<GuardianDiscussion linkId="link"/>);await screen.findByText(/301 messages/);
 fireEvent.change(screen.getByLabelText('Search conversation'),{target:{value:'Conversation entry 0'}});await screen.findByText('Conversation entry 0');
 mock.fail=true;fireEvent.click(screen.getByText('Refresh conversation'));await screen.findByRole('alert');expect(screen.queryByText('Conversation entry 0')).toBeNull();
});
it('does not show a cleared history after permission revocation',async()=>{
 mock.rows=[{id:'m',author_id:'parent',body:'Private discussion',created_at:'2026-01-01',request_id:null}];render(<GuardianDiscussion linkId="link"/>);await screen.findByText('Private discussion');
 mock.rows=[];fireEvent.click(screen.getByText('Refresh conversation'));await screen.findByText('No messages are currently available.');expect(screen.queryByText('Private discussion')).toBeNull();
});
