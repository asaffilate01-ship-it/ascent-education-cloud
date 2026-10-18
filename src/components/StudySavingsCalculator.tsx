import { useState } from 'react';
import { Input } from '@/components/ui/input';

const money = (amount: number) => new Intl.NumberFormat('en-GB', {style:'currency',currency:'GBP',maximumFractionDigits:0}).format(amount);
export default function StudySavingsCalculator() {
 const [years,setYears]=useState(2);
 const [alternativeTuition,setAlternativeTuition]=useState('');
 const [alternativeLiving,setAlternativeLiving]=useState('');
 const [alternativeExtras,setAlternativeExtras]=useState('');
 const [uniFee,setUniFee]=useState('');
 const [travel,setTravel]=useState('');
 const [other,setOther]=useState('');
 const [included,setIncluded]=useState(true);
 const number=(value:string)=>Number(value||0);
 const hasCosts=alternativeTuition!==''&&uniFee!=='';
 const elsewhere=years*(number(alternativeTuition)+number(alternativeLiving)+number(alternativeExtras));
 const here=years*(number(uniFee)+number(travel)+number(other));
 const savings=elsewhere-here;
 return <section className="rounded-2xl border bg-card p-5 sm:p-8 space-y-5" aria-labelledby="savings-heading">
 <div><p className="text-xs font-bold uppercase tracking-wider text-success">Illustrative cost comparison</p><h2 id="savings-heading" className="mt-2 text-2xl font-bold">What could your study pathway cost?</h2><p className="mt-2 text-sm text-muted-foreground">Use your own quotations to compare costs. No course prices or percentage savings are assumed. Figures are examples, not a fee quote or financial guarantee. Compare equivalent programmes, study duration and what is included.</p></div>
 <label className="block text-sm font-medium">Study period in years<select className="mt-1 w-full rounded-md border bg-background p-2" value={years} onChange={e=>setYears(Number(e.target.value))}>{[1,2,3,4].map(y=><option value={y} key={y}>{y} {y===1?'year':'years'}</option>)}</select></label>
 <div className="grid gap-6 md:grid-cols-2">
 <fieldset className="space-y-3"><legend className="text-lg font-semibold">Alternative study option (GBP per year)</legend>
 {[['Tuition / course fee',alternativeTuition,setAlternativeTuition],['Accommodation and food',alternativeLiving,setAlternativeLiving],['Travel and other expenses',alternativeExtras,setAlternativeExtras]].map(([label,value,setter])=><label key={label as string} className="block text-sm">{label as string}<Input inputMode="decimal" type="number" min="0" step="0.01" value={value as string} onChange={e=>(setter as (value:string)=>void)(e.target.value)} className="mt-1" placeholder="Enter a verified estimate"/></label>)}</fieldset>
 <fieldset className="space-y-3"><legend className="text-lg font-semibold">UniPathway study option (GBP per year)</legend>
 {[['Quoted course fee',uniFee,setUniFee],['Travel and visas, if applicable',travel,setTravel],['Other expenses not included',other,setOther]].map(([label,value,setter])=><label key={label as string} className="block text-sm">{label as string}<Input inputMode="decimal" type="number" min="0" step="0.01" value={value as string} onChange={e=>(setter as (value:string)=>void)(e.target.value)} className="mt-1" placeholder="Enter a verified quote"/></label>)}</fieldset>
 </div>
 <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={included} onChange={e=>setIncluded(e.target.checked)} className="mt-1"/><span>The UniPathway quote includes the stated residential meals and accommodation. Check the actual offer before relying on this.</span></label>
 <div role="status" aria-live="polite" className="rounded-xl bg-secondary p-5">{hasCosts?<><p className="text-sm text-muted-foreground">Estimated alternative total: {money(elsewhere)} · UniPathway total: {money(here)}</p><p className="mt-2 text-2xl font-bold">{savings>=0?'Potential difference':'UniPathway costs more in this comparison'}: {money(Math.abs(savings))}</p>{savings>=0&&elsewhere>0&&<p className="mt-1 text-sm">{Math.round(savings/elsewhere*100)}% lower than the entered alternative</p>}</>:<p className="text-sm text-muted-foreground">Enter at least an alternative tuition amount and a UniPathway course quote to see your comparison.</p>}<p className="mt-3 text-xs text-muted-foreground">Illustrative only. No costs are verified by this tool; check accommodation, meals, examination fees, travelling, exchange rates, visa rules and institutional requirements. {included?'Residential inclusions must be confirmed in writing.':'You have not confirmed that residential inclusions apply.'}</p></div>
 </section>;
}
