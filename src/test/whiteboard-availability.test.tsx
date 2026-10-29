import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import WhiteboardStudio from '@/pages/classroom/WhiteboardStudio';
const state=vi.hoisted(()=>({missing:true,read:vi.fn()}));
vi.mock('@/contexts/AuthContext',()=>({ROLE_HOME:{lecturer:'/lecturer'},useAuth:()=>({user:{id:'teacher',tenantId:'centre',role:'lecturer',roles:['lecturer']}})}));
vi.mock('@/components/layout/DashboardLayout',()=>({default:({children}:{children:React.ReactNode})=><main>{children}</main>}));
vi.mock('@/lib/db',()=>({db:{from:(table:string)=>{const q={select:()=>q,eq:()=>q,order:()=>q,limit:()=>{state.read(table);return Promise.resolve({data:[],error:state.missing&&table==='lesson_whiteboards'?{code:'PGRST205',message:"Could not find the table 'public.lesson_whiteboards' in the schema cache"}:null});}};return q;}}}));
afterEach(cleanup);beforeEach(()=>{state.missing=true;state.read.mockClear();});
it('keeps missing backend distinct from an empty board list and offers a role-home escape',async()=>{
 render(<MemoryRouter><WhiteboardStudio/></MemoryRouter>);const alert=await screen.findByRole('alert');expect(alert).toHaveTextContent('Whiteboards are unavailable for your centre');expect(alert).not.toHaveTextContent('schema cache');expect(alert).not.toHaveTextContent('migrations must be deployed');expect(screen.getByRole('link',{name:'Return to my dashboard'})).toHaveAttribute('href','/lecturer');expect(screen.queryByText(/No authorised boards yet/)).toBeNull();expect(screen.queryByText('Create private board')).toBeNull();
});
it('rechecks availability on retry and only then displays a verified empty state',async()=>{
 render(<MemoryRouter><WhiteboardStudio/></MemoryRouter>);await screen.findByRole('alert');state.missing=false;fireEvent.click(screen.getByText('Retry whiteboards'));await screen.findByText(/No authorised boards yet/);expect(screen.queryByRole('alert')).toBeNull();expect(state.read).toHaveBeenCalledTimes(4);
});
