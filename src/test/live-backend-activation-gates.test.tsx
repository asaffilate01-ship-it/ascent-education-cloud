import {cleanup,render,screen} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
vi.mock('@/components/layout/DashboardLayout',()=>({
 default:({title,children}:{title:string;children:React.ReactNode})=><main><h1>{title}</h1>{children}</main>
}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:{id:'student',role:'student',tenantId:'centre'}})}));
import MessagingInbox from '@/pages/messaging/MessagingInbox';
afterEach(()=>{cleanup();vi.unstubAllEnvs();});
it('keeps the private chat UI disabled until backend ACL, storage and schema activation',()=>{
 vi.stubEnv('VITE_UNIPATHWAY_PRIVATE_MESSAGING_ENABLED','');
 render(<MessagingInbox/>);
 expect(screen.getByRole('heading',{name:'Private messages'})).toBeInTheDocument();
 expect(screen.getByRole('heading',{name:'Private conversations are awaiting secure activation'})).toBeInTheDocument();
 expect(screen.queryByRole('button',{name:/New Chat/})).toBeNull();
 expect(screen.queryByRole('button',{name:/Send message/})).toBeNull();
});
it('requires an explicit true activation flag and never defaults to an unsafe state',()=>{
 const source=readFileSync('src/pages/messaging/MessagingInbox.tsx','utf8');
 expect(source).toContain("import.meta.env.VITE_UNIPATHWAY_PRIVATE_MESSAGING_ENABLED !== 'true'");
 expect(source).toContain('return <EnabledMessagingInbox/>');
});
it('does not offer medical editing to staff before a backend authorised write path',()=>{
 const source=readFileSync('src/pages/health/HealthRecords.tsx','utf8');
 expect(source).toContain('editable={isStudent}');
 expect(source).toContain('if(!editable||saving)return');
 expect(source).toContain('{editable&&<Button');
 expect(source).toContain('readOnly={!editable}');
});
