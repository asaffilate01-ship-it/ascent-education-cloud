import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import TenantContactPage from '@/pages/tenant/TenantContactPage';
const state=vi.hoisted(()=>({invoke:vi.fn(),toast:{success:vi.fn(),error:vi.fn()}}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{functions:{invoke:state.invoke}}}));
vi.mock('sonner',()=>({toast:state.toast}));
vi.mock('@/components/TenantNav',()=>({default:()=>null}));
vi.mock('@/components/enquiry/TurnstileChallenge',()=>({default:({onToken}:{onToken:(value:string)=>void})=><button type="button" onClick={()=>onToken('synthetic-turnstile-token-not-live')}>Complete synthetic challenge</button>}));vi.mock('@/components/PublicFooter',()=>({default:()=>null}));vi.mock('@/components/SocialIcons',()=>({default:()=>null}));vi.mock('@/components/Seo',()=>({default:()=>null}));vi.mock('@/components/PublicHero',()=>({default:({children}:{children:React.ReactNode})=><div>{children}</div>}));
vi.mock('@/hooks/useTenantBranding',()=>({useTenantBranding:()=>({brandName:'UniPathway',primaryColor:'navy'})}));
afterEach(()=>{cleanup();vi.unstubAllEnvs();});beforeEach(()=>{vi.clearAllMocks();});
function mount(){return render(<MemoryRouter initialEntries={['/contact?course=Sewing']}><TenantContactPage/></MemoryRouter>);}
function fill(){fireEvent.change(screen.getByLabelText('Full Name *'),{target:{value:'Synthetic Learner'}});fireEvent.change(screen.getByLabelText('Email *'),{target:{value:'learner@example.invalid'}});}
function submit(){fireEvent.submit(document.getElementById('contact-form')!);}
it('blocks duplicate submits and disables editing until an explicit success receipt arrives',async()=>{
 let resolve:(value:unknown)=>void=()=>{};state.invoke.mockImplementation(()=>new Promise(r=>{resolve=r;}));mount();fill();submit();submit();
 expect(state.invoke).toHaveBeenCalledTimes(1);expect(screen.getByLabelText('Full Name *')).toBeDisabled();expect(screen.getByLabelText('Message *')).toBeDisabled();
 await act(async()=>{resolve({data:{success:true},error:null});});
 expect(screen.getByRole('status')).toHaveTextContent('Message sent.');expect(screen.getByLabelText('Full Name *')).toHaveValue('');expect(screen.getByLabelText('Full Name *')).toBeEnabled();
});
it('retains the selected course and personal details after a failed receipt, allowing retry',async()=>{
 state.invoke.mockResolvedValueOnce({data:{success:'true'},error:null}).mockResolvedValueOnce({data:{success:true},error:null});mount();fill();submit();
 await screen.findByRole('alert');expect(screen.getByLabelText('Full Name *')).toHaveValue('Synthetic Learner');expect((screen.getByLabelText('Message *') as HTMLTextAreaElement).value).toContain('Sewing');expect(state.toast.success).not.toHaveBeenCalled();
 submit();await waitFor(()=>expect(screen.getByRole('status')).toHaveTextContent('Message sent.'));expect(state.invoke).toHaveBeenCalledTimes(2);
});
it('does not announce late success after the visitor leaves',async()=>{
 let resolve:(value:unknown)=>void=()=>{};state.invoke.mockImplementation(()=>new Promise(r=>{resolve=r;}));const view=mount();fill();submit();view.unmount();
 await act(async()=>{resolve({data:{success:true},error:null});});expect(state.toast.success).not.toHaveBeenCalled();
});

it('uses secure contact only behind the explicit flag with privacy acknowledgement and human challenge',async()=>{
 vi.stubEnv('VITE_UNIPATHWAY_SECURE_CONTACT_ENABLED','true');
 vi.stubEnv('VITE_TURNSTILE_SITE_KEY','synthetic-public-site-key');
 state.invoke.mockResolvedValue({data:{ok:true},error:null});
 mount();fill();
 const send=screen.getByRole('button',{name:'Send Message'});
 expect(send).toBeDisabled();
 const accept=screen.getByRole('checkbox');
 fireEvent.click(accept);
 expect(send).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'Complete synthetic challenge'}));
 expect(send).toBeEnabled();
 fireEvent.click(send);
 await waitFor(()=>expect(state.invoke).toHaveBeenCalledWith('unipathway-secure-contact',{
  body:expect.objectContaining({
   tenant_slug:'unipathway',privacy_acknowledged:true,
   captcha_token:'synthetic-turnstile-token-not-live',email:'learner@example.invalid',
  })
 }));
 expect(await screen.findByRole('status')).toHaveTextContent('Message sent');
 expect(accept).not.toBeChecked();
 expect(send).toBeDisabled();
});
it('does not claim secure contact succeeded from a malformed persistence receipt',async()=>{
 vi.stubEnv('VITE_UNIPATHWAY_SECURE_CONTACT_ENABLED','true');
 vi.stubEnv('VITE_TURNSTILE_SITE_KEY','synthetic-public-site-key');
 state.invoke.mockResolvedValue({data:{ok:'true'},error:null});
 mount();fill();
 fireEvent.click(screen.getByRole('checkbox'));
 fireEvent.click(screen.getByRole('button',{name:'Complete synthetic challenge'}));
 fireEvent.click(screen.getByRole('button',{name:'Send Message'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('could not be confirmed');
 expect(screen.getByLabelText('Full Name *')).toHaveValue('Synthetic Learner');
 expect(screen.queryByText('Message sent. Our admissions team will reply using your contact details.')).toBeNull();
});
