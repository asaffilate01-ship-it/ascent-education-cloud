import {useEffect,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import {ShieldCheck,ShieldAlert,Search,Loader2,ArrowLeft} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {db} from '@/lib/db';
import Seo from '@/components/Seo';
import {normaliseCertificateReference,readCertificateStatus,verificationMessage,type CertificateStatusReceipt} from '@/lib/certificateStatus';

export default function CertificateVerification(){
 const [query,setQuery]=useState(''),[result,setResult]=useState<CertificateStatusReceipt|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const active=useRef(true),lock=useRef(false);
 useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
 async function verify(event:React.FormEvent){
  event.preventDefault();if(lock.current)return;
  setResult(null);setError('');
  const reference=normaliseCertificateReference(query);
  if(!reference){setError('Enter the certificate reference exactly as shown on the document (3–80 letters, numbers or reference punctuation).');return;}
  lock.current=true;setBusy(true);
  try{
   const r=await db.rpc('verify_unipathway_certificate_status',{p_number:reference});
   if(r.error)throw Error('Status lookup unavailable');
   const checked=readCertificateStatus(r.data,reference);
   if(active.current)setResult(checked);
  }catch{if(active.current)setError('Certificate verification is currently unavailable. No validity decision has been made. Retry or contact the issuing institution.');}
  finally{lock.current=false;if(active.current)setBusy(false);}
 }
 const message=result&&verificationMessage[result.status];
 return <div className="min-h-dvh bg-background pb-20">
  <Seo title="Verify a certificate — UniPathway" description="Check the recorded status of a certificate reference." canonical="/verify" noindex/>
  <header className="border-b bg-card"><div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-3">
   <Link to="/" className="inline-flex min-h-11 min-w-0 items-center gap-2 rounded-lg text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><ArrowLeft className="size-4 shrink-0" aria-hidden="true"/>UniPathway home</Link>
   <Button asChild variant="outline" className="min-h-11"><Link to="/login">Staff login</Link></Button>
  </div></header>
  <main className="mx-auto w-full min-w-0 max-w-2xl px-4 py-8 sm:py-14">
   <section className="mb-6 space-y-3"><div className="inline-flex rounded-2xl bg-primary/10 p-3 text-primary"><ShieldCheck className="size-7" aria-hidden="true"/></div><h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Verify a certificate</h1><p className="text-sm leading-relaxed text-muted-foreground">Check the current status of a certificate reference in the UniPathway register. No holder names, grades or private academic records are displayed publicly.</p></section>
   <section className="min-w-0 rounded-2xl border bg-card p-4 sm:p-6">
    <form onSubmit={verify} aria-busy={busy} className="space-y-4">
     <label htmlFor="certificate-reference" className="block text-sm font-semibold">Certificate reference</label>
     <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"><Input id="certificate-reference" autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={80} value={query} disabled={busy} onChange={e=>{setQuery(e.target.value);setResult(null);setError('');}} placeholder="Enter the reference on the certificate" className="min-h-11 min-w-0 text-base" aria-describedby="certificate-help"/>
     <Button type="submit" className="min-h-11" disabled={busy||!query.trim()}>{busy?<Loader2 className="mr-2 size-4 animate-spin motion-reduce:animate-none" aria-hidden="true"/>:<Search className="mr-2 size-4" aria-hidden="true"/>}{busy?'Checking…':'Check status'}</Button></div>
     <p id="certificate-help" className="text-xs text-muted-foreground">Use the certificate reference only. Do not enter a name, CNIC, passport number or account password.</p>
    </form>
   </section>
   {busy&&<p role="status" className="mt-4 text-sm">Checking the certificate register…</p>}
   {error&&<div role="alert" className="mt-4 rounded-xl border border-destructive/40 p-4 text-sm"><p className="font-semibold">Unable to confirm status</p><p className="mt-2">{error}</p></div>}
   {result&&message&&<section role="status" className="mt-5 min-w-0 space-y-3 rounded-2xl border bg-card p-4 sm:p-6" aria-label="Certificate status result">
    <div className="flex items-start gap-3">{result.status==='valid'?<ShieldCheck className="mt-1 size-6 shrink-0 text-primary" aria-hidden="true"/>:<ShieldAlert className="mt-1 size-6 shrink-0 text-muted-foreground" aria-hidden="true"/>}<div className="min-w-0"><h2 className="font-semibold text-lg">{message.title}</h2><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{message.detail}</p></div></div>
    <dl className="grid gap-3 border-t pt-3 sm:grid-cols-2"><div className="min-w-0"><dt className="text-xs text-muted-foreground">Checked reference</dt><dd className="mt-1 break-all font-mono text-sm">{result.certificate_number}</dd></div><div><dt className="text-xs text-muted-foreground">Register check date (UTC)</dt><dd className="mt-1 text-sm">{result.checked_on}</dd></div></dl>
   </section>}
   <section className="mt-6 space-y-2 rounded-xl border p-4 text-sm"><h2 className="font-semibold">Need independent verification?</h2><p className="text-muted-foreground">For formal qualification recognition, contact the issuing or awarding organisation. This service does not issue certificates or prove that a centre is accredited.</p><Link to="/contact" className="inline-flex min-h-11 items-center font-medium text-primary underline underline-offset-4">Contact UniPathway</Link></section>
  </main>
 </div>;
}
