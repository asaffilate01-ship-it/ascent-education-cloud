import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import ResidentialCalendar from '@/components/residential/ResidentialCalendar';
vi.mock('@/lib/downloadText',()=>({downloadText:vi.fn()}));
afterEach(cleanup);
it('requires closure review for export and invalidates review after an edit',()=>{
  render(<ResidentialCalendar />);
  const button=screen.getByRole('button',{name:'Export dated teaching and trips'});
  expect(button).toBeDisabled();
  fireEvent.click(screen.getByRole('checkbox'));
  expect(button).toBeEnabled();
  fireEvent.change(screen.getByLabelText('Calendar students'),{target:{value:'500'}});
  expect(button).toBeDisabled();
  fireEvent.click(screen.getByRole('button',{name:'Add closure'}));
  expect(screen.getByRole('alert')).toBeInTheDocument();
  expect(screen.getByRole('button',{name:'Save draft file'})).toBeDisabled();
});
