import {afterEach,describe,it,expect} from 'vitest';
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import FormativeQuestionLibrary from '@/components/learning/FormativeQuestionLibrary';
afterEach(cleanup);
describe('formative question library interface',()=>{
 it('filters, previews an answer and clears the selection without creating an assessment',()=>{
  render(<FormativeQuestionLibrary/>);
  fireEvent.click(screen.getByRole('button',{name:'Explore question library'}));
  fireEvent.change(screen.getByLabelText('Practice subject'),{target:{value:'School maths'}});
  fireEvent.change(screen.getByLabelText('Search practice questions'),{target:{value:'UP-FQ3-MATHS-01'}});
  expect(screen.getByText('1 matching draft questions')).toBeInTheDocument();
  const article=screen.getByRole('article');
  expect(within(article).getByRole('button',{name:'Check answer'})).toBeDisabled();
  fireEvent.click(within(article).getByRole('radio',{name:/\. 9$/}));
  fireEvent.click(within(article).getByRole('button',{name:'Check answer'}));
  expect(within(article).getByText('Correct')).toBeInTheDocument();
  fireEvent.click(within(article).getByRole('button',{name:'Reset'}));
  expect(within(article).queryByText('Correct')).toBeNull();
  fireEvent.click(screen.getByRole('button',{name:'Clear question filters'}));
  expect(screen.getByText('186 matching draft questions')).toBeInTheDocument();
  expect(screen.getAllByRole('article')).toHaveLength(6);
  fireEvent.click(screen.getByRole('button',{name:'Next questions'}));
  expect(screen.getByText('Page 2 of 31')).toBeInTheDocument();
 });
});

it('runs a focused preview and reviews missed answers without writing grades',()=>{render(<FormativeQuestionLibrary/>);fireEvent.click(screen.getByRole('button',{name:'Explore question library'}));fireEvent.change(screen.getByLabelText('Search practice questions'),{target:{value:'UP-FQ3-MATHS-01'}});fireEvent.click(screen.getByRole('button',{name:'Focused practice',exact:true}));fireEvent.click(screen.getByRole('button',{name:'Start practice (1 available)'}));const studio=screen.getByRole('region',{name:'Focused practice preview'});expect(within(studio).getByRole('progressbar')).toHaveAttribute('aria-valuenow','0');fireEvent.click(within(studio).getByRole('radio',{name:/\. 7$/}));fireEvent.click(within(studio).getByRole('button',{name:'Check practice answer'}));expect(within(studio).getByRole('progressbar')).toHaveAttribute('aria-valuenow','1');fireEvent.click(within(studio).getByRole('button',{name:'Finish practice'}));expect(within(studio).getByText('0 / 1 correct')).toBeInTheDocument();fireEvent.click(within(studio).getByRole('button',{name:'Review missed questions (1)'}));expect(within(studio).getByText(/Correct answer:/)).toBeInTheDocument();fireEvent.click(within(studio).getByRole('button',{name:'Practise missed questions'}));expect(within(studio).getByRole('progressbar')).toHaveAttribute('aria-valuenow','0');});
