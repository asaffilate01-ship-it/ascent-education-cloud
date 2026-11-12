import {cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {MemoryRouter} from 'react-router-dom';

const state=vi.hoisted(()=>({
 user:{
  id:'student-qa',tenantId:'centre-qa',role:'student' as const,roles:['student'] as string[],
  name:'Test learner',
 },
 setRole:vi.fn(),logout:vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/contexts/AuthContext',async original=>({
 ...await original<typeof import('@/contexts/AuthContext')>(),
 useAuth:()=>({user:state.user,setRole:state.setRole,logout:state.logout}),
}));
import DashboardSidebar from '@/components/layout/DashboardSidebar';

const mount=()=>render(<MemoryRouter initialEntries={['/student']}><DashboardSidebar/></MemoryRouter>);
beforeEach(()=>vi.clearAllMocks());
afterEach(cleanup);

it('keeps the closed mobile drawer invisible while leaving desktop navigation available',()=>{
 mount();
 const toggle=screen.getByRole('button',{name:'Open navigation'});
 const aside=document.getElementById('unipathway-dashboard-nav');
 expect(aside).not.toBeNull();
 expect(toggle).toHaveAttribute('aria-expanded','false');
 expect(toggle).toHaveAttribute('aria-controls','unipathway-dashboard-nav');
 expect(aside?.className).toContain('invisible lg:translate-x-0 lg:visible');
 expect(aside).not.toHaveAttribute('role','dialog');
 expect(aside?.querySelector('a[href="/student"]')).not.toBeNull();
});

it('opens keyboard-operable navigation and hides it again without deleting links',async()=>{
 mount();
 const toggle=screen.getByRole('button',{name:'Open navigation'});
 toggle.focus();
 fireEvent.click(toggle);
 expect(toggle).toHaveAttribute('aria-expanded','true');
 const dialog=screen.getByRole('dialog',{name:'Dashboard navigation'});
 expect(dialog).toHaveAttribute('aria-modal','true');
 expect(dialog.className).toContain('translate-x-0 shadow-2xl visible');
 const close=within(dialog).getByRole('button',{name:'Close navigation'});
 expect(close.className).toContain('min-h-11 min-w-11');
 fireEvent.click(close);
 await waitFor(()=>expect(toggle).toHaveAttribute('aria-expanded','false'));
 expect(dialog.className).toContain('invisible lg:translate-x-0 lg:visible');
 expect(dialog.querySelector('a[href="/student/assignments"]')).not.toBeNull();
});

it('keeps expandable specialist sections comfortably touch-sized and keyboard-visible',()=>{
 mount();
 const aside=document.getElementById('unipathway-dashboard-nav');
 const summaries=[...(aside?.querySelectorAll('summary')||[])];
 expect(summaries.length).toBeGreaterThanOrEqual(2);
 for(const summary of summaries){
  expect(summary.className).toContain('min-h-11');
  expect(summary.className).toContain('focus-visible:ring-2');
 }
});
