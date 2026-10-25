import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({user:null as null|{id:string;tenantId:string;name:string},getSession:vi.fn()}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:state.user})}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{auth:{getSession:state.getSession}}}));
import AIChatWidget from '@/components/AIChatWidget';
HTMLElement.prototype.scrollTo=vi.fn();
afterEach(()=>{cleanup();vi.unstubAllGlobals();state.user=null;});
it('is hidden to visitors',()=>{render(<AIChatWidget/>);expect(screen.queryByRole('button',{name:'Open AI Study Tutor'})).toBeNull();});
it('uses the user JWT and clears conversation on account change',async()=>{
 state.user={id:'learner',tenantId:'centre',name:'Ali'};
 state.getSession.mockResolvedValue({data:{session:{access_token:'user-jwt',user:{id:'learner'}}},error:null});
 const fetcher=vi.fn().mockResolvedValue({ok:true,json:async()=>({reply:'Let us practise.',usage:{remaining:49}})});vi.stubGlobal('fetch',fetcher);
 const view=render(<AIChatWidget/>);fireEvent.click(screen.getByRole('button',{name:'Open AI Study Tutor'}));fireEvent.change(screen.getByLabelText('Ask your study tutor'),{target:{value:'Explain fractions'}});fireEvent.click(screen.getByRole('button',{name:'Send question'}));
 await waitFor(()=>expect(screen.getByText('Let us practise.')).toBeInTheDocument());expect(fetcher.mock.calls[0][1].headers.Authorization).toBe('Bearer user-jwt');
 state.user={id:'other',tenantId:'centre',name:'Sara'};view.rerender(<AIChatWidget/>);fireEvent.click(screen.getByRole('button',{name:'Open AI Study Tutor'}));expect(screen.queryByText('Let us practise.')).toBeNull();
});
