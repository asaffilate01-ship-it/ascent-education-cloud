import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import PdfEvidencePreview from '@/components/assessment/PdfEvidencePreview';
const state=vi.hoisted(()=>({getPage:vi.fn(),destroy:vi.fn(),cancel:vi.fn()}));
vi.mock('pdfjs-dist',()=>({GlobalWorkerOptions:{workerSrc:''},getDocument:()=>({promise:Promise.resolve({numPages:2,getPage:state.getPage}),destroy:state.destroy})}));
beforeEach(()=>{
 vi.clearAllMocks();state.destroy.mockResolvedValue(undefined);
 state.getPage.mockImplementation(async(page:number)=>({getViewport:()=>({width:600,height:800}),render:()=>({promise:Promise.resolve(),cancel:state.cancel}),getTextContent:async()=>({items:[{str:`Page ${page} method`,hasEOL:true},{str:'Next line compares costs.',hasEOL:false}]})}));
});
afterEach(cleanup);
it('preserves extracted line endings, searches only this page and keeps search through zoom',async()=>{
 const pages=vi.fn();const view=render(<PdfEvidencePreview url="blob:private" page={1} onPages={pages}/>);
 await screen.findByLabelText('Document page 1');
 await screen.findByLabelText('Find in this page text');
 expect(pages).toHaveBeenCalledWith(2);
 fireEvent.change(screen.getByLabelText('Find in this page text'),{target:{value:'compares'}});
 expect(screen.getByRole('status')).toHaveTextContent('line 2');
 expect(screen.queryByText('Select matching line for citation')).toBeNull();
 fireEvent.change(screen.getByLabelText('Document zoom'),{target:{value:'200'}});
 expect(screen.getByLabelText('Find in this page text')).toHaveValue('compares');
 expect(screen.getByLabelText('Document page 1')).toHaveStyle({width:'200%'});
 expect(state.getPage).toHaveBeenCalledTimes(1);
 view.rerender(<PdfEvidencePreview url="blob:private" page={2} onPages={pages}/>);
 await screen.findByText('Page 2 method');
 expect(screen.getByLabelText('Find in this page text')).toHaveValue('');
 expect(screen.queryByText('Page 1 method')).toBeNull();
 view.unmount();expect(state.destroy).toHaveBeenCalled();expect(state.cancel).toHaveBeenCalled();
});
it('never presents a scanned page as fully searchable text',async()=>{
 state.getPage.mockResolvedValue({getViewport:()=>({width:600,height:800}),render:()=>({promise:Promise.resolve(),cancel:state.cancel}),getTextContent:async()=>({items:[]})});
 render(<PdfEvidencePreview url="blob:scan" page={1} onPages={()=>{}}/>);
 await screen.findByText('No extractable text on this page.');
 expect(screen.queryByLabelText('Find in this page text')).toBeNull();
 expect(screen.getByText(/Search covers the extracted text on this page only/)).toBeInTheDocument();
 await waitFor(()=>expect(screen.queryByText('Rendering document page…')).toBeNull());
});
