import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,expect,it} from 'vitest';
import PublicNav from '@/components/PublicNav';
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
