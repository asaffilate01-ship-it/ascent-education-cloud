import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,expect,it} from 'vitest';
import PublicNav from '@/components/PublicNav';
import PublicBottomNav from '@/components/PublicBottomNav';
afterEach(cleanup);
it('returns keyboard focus to the desktop disclosure trigger on Escape',()=>{
 render(<MemoryRouter><PublicNav/></MemoryRouter>);
 const nav=screen.getByRole('navigation',{name:'Main navigation'});
 for(const name of ['Courses','Study Abroad']){
  const trigger=within(nav).getByRole('button',{name});
  fireEvent.click(trigger);
  expect(trigger).toHaveAttribute('aria-expanded','true');
  within(nav).getAllByRole('link').find(a=>a.textContent?.includes(name==='Courses'?'All study options':'All overseas destinations'))?.focus();
  fireEvent.keyDown(document,{key:'Escape'});
  expect(trigger).toHaveAttribute('aria-expanded','false');expect(trigger).toHaveFocus();
 }
});
it('lets mobile visitors recover an empty course search and close the menu by keyboard',()=>{
 render(<MemoryRouter><PublicNav/></MemoryRouter>);
 fireEvent.click(screen.getByRole('button',{name:'Open menu'}));
 const input=screen.getByRole('searchbox',{name:'Find a course or service'});
 fireEvent.change(input,{target:{value:'zzzz-no-course'}});
 fireEvent.click(screen.getByRole('button',{name:'Clear course search'}));
 expect(input).toHaveValue('');expect(input).toHaveFocus();
 fireEvent.keyDown(document,{key:'Escape'});
 expect(screen.queryByRole('navigation',{name:'Mobile navigation'})).toBeNull();
 expect(screen.getByRole('button',{name:'Open menu'})).toHaveFocus();
});

it('keeps public mobile tabs keyboard-visible with correct active state and accessible icon labels',()=>{
 render(<MemoryRouter initialEntries={['/germany']}><PublicBottomNav/></MemoryRouter>);
 const nav=screen.getByRole('navigation',{name:'Quick navigation'});
 const abroad=within(nav).getByRole('link',{name:'Abroad'});
 expect(abroad).toHaveAttribute('aria-current','page');
 expect(abroad.className).toContain('focus-visible:outline');
 expect(abroad.className).toContain('motion-reduce:transform-none');
 abroad.focus();
 expect(abroad).toHaveFocus();
 const apply=within(nav).getByRole('link',{name:'Apply'});
 expect(apply.className).toContain('focus-visible:outline');
 expect(apply).not.toHaveAttribute('aria-current');
 expect(within(nav).getAllByRole('link')).toHaveLength(5);
 expect(nav.querySelectorAll('svg[aria-hidden="true"]')).toHaveLength(5);
});
