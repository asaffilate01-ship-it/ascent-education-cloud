import {cleanup,fireEvent,render,screen,waitFor,act} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({user:{id:'employer-a',tenantId:'centre-a',role:'employer_partner'},query:vi.fn()}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:state.user})}));
vi.mock('@/components/layout/DashboardLayout',()=>({default:({children}:{children:React.ReactNode})=><main>{children}</main>}));
vi.mock('@/lib/db',()=>({db:{from:(table:string)=>{
 const result=state.query(table);const chain={select:()=>chain,eq:()=>chain,in:()=>chain,order:()=>chain,then:(resolve:(v:unknown)=>unknown,reject:(e:unknown)=>unknown)=>Promise.resolve(result).then(resolve,reject)};
 return chain;
}}}));
import EmployerPortal from '@/pages/employer/EmployerPortal';
function deferred(){let resolve!:(value:unknown)=>void;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};}
const verified={data:[{organisation_id:'old-org',unipathway_employer_organisations:{name:'Old employer',sector:'Technology',status:'verified'}}],error:null};
beforeEach(()=>{state.user={id:'employer-a',tenantId:'centre-a',role:'employer_partner'};state.query.mockReset().mockResolvedValue({data:[],error:null});});
afterEach(cleanup);
it('keeps a query failure distinct from pending organisation approval and allows retry',async()=>{
 state.query.mockResolvedValueOnce({data:null,error:{message:'offline'}});
 render(<EmployerPortal/>);
 expect(await screen.findByRole('alert')).toHaveTextContent('verification is not available');
 expect(screen.queryByText('Organisation approval pending')).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Refresh verification'}));
 expect(await screen.findByText('Organisation approval pending')).toBeInTheDocument();
});
it('discards late verification from the previous account and does not query its opportunities',async()=>{
 const old=deferred();state.query.mockReturnValueOnce(old.promise);
 const view=render(<EmployerPortal/>);
 state.user={id:'employer-b',tenantId:'centre-b',role:'employer_partner'};
 view.rerender(<EmployerPortal/>);
 await screen.findByText('Organisation approval pending');
 await act(async()=>old.resolve(verified));
 expect(screen.queryByText('Old employer')).not.toBeInTheDocument();
 expect(screen.queryByText('Submit an opportunity for centre review')).not.toBeInTheDocument();
 expect(state.query.mock.calls.map(c=>c[0])).toEqual(['unipathway_employer_memberships','unipathway_employer_memberships']);
});
it('keeps the latest refresh when an older verification fails late',async()=>{
 const old=deferred();state.query.mockReturnValueOnce(old.promise);
 render(<EmployerPortal/>);
 fireEvent.click(screen.getByRole('button',{name:'Refresh verification'}));
 await screen.findByText('Organisation approval pending');
 await act(async()=>old.resolve({data:null,error:{message:'old failure'}}));
 await waitFor(()=>expect(screen.queryByRole('alert')).not.toBeInTheDocument());
 expect(screen.getByText('Organisation approval pending')).toBeInTheDocument();
});
