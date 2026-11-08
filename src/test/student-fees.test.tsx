import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {beforeEach,afterEach,expect,it,vi} from 'vitest';
import StudentFees from '@/pages/student/StudentFees';
const mocks=vi.hoisted(()=>({query:vi.fn(),notice:vi.fn(),success:vi.fn(),error:vi.fn(),invoke:vi.fn(),authLoading:false,user:{id:'student',tenantId:'centre',role:'student',roles:['student']},ranges:[] as number[]}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:mocks.user,loading:mocks.authLoading})}));
vi.mock('@/components/layout/DashboardLayout',()=>({default:({children}:{children:React.ReactNode})=><main>{children}</main>}));
vi.mock('sonner',()=>({toast:Object.assign(mocks.notice,{success:mocks.success,error:mocks.error})}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{rpc:()=>({range:async(a:number,b:number)=>{mocks.ranges.push(a);const r=await mocks.query();return {...r,data:Array.isArray(r.data)?r.data.map(i=>({student_id:'student',tenant_id:'centre',...i})).filter(i=>i.student_id===mocks.user.id&&i.tenant_id===mocks.user.tenantId).slice(a,b+1):r.data};}}),functions:{invoke:mocks.invoke}}}));
afterEach(cleanup);beforeEach(()=>{vi.resetAllMocks();mocks.authLoading=false;mocks.user={id:'student',tenantId:'centre',role:'student',roles:['student']};mocks.ranges=[];mocks.query.mockResolvedValue({data:[],error:null});});
const show=(path='/student/finance')=>render(<MemoryRouter initialEntries={[path]}><StudentFees/></MemoryRouter>);
it('does not treat a success URL as verified payment',async()=>{show('/student/finance?payment=success');await screen.findByText('No invoices yet');expect(mocks.success).not.toHaveBeenCalled();expect(mocks.notice).toHaveBeenCalledWith('Payment verification pending',expect.any(Object));});
it('does not claim cancellation proves no charge occurred',async()=>{show('/student/finance?payment=cancelled');await screen.findByText('No invoices yet');expect(mocks.notice).toHaveBeenCalledWith('Checkout closed',expect.objectContaining({description:expect.stringContaining('not been confirmed')}));});
it('fails closed on query errors and supports retry',async()=>{mocks.query.mockResolvedValueOnce({error:{message:'denied'}}).mockResolvedValueOnce({data:[],error:null});show();await screen.findByRole('alert');expect(screen.queryByText('No invoices yet')).not.toBeInTheDocument();expect(screen.queryByText('Your outstanding balance')).not.toBeInTheDocument();fireEvent.click(screen.getByText('Retry invoices'));await screen.findByText('No invoices yet');});
it('does not offer payment on a refunded invoice',async()=>{mocks.query.mockResolvedValue({data:[{id:'a',amount:100,paid:0,status:'refunded',type:'tuition'}]});show();await screen.findByRole('option',{name:'refunded'});expect(screen.queryByRole('button',{name:'Pay now'})).not.toBeInTheDocument();});
it('does not offset an unpaid invoice with another invoice overpayment',async()=>{mocks.query.mockResolvedValue({data:[{id:'a',amount:100,paid:200,status:'paid'},{id:'b',amount:80,paid:0,status:'pending'}]});show();await screen.findByRole('option',{name:'pending'});const label=screen.getByText('Your outstanding balance');expect(label.parentElement).toHaveTextContent('Rs. 80');});

