import {expect,it} from 'vitest';
import {strToU8,zipSync,Zip,ZipDeflate} from 'fflate';
import {extractDocxText,parseDocxDocument,DOCX_XML_LIMIT} from '@/lib/assessment/docxText';
const ns='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const document=(body:string)=>`<w:document xmlns:w="${ns}"><w:body>${body}</w:body></w:document>`;
const paragraph=(text:string)=>`<w:p><w:r><w:t>${text}</w:t></w:r></w:p>`;
const archive=(xml:string)=>zipSync({'word/document.xml':strToU8(xml),'word/media/image.png':new Uint8Array([1,2,3])});
it('extracts local paragraphs and table coordinates without rendering HTML or following hyperlinks',async()=>{
 const text=await extractDocxText(archive(document(paragraph('Introduction')+`<w:tbl><w:tr><w:tc>${paragraph('Cost comparison')}</w:tc><w:tc>${paragraph('&lt;img src="https://example.com/private"&gt;')}</w:tc></w:tr></w:tbl><w:p><w:hyperlink><w:r><w:t>Plain link text</w:t></w:r></w:hyperlink></w:p>`)));
 expect(text).toContain('Paragraph 1: Introduction');
 expect(text).toContain('Table 1, row 1, cell 1, paragraph 2: Cost comparison');
 expect(text).toContain('<img src="https://example.com/private">');expect(text).toContain('Plain link text');
});
it('preserves tabs/line breaks, ignores shapes and supports strict Word namespaces',()=>{
 const xml=document('<w:p><w:r><w:t>One</w:t><w:tab/><w:t>Two</w:t><w:br/><w:t>Three</w:t></w:r><w:drawing><w:p><w:r><w:t>Shape text</w:t></w:r></w:p></w:drawing></w:p>');
 expect(parseDocxDocument(xml)).toBe('Paragraph 1: One\tTwo\nThree');
 expect(parseDocxDocument(xml.replace(ns,'http://purl.oclc.org/ooxml/wordprocessingml/main'))).toContain('One');
});
it('rejects corrupt archives, missing main text, empty documents and unsafe XML declarations',async()=>{
 for(const bytes of [new Uint8Array([1,2,3]),zipSync({'other.xml':strToU8('not Word')}),archive(document('')),archive('<broken>'),archive('<!DOCTYPE a [<!ENTITY x SYSTEM "https://example.com">]>'+document(paragraph('&x;')))]){
  await expect(extractDocxText(bytes)).rejects.toThrow('Download the original');
 }
});
it('refuses tracked revisions and imported chunks rather than presenting an ambiguous final version',()=>{
 for(const tag of ['ins','del','moveFrom','moveTo','altChunk'])expect(()=>parseDocxDocument(document(`<w:${tag}>${paragraph('Unresolved revision')}</w:${tag}>`))).toThrow('Download the original');
});
it('bounds archive bytes, declared XML size, paragraph count, output size and cancellation',async()=>{
 await expect(extractDocxText(new Uint8Array(20*1024*1024+1))).rejects.toThrow();
 await expect(extractDocxText(archive('x'.repeat(DOCX_XML_LIMIT+1)))).rejects.toThrow();
 expect(()=>parseDocxDocument(document(paragraph('Some text').repeat(2001)))).toThrow();
 expect(()=>parseDocxDocument(document(paragraph('x'.repeat(100001))))).toThrow();
 const controller=new AbortController();controller.abort();
 await expect(extractDocxText(archive(document(paragraph('Private'))),controller.signal)).rejects.toThrow();
});
it('bounds expansion when a streamed ZIP omits the declared XML size',async()=>{
 const chunks:Uint8Array[]=[];const zip=new Zip((e,data)=>{if(e)throw e;chunks.push(data);});
 const entry=new ZipDeflate('word/document.xml');zip.add(entry);entry.push(strToU8('x'.repeat(DOCX_XML_LIMIT+1)),true);zip.end();
 const bytes=new Uint8Array(chunks.reduce((n,c)=>n+c.length,0));let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
 await expect(extractDocxText(bytes)).rejects.toThrow('Download the original');
});
it('rejects excessive XML nesting and ambiguous duplicate main-document entries',async()=>{
 expect(()=>parseDocxDocument(document('<w:sdt>'.repeat(65)+paragraph('Deep')+'</w:sdt>'.repeat(65)))).toThrow();
 const ambiguous=document(paragraph('First')).replace('</w:document>',`<w:body>${paragraph('Second')}</w:body></w:document>`);
 expect(()=>parseDocxDocument(ambiguous)).toThrow();
 const chunks:Uint8Array[]=[];const zip=new Zip((e,data)=>{if(e)throw e;chunks.push(data);});
 for(let i=0;i<2;i++){const file=new ZipDeflate('word/document.xml');zip.add(file);file.push(strToU8(document(paragraph('Duplicate'))),true);}zip.end();
 const bytes=new Uint8Array(chunks.reduce((n,c)=>n+c.length,0));let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
 await expect(extractDocxText(bytes)).rejects.toThrow();
});
