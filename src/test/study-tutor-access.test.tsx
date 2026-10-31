import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';

const state=vi.hoisted(()=>({
 user:{id:'account-a',tenantId:'centre-a',name:'Learner',role:'student',roles:['student']} as {
  id:string;tenantId:string;name:string;role:string;roles:string[];
 },
 session:vi.fn()
}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:state.user})}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{auth:{getSession:state.session}}}));
vi.mock('react-markdown',()=>({default:({children}:{children:React.ReactNode})=><>{children}</>}));
vi.mock('framer-motion',()=>({
 AnimatePresence:({children}:{children:React.ReactNode})=><>{children}</>,
 useReducedMotion:()=>true,
 motion:{
  button:({initial,animate,exit,children,...props}:any)=><button {...props}>{children}</button>,
  div:({initial,animate,exit,transition,children,...props}:any)=><div {...props}>{children}</div>,
 }
}));
import AIChatWidget from '@/components/AIChatWidget';
beforeEach(()=>{state.user={id:'account-a',tenantId:'centre-a',name:'Learner',role:'student',roles:['student']};state.session.mockReset();});
afterEach(cleanup);

it('shows a learner-only tutor with accessible privacy and study guidance',()=>{
 render(<AIChatWidget/>);
 fireEvent.click(screen.getByRole('button',{name:'Open AI Study Tutor'}));
 expect(screen.getByRole('dialog',{name:'AI Study Tutor'})).toBeInTheDocument();
 expect(screen.getByText(/does not issue official grades/)).toBeInTheDocument();
 expect(screen.getByRole('log',{name:'Tutor conversation'})).toBeInTheDocument();
 expect(screen.getByRole('button',{name:'Clear tutor conversation'})).toBeInTheDocument();
 expect(screen.getByRole('button',{name:'Close study tutor'})).toBeInTheDocument();
});

it('hides the tutor on role change within the same account without sending a request',()=>{
 const view=render(<AIChatWidget/>);
 fireEvent.click(screen.getByRole('button',{name:'Open AI Study Tutor'}));
 expect(screen.getByRole('dialog',{name:'AI Study Tutor'})).toBeInTheDocument();
 state.user={...state.user,role:'centre_director',roles:['student','centre_director']};
 view.rerender(<AIChatWidget/>);
 expect(screen.queryByRole('dialog',{name:'AI Study Tutor'})).not.toBeInTheDocument();
 expect(screen.queryByRole('button',{name:'Open AI Study Tutor'})).not.toBeInTheDocument();
 expect(state.session).not.toHaveBeenCalled();
});

it('denies a user without an assigned student role even when the active role says student',()=>{
 state.user={...state.user,roles:['employer_partner']};
 render(<AIChatWidget/>);
 expect(screen.queryByRole('button',{name:'Open AI Study Tutor'})).not.toBeInTheDocument();
});

it('requires a verified student role in the edge function before using Omniqora',async()=>{
 const {readFileSync}=await import('node:fs');
 const endpoint=readFileSync('supabase/functions/ai-tutor/index.ts','utf8');
 expect(endpoint).toContain(".eq('role','student')");
 expect(endpoint).toContain(".from('student_enrolments')");
 expect(endpoint).toContain(".eq('student_id',auth.userId)");
 expect(endpoint).toContain(".eq('tenant_id',profile.tenant_id)");
 expect(endpoint).toContain(".eq('status','active')");
 expect(endpoint.indexOf(".eq('role','student')")).toBeLessThan(endpoint.indexOf(".from('student_enrolments')"));
 expect(endpoint.indexOf(".eq('status','active')")).toBeLessThan(endpoint.indexOf("consume_study_tutor_quota"));
 expect(endpoint.indexOf(".eq('role','student')")).toBeLessThan(endpoint.indexOf("consume_study_tutor_quota"));
 expect(endpoint.indexOf(".eq('role','student')")).toBeLessThan(endpoint.indexOf("const response=await fetch(url"));
});
