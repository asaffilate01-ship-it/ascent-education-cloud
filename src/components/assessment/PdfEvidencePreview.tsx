import {useEffect,useRef,useState} from 'react';
import type {PDFDocumentProxy,RenderTask} from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import EvidenceTextReader from './EvidenceTextReader';

type Props={url:string;page:number;onPages:(count:number)=>void};
export default function PdfEvidencePreview({url,page,onPages}:Props){
 const [zoom,setZoom]=useState(100);
 const currentZoom=useRef(zoom);currentZoom.current=zoom;
 const host=useRef<HTMLDivElement>(null);
 const [document,setDocument]=useState<PDFDocumentProxy|null>(null),[error,setError]=useState(''),[text,setText]=useState(''),[loading,setLoading]=useState(true);
 useEffect(()=>{
  let active=true;let task:ReturnType<typeof import('pdfjs-dist')['getDocument']>|undefined;
  setDocument(null);setError('');onPages(0);
  void import('pdfjs-dist').then(async pdf=>{
   if(!active)return;
   pdf.GlobalWorkerOptions.workerSrc=workerUrl;
   task=pdf.getDocument({url,useWasm:false,useSystemFonts:true});
   // Password-protected files require an external reader; never leave a pending password prompt.
   task.onPassword=()=>{if(active)setError('This PDF requires a password. Download it to review with your approved reader.');void task?.destroy();};
   const doc=await task.promise;
   if(!active)return;
   setDocument(doc);onPages(doc.numPages);
  }).catch(()=>{if(active)setError('This PDF could not be displayed. Download the original file to review it.');});
  return()=>{active=false;void task?.destroy();};
 },[url,onPages]);
 useEffect(()=>{
  let active=true;let render:RenderTask|undefined;
  const container=host.current;container?.replaceChildren();setText('');setLoading(true);
  if(!document)return;
  if(page<1||page>document.numPages){setLoading(false);return;}
  setError('');
  void (async()=>{
   const pdfPage=await document.getPage(page);if(!active||!container)return;
   const base=pdfPage.getViewport({scale:1});
   // Bound canvas memory for unusually large or malicious page dimensions.
   const scale=Math.min(1.5,1600/Math.max(base.width,base.height));
   const viewport=pdfPage.getViewport({scale});
   const canvas=window.document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
   canvas.className='h-auto';canvas.style.width=`${currentZoom.current}%`;canvas.style.maxWidth='none';canvas.setAttribute('aria-label',`Document page ${page}`);canvas.setAttribute('role','img');
   container.replaceChildren(canvas);
   render=pdfPage.render({canvas,viewport});await render.promise;
   const content=await pdfPage.getTextContent();if(!active)return;
   setText(content.items.map(item=>'str' in item?item.str+(item.hasEOL?'\n':' '):'').join('').slice(0,20000));setLoading(false);
  })().catch(()=>{if(active){setError('This page could not be displayed. Download the original file to review it.');setLoading(false);}});
  return()=>{active=false;render?.cancel();container?.replaceChildren();};
 },[document,page]);
 useEffect(()=>{const canvas=host.current?.querySelector('canvas');if(canvas)canvas.style.width=`${zoom}%`;},[zoom]);
 return <div className="min-w-0 space-y-2">
  <label className="block text-sm">Document zoom<select className="ml-2 h-10 rounded-md border bg-background px-3" value={zoom} onChange={e=>setZoom(Number(e.target.value))}><option value={100}>Fit width</option><option value={150}>150%</option><option value={200}>200%</option><option value={300}>300%</option></select></label>
  {error?<p role="alert" className="text-sm text-destructive">{error}</p>:loading&&<p role="status">Rendering document page…</p>}
  <div ref={host} className="max-h-[65vh] overflow-auto rounded-lg border bg-white"/>
  <details className="text-sm"><summary className="min-h-11 cursor-pointer py-2">Read text from this page</summary>{text?<EvidenceTextReader key={`${url}:${page}`} text={text} searchLabel="Find in this page text" listLabel="Extracted PDF page text"/>:<p>{loading?'Page text is loading…':'No extractable text on this page.'}</p>}<p className="text-muted-foreground">Search covers the extracted text on this page only. Extracted text may omit layout or scanned content; check the page image. Limited to 20,000 characters per page.</p></details>
 </div>;
}
