import {fireEvent,render,screen} from '@testing-library/react';
import {describe,it,expect,vi} from 'vitest';
import CloudCodingSandbox from '@/pages/coding/CloudCodingSandbox';
vi.mock('@/components/layout/DashboardLayout',()=>({default:({children,actions}:any)=><main>{actions}{children}</main>}));
describe('coding workspace',()=>{
 it('retains each language draft and only updates HTML when Run is pressed',()=>{
  render(<CloudCodingSandbox/>);
  const editor=screen.getByRole('textbox',{name:'Code editor'});
  fireEvent.change(editor,{target:{value:'<h1>My draft</h1>'}});
  expect(screen.getByTitle('HTML Preview').getAttribute('srcdoc')).not.toContain('My draft');
  fireEvent.click(screen.getByRole('button',{name:'Run'}));
  expect(screen.getByTitle('HTML Preview').getAttribute('srcdoc')).toContain('My draft');
  fireEvent.click(screen.getByRole('button',{name:'Python'}));
  expect(screen.getByRole('textbox',{name:'Program input'})).toBeInTheDocument();
  fireEvent.change(editor,{target:{value:'print(42)'}});
  fireEvent.click(screen.getByRole('button',{name:'HTML/CSS/JS'}));
  expect(editor).toHaveValue('<h1>My draft</h1>');
  fireEvent.click(screen.getByRole('button',{name:'Python'}));
  expect(editor).toHaveValue('print(42)');
 });
 it('stops a run and ignores completion from other windows',()=>{
  render(<CloudCodingSandbox/>);
  fireEvent.click(screen.getByRole('button',{name:'JavaScript'}));
  fireEvent.click(screen.getByRole('button',{name:'Run'}));
  expect(screen.getByTitle('Isolated code execution sandbox')).toHaveAttribute('sandbox','allow-scripts');
  fireEvent(window,new MessageEvent('message',{data:{kind:'unipathway-code',phase:'done',output:'untrusted'},origin:'null'}));
  expect(screen.queryByText('untrusted')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Stop'}));
  expect(screen.queryByTitle('Isolated code execution sandbox')).not.toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('Stopped');
 });
});
