import {render,screen,fireEvent,cleanup,act} from '@testing-library/react';
import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({roles:['student'],rpc:vi.fn()}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:{id:'student-1',tenantId:'tenant-1',roles:mocks.roles}})}));
vi.mock('@/components/layout/DashboardLayout',()=>({default:({children}:{children:React.ReactNode})=><main>{children}</main>}));
vi.mock('sonner',()=>({toast:{success:vi.fn(),error:vi.fn()}}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{rpc:(...args:unknown[])=>mocks.rpc(...args)}}));
import KnowledgeLibrary from '@/pages/knowledge/KnowledgeLibrary';
afterEach(cleanup);beforeEach(()=>{mocks.roles=['student'];mocks.rpc.mockReset();});
describe('Knowledge source search',()=>{
 it('shows exact text and citations without staff publishing controls',async()=>{
  mocks.rpc.mockResolvedValue({data:[{document_id:'doc-1',chunk_index:1,revision:3,title:'Handbook',excerpt:'Use the institutional LMS for support.',source_reference:'POL-2026',rank:1}],error:null});
  render(<KnowledgeLibrary student/>);expect(screen.queryByRole('button',{name:'Save draft'})).not.toBeInTheDocument();
  fireEvent.change(screen.getByRole('textbox',{name:'Search approved materials'}),{target:{value:'support'}});fireEvent.click(screen.getByRole('button',{name:'Search'}));
  expect(await screen.findByText('Use the institutional LMS for support.')).toBeInTheDocument();
  expect(screen.getByText('Revision 3 · Passage 2 · POL-2026')).toBeInTheDocument();
  expect(mocks.rpc).toHaveBeenCalledWith('search_education_chunks',{p_query:'support',p_limit:10});
 });
 it('does not invent an answer when no source matches',async()=>{
  mocks.rpc.mockResolvedValue({data:[],error:null});render(<KnowledgeLibrary student/>);
  fireEvent.change(screen.getByRole('textbox',{name:'Search approved materials'}),{target:{value:'unknown'}});fireEvent.click(screen.getByRole('button',{name:'Search'}));
  expect(await screen.findByRole('status')).toHaveTextContent('No approved source passages matched');
 });
 it('ignores an in-flight search after the learner changes the query',async()=>{
  let resolveSearch:((result:unknown)=>void)|undefined;
  mocks.rpc.mockImplementation(()=>new Promise(resolve=>{resolveSearch=resolve;}));
  render(<KnowledgeLibrary student/>);
  const input=screen.getByRole('textbox',{name:'Search approved materials'});
  fireEvent.change(input,{target:{value:'withdrawn topic'}});
  fireEvent.click(screen.getByRole('button',{name:'Search'}));
  fireEvent.change(input,{target:{value:'new topic'}});
  await act(async()=>{resolveSearch?.({data:[{document_id:'revoked',chunk_index:0,revision:1,title:'Withdrawn document',excerpt:'Do not display',source_reference:'WITHDRAWN',rank:1}],error:null});});
  expect(screen.queryByText('Do not display')).not.toBeInTheDocument();
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
 });
 it('distinguishes search errors from a legitimate zero-result search',async()=>{
  mocks.rpc.mockResolvedValue({data:null,error:{message:'Unavailable'}});
  render(<KnowledgeLibrary student/>);
  fireEvent.change(screen.getByRole('textbox',{name:'Search approved materials'}),{target:{value:'admissions'}});
  fireEvent.click(screen.getByRole('button',{name:'Search'}));
  expect(await screen.findByRole('alert')).toHaveTextContent('Search is unavailable');
  expect(screen.queryByText(/No approved source passages matched/)).not.toBeInTheDocument();
 });

});