it('reads the full invoice history and scopes totals to the current learner and centre',async()=>{mocks.query.mockResolvedValue({data:[...Array.from({length:301},(_,i)=>({id:String(i),amount:100,paid:0,status:'pending'})),{id:'peer',student_id:'other',amount:99999,status:'pending'},{id:'foreign',tenant_id:'other',amount:99999,status:'pending'}],error:null});show();await screen.findByText('Page 1 of 16');expect(mocks.ranges).toContain(250);expect(screen.getByText('Your outstanding balance').parentElement).toHaveTextContent('Rs. 30,100');expect(screen.getAllByRole('button',{name:'Pay now'})).toHaveLength(20);});
it('rejects malformed balances without offering payment',async()=>{mocks.query.mockResolvedValue({data:[{id:'bad',amount:'unknown',status:'pending'}],error:null});show();await screen.findByRole('alert');expect(screen.queryByText('Your outstanding balance')).toBeNull();expect(screen.queryByRole('button',{name:'Pay now'})).toBeNull();});
it('does not follow a checkout response after switching accounts',async()=>{mocks.query.mockResolvedValue({data:[{id:'a',amount:100,paid:0,status:'pending'}],error:null});let finish!:(r:unknown)=>void;mocks.invoke.mockReturnValueOnce(new Promise(resolve=>{finish=resolve;}));const view=show();fireEvent.click(await screen.findByText('Pay now'));mocks.user={id:'other',tenantId:'centre',role:'student',roles:['student']};view.rerender(<MemoryRouter><StudentFees/></MemoryRouter>);await screen.findByText('No invoices yet');await act(async()=>finish({data:{url:'https://untrusted.example/checkout'},error:null}));expect(mocks.error).not.toHaveBeenCalled();});
it('refuses an unverified checkout destination',async()=>{mocks.query.mockResolvedValue({data:[{id:'a',amount:100,paid:0,status:'pending'}],error:null});mocks.invoke.mockResolvedValue({data:{url:'https://untrusted.example/checkout'},error:null});show();fireEvent.click(await screen.findByText('Pay now'));await screen.findByText('Pay now');expect(mocks.error).toHaveBeenCalledWith('Could not start payment',expect.objectContaining({description:expect.stringContaining('destination could not be verified')}));});

it('separates sponsor arrears and blocks legacy checkout for funded fees',async()=>{mocks.query.mockResolvedValue({data:[{id:'a',amount:1000,paid:100,sponsor_amount:800,sponsor_paid:0,sponsor_name:'Sponsor',status:'overdue',type:'tuition'}],error:null});show();await screen.findByRole('option',{name:'overdue'});expect(screen.getByText('Your outstanding balance').parentElement).toHaveTextContent('Rs. 100');expect(screen.queryByRole('button',{name:'Pay now'})).toBeNull();});

it('shows the exact invoice reference and paisa amounts for the learner-to-finance handoff',async()=>{
  const id='11111111-2222-4333-8444-555555555555';
  mocks.query.mockResolvedValue({data:[{id,amount:100.25,paid:20.10,status:'partial',type:'tuition'}],error:null});
  show();await screen.findByText(`Invoice reference: ${id}`);
  expect(screen.getByText('Your agreed share').parentElement).toHaveTextContent('Rs. 100.25');
  expect(screen.getByText('Paid to date').parentElement).toHaveTextContent('Rs. 20.10');
  expect(screen.getByText('Your outstanding balance').parentElement).toHaveTextContent('Rs. 80.15');
});

it('loads valid large two-decimal invoices without treating floating-point multiplication drift as invalid data',async()=>{
  mocks.query.mockResolvedValue({data:[{id:'large',amount:10000000.03,paid:0.01,status:'partial',type:'tuition'}],error:null});
  show();await screen.findByText('Invoice reference: large');
  expect(screen.getByText('Your outstanding balance').parentElement).toHaveTextContent('Rs. 10,000,000.02');
  expect(screen.queryByRole('alert')).toBeNull();
});

it.each(['active-role','membership','loading'])('does not request private invoices without completed verified student access: %s',async reason=>{
  if(reason==='active-role')mocks.user={...mocks.user,role:'lecturer',roles:['student','lecturer']};
  if(reason==='membership')mocks.user={...mocks.user,roles:['lecturer']};
  if(reason==='loading')mocks.authLoading=true;
  show();expect(mocks.query).not.toHaveBeenCalled();expect(screen.queryByText('Your outstanding balance')).toBeNull();
  expect(screen.getByRole('button',{name:'Refresh invoices'})).toBeDisabled();
  if(reason!=='loading')expect(await screen.findByRole('alert')).toHaveTextContent('verified student account');
});

