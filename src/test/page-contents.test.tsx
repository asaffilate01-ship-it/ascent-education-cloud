import {cleanup,render,screen,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,expect,it} from 'vitest';
import PageContents from '@/components/PageContents';
afterEach(cleanup);
function Page({titles}:{titles:string[]}){return <MemoryRouter><main><header><h2>Header only</h2></header><PageContents/>{titles.map(title=><h2 key={title}>{title}</h2>)}</main></MemoryRouter>;}
it('removes obsolete catalogue links and adds new headings after results change',async()=>{
 const view=render(<Page titles={['Sewing','Ceramics']}/>);
 const sewing=await screen.findByRole('link',{name:'Sewing',hidden:true});const target=sewing.getAttribute('href');
 view.rerender(<Page titles={['Sewing','Selling online']}/>);
 await waitFor(()=>expect(screen.queryByRole('link',{name:'Ceramics',hidden:true})).toBeNull());
 expect(await screen.findByRole('link',{name:'Selling online',hidden:true})).toHaveAttribute('href',expect.stringMatching(/^#page-section-/));
 expect(screen.getByRole('link',{name:'Sewing',hidden:true})).toHaveAttribute('href',target);
 expect(screen.queryByRole('link',{name:'Header only',hidden:true})).toBeNull();
});
it('avoids existing IDs and preserves explicit section anchors',async()=>{
 render(<MemoryRouter><main><div id="page-section-1"/><PageContents/><h2>Crafts</h2><h2 id="women-enterprise">Women’s enterprise</h2></main></MemoryRouter>);
 const link=await screen.findByRole('link',{name:'Crafts',hidden:true});expect(link).toHaveAttribute('href','#page-section-2');
 expect(screen.getByRole('link',{name:'Women’s enterprise',hidden:true})).toHaveAttribute('href','#women-enterprise');
 expect(document.querySelectorAll('#page-section-1')).toHaveLength(1);
});
it('updates heading text and clears the menu when no headings remain',async()=>{
 const view=render(<MemoryRouter><main><PageContents/><h2 id="fixed">Old title</h2></main></MemoryRouter>);
 await screen.findByRole('link',{name:'Old title',hidden:true});
 view.rerender(<MemoryRouter><main><PageContents/><h2 id="fixed">New title</h2></main></MemoryRouter>);
 expect(await screen.findByRole('link',{name:'New title',hidden:true})).toHaveAttribute('href','#fixed');
 view.rerender(<MemoryRouter><main><PageContents/></main></MemoryRouter>);
 await waitFor(()=>expect(screen.queryAllByRole('link',{hidden:true})).toHaveLength(0));
});
