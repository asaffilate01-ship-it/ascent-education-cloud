import {afterEach,expect,it,vi} from 'vitest';
import {act,cleanup,fireEvent,render,screen} from '@testing-library/react';
import SubmittedResponse from '@/components/assessment/SubmittedResponse';
const mock=vi.hoisted(()=>({read:vi.fn(),eq:vi.fn()}));
vi.mock('@/lib/db',()=>({db:{from:()=>{const q={select:()=>q,eq:(...args:unknown[])=>{mock.eq(...args);return q;},maybeSingle:mock.read};return q;}}}));
afterEach(()=>{cleanup();vi.clearAllMocks();});
it('loads original evidence only on request, hides it, and rechecks access on reopening',async()=>{
 mock.read.mockResolvedValueOnce({data:{evidence_text:'My original submitted reasoning.'}}).mockResolvedValueOnce({data:null,error:{message:'revoked'}});
 render(<SubmittedResponse attempt="attempt" student="student" tenant="centre"/>);expect(mock.read).not.toHaveBeenCalled();
 fireEvent.click(screen.getByText('Read submitted response'));await screen.findByText('My original submitted reasoning.');
 expect(mock.eq.mock.calls).toEqual([['id','attempt'],['student_id','student'],['tenant_id','centre']]);
 fireEvent.click(screen.getByText('Hide submitted response'));expect(screen.queryByText('My original submitted reasoning.')).toBeNull();
 fireEvent.click(screen.getByText('Read submitted response'));await screen.findByRole('alert');expect(screen.queryByText('My original submitted reasoning.')).toBeNull();
});
it('does not restore a response after its component is removed',async()=>{
 let finish!:(value:unknown)=>void;mock.read.mockReturnValue(new Promise(resolve=>{finish=resolve;}));
 const view=render(<SubmittedResponse attempt="attempt" student="student" tenant="centre"/>);fireEvent.click(screen.getByText('Read submitted response'));view.unmount();
 await act(async()=>finish({data:{evidence_text:'Late response'}}));expect(screen.queryByText('Late response')).toBeNull();
});
