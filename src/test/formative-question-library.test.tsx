import {afterEach,describe,it,expect} from 'vitest';
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import FormativeQuestionLibrary from '@/components/learning/FormativeQuestionLibrary';
afterEach(cleanup);
describe('formative question library interface',()=>{
 it('filters, previews an answer and clears the selection without creating an assessment',()=>{
  render(<FormativeQuestionLibrary/>);
  fireEvent.click(screen.getByRole('button',{name:'Explore question library'}));
  fireEvent.change(screen.getByLabelText('Practice subject'),{target:{value:'School maths'}});
  fireEvent.change(screen.getByLabelText('Search practice questions'),{target:{value:'linear equations'}});
  expect(screen.getByText('1 matching draft questions')).toBeInTheDocument();
  const article=screen.getByRole('article');
  expect(within(article).getByRole('button',{name:'Check answer'})).toBeDisabled();
  fireEvent.click(within(article).getByRole('radio',{name:/\. 9$/}));
  fireEvent.click(within(article).getByRole('button',{name:'Check answer'}));
  expect(within(article).getByText('Correct')).toBeInTheDocument();
  fireEvent.click(within(article).getByRole('button',{name:'Reset'}));
  expect(within(article).queryByText('Correct')).toBeNull();
  fireEvent.click(screen.getByRole('button',{name:'Clear question filters'}));
  expect(screen.getByText('90 matching draft questions')).toBeInTheDocument();
  expect(screen.getAllByRole('article')).toHaveLength(6);
  fireEvent.click(screen.getByRole('button',{name:'Next questions'}));
  expect(screen.getByText('Page 2 of 15')).toBeInTheDocument();
 });
});
