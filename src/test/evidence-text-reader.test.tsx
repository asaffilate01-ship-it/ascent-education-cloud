import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import EvidenceTextReader from '@/components/assessment/EvidenceTextReader';
import EvidenceReview from '@/components/assessment/EvidenceReview';
afterEach(cleanup);
const text='First method uses a table.\nSecond METHOD compares costs.\nA literal [a+b] example.\nNo relevant content.';
it('finds case-insensitive literal text without hiding or changing source lines',()=>{
 render(<EvidenceTextReader text={text}/>);
 fireEvent.change(screen.getByLabelText('Find in submitted text'),{target:{value:' method '}});
 expect(screen.getByRole('status')).toHaveTextContent('Match 1 of 2 matching lines · line 1');
 fireEvent.click(screen.getByRole('button',{name:'Next match'}));
 expect(screen.getByRole('status')).toHaveTextContent('Match 2 of 2 matching lines · line 2');
 fireEvent.click(screen.getByRole('button',{name:'Next match'}));
 expect(screen.getByRole('status')).toHaveTextContent('Match 1 of 2');
 fireEvent.click(screen.getByRole('button',{name:'Previous match'}));
 expect(screen.getByRole('status')).toHaveTextContent('line 2');
 expect(within(screen.getByLabelText('Numbered submitted text')).getAllByRole('listitem')).toHaveLength(4);
 fireEvent.change(screen.getByLabelText('Find in submitted text'),{target:{value:'[a+b]'}});
 expect(screen.getByRole('status')).toHaveTextContent('Match 1 of 1 matching lines · line 3');
 expect(screen.queryByRole('button',{name:'Select matching line for citation'})).toBeNull();
});
it('supports keyboard navigation and empty-result recovery without moving focus',()=>{
 render(<EvidenceTextReader text={text}/>);
 const input=screen.getByLabelText('Find in submitted text');input.focus();
 fireEvent.change(input,{target:{value:'method'}});fireEvent.keyDown(input,{key:'Enter'});
 expect(input).toHaveFocus();expect(screen.getByRole('status')).toHaveTextContent('line 2');
 fireEvent.keyDown(input,{key:'Enter',shiftKey:true});expect(screen.getByRole('status')).toHaveTextContent('line 1');
 fireEvent.change(input,{target:{value:'missing'}});expect(screen.getByRole('status')).toHaveTextContent('No matching lines');
 expect(screen.getByRole('button',{name:'Next match'})).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'Clear evidence search'}));
 expect(input).toHaveValue('');expect(input).toHaveFocus();
 fireEvent.change(input,{target:{value:'costs'}});fireEvent.keyDown(input,{key:'Escape'});
 expect(input).toHaveValue('');expect(screen.getByRole('status')).toHaveTextContent('4 source lines');
});
it('requires a separate action to copy a selected search result to a criterion',()=>{
 const cite=vi.fn().mockReturnValue(true);
 render(<EvidenceReview text={text} criteria={[{criterion_code:'A'}]} onCite={cite}/>);
 fireEvent.change(screen.getByLabelText('Find in submitted text'),{target:{value:'compares'}});
 expect(cite).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Select matching line for citation'}));
 expect(screen.getByLabelText('From line')).toHaveValue(2);expect(screen.getByLabelText('To line')).toHaveValue(2);
 expect(cite).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Use selected lines as evidence'}));
 expect(cite).toHaveBeenCalledWith('A','Submitted text, lines 2–2: “Second METHOD compares costs.”');
 expect(screen.getByText(/Evidence copied to A/)).toHaveTextContent('Save your marking draft');
});
it('does not announce a declined replacement as a copied citation',()=>{
 const cite=vi.fn().mockReturnValue(true);
 render(<EvidenceReview text={text} criteria={[{criterion_code:'A'}]} onCite={cite}/>);
 fireEvent.click(screen.getByText('Use selected lines as evidence'));
 expect(screen.getByText(/Evidence copied to A/)).toBeInTheDocument();
 cite.mockReturnValue(false);fireEvent.click(screen.getByText('Use selected lines as evidence'));
 expect(screen.queryByText(/Evidence copied to A/)).toBeNull();
 expect(screen.getByText(/Your existing criterion evidence is unchanged/)).toBeInTheDocument();
});
it('retains evidence limits and offers read-only navigation without marking controls',()=>{
 const view=render(<EvidenceReview text={'Long '+ 'x'.repeat(901)} criteria={[{criterion_code:'A'}]} onCite={()=>true}/>);
 expect(screen.getByText('Use selected lines as evidence')).toBeDisabled();
 view.rerender(<EvidenceReview text={text} criteria={[{criterion_code:'A'}]}/>);
 expect(screen.getByLabelText('Find in submitted text')).toBeInTheDocument();
 expect(screen.queryByText('Use selected lines as evidence')).toBeNull();
});
it('highlights every literal occurrence while preserving source case, Unicode and markup as text',()=>{
 const source='😀 METHOD method [a+b] <script> İ and K\n';
 const {container}=render(<EvidenceTextReader text={source}/>);
 const input=screen.getByLabelText('Find in submitted text');
 fireEvent.change(input,{target:{value:'method'}});
 expect(Array.from(container.querySelectorAll('mark')).map(el=>el.textContent)).toEqual(['METHOD','method']);
 expect(screen.getByRole('status')).toHaveTextContent('1 matching lines');
 expect(screen.getByRole('listitem',{current:true})).toHaveTextContent(source.trim());
 fireEvent.change(input,{target:{value:'[a+b]'}});
 expect(container.querySelector('mark')).toHaveTextContent('[a+b]');
 fireEvent.change(input,{target:{value:'<script>'}});
 expect(container.querySelector('mark')).toHaveTextContent('<script>');
 expect(container.querySelector('script')).toBeNull();
 fireEvent.change(input,{target:{value:'İ'}});
 expect(container.querySelector('mark')).toHaveTextContent('İ');
 fireEvent.change(input,{target:{value:'k'}});
 expect(container.querySelector('mark')).toHaveTextContent('K');
 fireEvent.click(screen.getByRole('button',{name:'Clear evidence search'}));
 expect(container.querySelectorAll('mark')).toHaveLength(0);
 expect(screen.getByLabelText('Numbered submitted text')).toHaveAttribute('tabindex','0');
});
it('reveals initial and subsequent matches by scrolling only the evidence pane and retaining input focus',()=>{
 const rect=vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockImplementation(function(this:HTMLElement){
  const top=this.tagName==='OL'?100:this.getAttribute('aria-current')==='true'?600:0;
  return {top,bottom:top+(this.tagName==='OL'?200:30),left:0,right:400,width:400,height:30,x:0,y:top,toJSON:()=>({})};
 });
 try{
  render(<EvidenceTextReader text={'first method\nsecond method'}/>);
  const input=screen.getByLabelText('Find in submitted text');input.focus();
  const list=screen.getByLabelText('Numbered submitted text');
  fireEvent.change(input,{target:{value:'method'}});
  expect(list.scrollTop).toBeGreaterThan(0);expect(input).toHaveFocus();
  const initial=list.scrollTop;
  fireEvent.keyDown(input,{key:'Enter'});
  expect(list.scrollTop).toBeGreaterThan(initial);expect(input).toHaveFocus();
 }finally{rect.mockRestore();}
});
