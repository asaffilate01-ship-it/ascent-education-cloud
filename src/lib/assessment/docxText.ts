import {Unzip,UnzipInflate,type UnzipFile} from 'fflate';

export const DOCX_XML_LIMIT=2*1024*1024;
const WORD='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const STRICT_WORD='http://purl.oclc.org/ooxml/wordprocessingml/main';
const unavailable=()=>new Error('DOCX text view unavailable. Download the original to review its contents and formatting.');
const check=(signal?:AbortSignal)=>{if(signal?.aborted)throw unavailable();};

/** Extract one bounded XML part. Other ZIP members are never decompressed. */
export async function extractDocxText(bytes:Uint8Array,signal?:AbortSignal):Promise<string>{
 check(signal);
 if(!bytes.length||bytes.length>20*1024*1024)throw unavailable();
 let entries=0,found=false,complete=false,size=0;
 let target:UnzipFile|undefined;
 const chunks:Uint8Array[]=[];
 const unzip=new Unzip(file=>{
  if(++entries>512)throw unavailable();
  if(file.name!=='word/document.xml')return;
  if(found||(file.originalSize!==undefined&&file.originalSize>DOCX_XML_LIMIT))throw unavailable();
  found=true;target=file;
  file.ondata=(error,data,final)=>{
   if(error||size+data.length>DOCX_XML_LIMIT)throw unavailable();
   size+=data.length;chunks.push(data.slice());complete=final;
  };
  file.start();
 });
 unzip.register(UnzipInflate);
 try{
  // Small compressed chunks bound transient expansion; yield for cancellation/paint.
  for(let offset=0;offset<bytes.length;offset+=4096){
   check(signal);unzip.push(bytes.subarray(offset,offset+4096),offset+4096>=bytes.length);
   if(offset%131072===0)await new Promise<void>(resolve=>setTimeout(resolve,0));
  }
  check(signal);
  if(!found||!complete||!size)throw unavailable();
  const xmlBytes=new Uint8Array(size);let offset=0;
  for(const chunk of chunks){xmlBytes.set(chunk,offset);offset+=chunk.length;}
  const xml=new TextDecoder('utf-8',{fatal:true}).decode(xmlBytes);
  return parseDocxDocument(xml);
 }catch{throw unavailable();}finally{target?.terminate();}
}

export function parseDocxDocument(xml:string):string{
 if(xml.length>DOCX_XML_LIMIT||/<!DOCTYPE|<!ENTITY/i.test(xml))throw unavailable();
 const doc=new DOMParser().parseFromString(xml,'application/xml');
 const root=doc.documentElement,ns=root.namespaceURI;
 if(doc.getElementsByTagName('parsererror').length||root.localName!=='document'||![WORD,STRICT_WORD].includes(ns||''))throw unavailable();
 const stack:[Element,number][]=[[root,0]];let nodes=0;
 while(stack.length){const [node,depth]=stack.pop()!;if(++nodes>20000||depth>64)throw unavailable();for(const child of Array.from(node.children))stack.push([child,depth+1]);}
 const elements=(name:string)=>Array.from(doc.getElementsByTagNameNS(ns,name));
 // A flattened text view cannot reliably represent tracked revisions or altChunk imports.
 if(['ins','del','moveFrom','moveTo','altChunk'].some(name=>elements(name).length))throw unavailable();
 const bodies=elements('body');if(bodies.length!==1)throw unavailable();const body=bodies[0];
 const tables=elements('tbl');
 const ancestor=(node:Element,name:string)=>{let parent=node.parentElement;while(parent&&parent!==body){if(parent.namespaceURI===ns&&parent.localName===name)return parent;parent=parent.parentElement;}return null;};
 const skipped=new Set(['drawing','pict','object','txbxContent']);
 const read=(node:Element):string=>{
  if(node.namespaceURI===ns&&skipped.has(node.localName))return '';
  if(node.namespaceURI===ns&&node.localName==='t')return node.textContent||'';
  if(node.namespaceURI===ns&&node.localName==='tab')return '\t';
  if(node.namespaceURI===ns&&['br','cr'].includes(node.localName))return '\n';
  return Array.from(node.children).map(read).join('');
 };
 const paragraphs=Array.from(body.getElementsByTagNameNS(ns,'p'));
 if(paragraphs.length>2000)throw unavailable();
 const output:string[]=[];let length=0;
 for(let i=0;i<paragraphs.length;i++){
  const p=paragraphs[i];if([...skipped].some(name=>ancestor(p,name)))continue;
  const text=read(p).trim();if(!text)continue;
  let label=`Paragraph ${i+1}`;
  const cell=ancestor(p,'tc'),row=ancestor(p,'tr'),table=ancestor(p,'tbl');
  if(cell&&row&&table){
   const rows=Array.from(table.children).filter(n=>n.localName==='tr');
   const cells=Array.from(row.children).filter(n=>n.localName==='tc');
   if(rows.indexOf(row)<0||cells.indexOf(cell)<0)throw unavailable();
   label=`Table ${tables.indexOf(table)+1}, row ${rows.indexOf(row)+1}, cell ${cells.indexOf(cell)+1}, paragraph ${i+1}`;
  }
  length+=label.length+text.length;if(length>100000)throw unavailable();
  output.push(`${label}: ${text}`);
 }
 if(!output.length)throw unavailable();
 return output.join('\n\n');
}
