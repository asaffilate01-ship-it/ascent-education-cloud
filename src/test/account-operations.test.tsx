import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import AccountOperations from '@/components/admin/AccountOperations';
const mock=vi.hoisted(()=>({invoke:vi.fn()}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:{id:'director',tenantId:'centre',roles:['centre_director']}})}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{functions:{invoke:mock.invoke}}}));
afterEach(()=>{cleanup();mock.invoke.mockReset();});
it('previews imports without sending and retries only failed accounts',async()=>{
 mock.invoke.mockResolvedValueOnce({data:{success:true,status:'invited'}}).mockResolvedValueOnce({data:{error:'Email unavailable'}}).mockResolvedValueOnce({data:{success:true,status:'access_assigned'}});
 render(<AccountOperations/>);
 const file=new File(['email,full_name,role\na@example.com,A Person,student\nb@example.com,B Person,lecturer'],'accounts.csv',{type:'text/csv'});
 Object.defineProperty(file,'text',{value:async()=> 'email,full_name,role\na@example.com,A Person,student\nb@example.com,B Person,lecturer'});
 fireEvent.change(screen.getByLabelText('Account CSV'),{target:{files:[file]}});
 await screen.findByText('a@example.com');expect(mock.invoke).not.toHaveBeenCalled();
 fireEvent.click(screen.getByText('Process pending / retry failed rows'));await screen.findByText('Email unavailable');
 expect(mock.invoke).toHaveBeenCalledTimes(2);fireEvent.click(screen.getByText('Process pending / retry failed rows'));
 await screen.findByText('access_assigned');expect(mock.invoke).toHaveBeenCalledTimes(3);expect(mock.invoke.mock.calls[2][1].body.email).toBe('b@example.com');
 await waitFor(()=>expect(screen.getByText('Process pending / retry failed rows')).toBeDisabled());
});