it('stops loading further private invoice pages when authentication changes',async()=>{
  let finish!:(value:unknown)=>void;
  mocks.query.mockReturnValueOnce(new Promise(resolve=>{finish=resolve;}));
  const view=show();expect(mocks.ranges).toEqual([0]);
  mocks.authLoading=true;view.rerender(<MemoryRouter><StudentFees/></MemoryRouter>);
  await act(async()=>finish({data:Array.from({length:250},(_,i)=>({id:`old-${i}`,amount:100,paid:0,status:'pending'})),error:null}));
  expect(mocks.ranges).toEqual([0]);expect(screen.queryByText('Your outstanding balance')).toBeNull();
  mocks.authLoading=false;view.rerender(<MemoryRouter><StudentFees/></MemoryRouter>);await screen.findByText('No invoices yet');
});

it.each(['active-role','loading'])('ignores a checkout response after %s changes',async reason=>{
  mocks.query.mockResolvedValue({data:[{id:'invoice-a',amount:100,paid:0,status:'pending'}],error:null});
  let finish!:(value:unknown)=>void;mocks.invoke.mockReturnValueOnce(new Promise(resolve=>{finish=resolve;}));
  const view=show();fireEvent.click(await screen.findByRole('button',{name:'Pay now'}));
  if(reason==='active-role')mocks.user={...mocks.user,role:'lecturer',roles:['student','lecturer']};else mocks.authLoading=true;
  view.rerender(<MemoryRouter><StudentFees/></MemoryRouter>);
  await act(async()=>finish({data:{url:'https://untrusted.example'},error:null}));
  expect(mocks.error).not.toHaveBeenCalled();expect(screen.queryByRole('button',{name:'Pay now'})).toBeNull();
});

it('recovers from a no-match filter, resets pagination and restores filter focus',async()=>{
  mocks.query.mockResolvedValue({data:Array.from({length:21},(_,i)=>({id:`invoice-${i}`,amount:100,paid:0,status:'pending'})),error:null});
  show();await screen.findByText('Page 1 of 2');fireEvent.click(screen.getByRole('button',{name:'Next invoices'}));
  expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Invoice status'),{target:{value:'paid'}});
  expect(screen.getByText('No invoices match this status.')).toBeInTheDocument();
  expect(screen.queryByRole('navigation',{name:'Invoice pages'})).toBeNull();
  fireEvent.click(screen.getByRole('button',{name:'Show all invoices'}));
  expect(screen.getByLabelText('Invoice status')).toHaveValue('');expect(screen.getByLabelText('Invoice status')).toHaveFocus();
  expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();expect(screen.getAllByRole('button',{name:'Pay now'})).toHaveLength(20);
});

it('rejects duplicate invoice references instead of double-counting a balance',async()=>{
  mocks.query.mockResolvedValue({data:[{id:'same',amount:100,paid:0,status:'pending'},{id:'same',amount:100,paid:0,status:'pending'}],error:null});
  show();expect(await screen.findByRole('alert')).toHaveTextContent('could not be verified');
  expect(screen.queryByText('Your outstanding balance')).toBeNull();
});

it('rejects a checkout link using a nonstandard payment-host port',async()=>{
  mocks.query.mockResolvedValue({data:[{id:'a',amount:100,paid:0,status:'pending'}],error:null});
  mocks.invoke.mockResolvedValue({data:{url:'https://checkout.stripe.com:8443/pay'},error:null});
  show();fireEvent.click(await screen.findByRole('button',{name:'Pay now'}));
  await waitFor(()=>expect(mocks.error).toHaveBeenCalledWith('Could not start payment',expect.objectContaining({description:expect.stringContaining('destination could not be verified')})));
});
