import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import QuizDashboard from '@/pages/quiz/QuizDashboard';
const mocks=vi.hoisted(()=>({user:{id:'student',role:'student'},rpc:vi.fn(),toast:{error:vi.fn(),success:vi.fn()}}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:mocks.user})}));
vi.mock('@/components/layout/DashboardLayout',()=>({default:({children}:any)=><main>{children}</main>}));
vi.mock('sonner',()=>({toast:mocks.toast}));
vi.mock('@/lib/db',()=>({db:{rpc:mocks.rpc}}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{from:(table:string)=>({select:()=>({order:()=>Promise.resolve({data:table==='quizzes'?[{id:'quiz',title:'Practice quiz',status:'published',time_limit_minutes:30,max_attempts:1,pass_percentage:50}]:[],error:null})})})}}));
afterEach(()=>{cleanup();vi.clearAllMocks()});
async function start(){
 mocks.rpc.mockImplementation(async(name:string)=>({data:name==='my_quiz_attempts'?[]:{attempt_id:'attempt',questions:[{id:'q1',question_text:'Pick the answer',question_type:'mcq',points:1,options:['A','B']}],answers:{},expires_at:new Date(Date.now()+60_000).toISOString(),server_now:new Date().toISOString()},error:null}));
 await act(async()=>{render(<QuizDashboard/>)});fireEvent.click(screen.getByRole('button',{name:'Start Quiz'}));await screen.findByText(/Pick the answer/);
}
it('submits answers to the server and displays its score without receiving an answer key',async()=>{
 await start();fireEvent.click(screen.getByRole('radio',{name:'A'}));
 mocks.rpc.mockImplementation(async(name:string)=>({data:name==='submit_quiz_attempt'?{results_visible:true,percentage:100}:[],error:null}));
 fireEvent.click(screen.getByRole('button',{name:'Submit Quiz'}));
 await waitFor(()=>expect(mocks.rpc).toHaveBeenCalledWith('submit_quiz_attempt',{p_attempt_id:'attempt',p_answers:{q1:'A'}}));
 await waitFor(()=>expect(mocks.toast.success).toHaveBeenCalledWith('Quiz submitted! Score: 100%'));
});
it('keeps the attempt and answers available when submission fails, then retries',async()=>{
 await start();fireEvent.click(screen.getByRole('radio',{name:'B'}));
 mocks.rpc.mockResolvedValue({data:null,error:{message:'offline'}});
 fireEvent.click(screen.getByRole('button',{name:'Submit Quiz'}));
 await waitFor(()=>expect(mocks.toast.error).toHaveBeenCalled());expect(screen.getByRole('radio',{name:'B'})).toBeChecked();expect(mocks.toast.success).not.toHaveBeenCalled();
 mocks.rpc.mockImplementation(async(name:string)=>({data:name==='my_quiz_attempts'?[]:{results_visible:false},error:null}));
 fireEvent.click(screen.getByRole('button',{name:'Submit Quiz'}));
 await waitFor(()=>expect(mocks.toast.success).toHaveBeenCalledWith('Quiz submitted. Results are withheld by your teacher.'));
});
