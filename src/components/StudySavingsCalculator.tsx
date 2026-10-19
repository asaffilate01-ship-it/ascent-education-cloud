import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';

type Currency='GBP'|'PKR'|'EUR'|'USD'|'CAD'|'AUD';
type Costs={tuition:string;living:string;travel:string;extras:string};
const currencies:Currency[]=['PKR','GBP','EUR','USD','CAD','AUD'];
const destinations=['Pakistan','United Kingdom','United States','Canada','Australia','Germany','France','Italy','Spain','Netherlands','Ireland','Belgium','Austria','Portugal','Poland','Sweden','Finland','Other EU country'];
const empty=():Costs=>({tuition:'',living:'',travel:'',extras:''});
const num=(s:string)=>Math.max(0,Number(s)||0);
const total=(c:Costs,years:number)=>years*(num(c.tuition)+num(c.living)+num(c.extras))+num(c.travel);
const money=(n:number,c:Currency)=>new Intl.NumberFormat('en-GB',{style:'currency',currency:c,maximumFractionDigits:0}).format(n);
const Field=({label,value,onChange,hint}:{label:string;value:string;onChange:(v:string)=>void;hint?:string})=><label className="block text-sm font-medium">{label}<Input aria-label={label} className="mt-1" type="number" min="0" step="0.01" inputMode="decimal" placeholder={hint||'Enter your verified estimate'} value={value} onChange={e=>onChange(e.target.value)}/></label>;
export default function StudySavingsCalculator(){
 const [currency,setCurrency]=useState<Currency>('GBP');
 const [destination,setDestination]=useState('United Kingdom');
 const [years,setYears]=useState(3);
 const [pakistanYears,setPakistanYears]=useState(2);
 const [mode,setMode]=useState<'direct'|'pakistan-first'>('pakistan-first');
 const [overseas,setOverseas]=useState<Costs>(empty);
 const [pakistan,setPakistan]=useState<Costs>(empty);
 const [alternative,setAlternative]=useState<Costs>(empty);
 const [rate,setRate]=useState('');
 const [source,setSource]=useState('');
 const [included,setIncluded]=useState(false);
 const update=(setter:React.Dispatch<React.SetStateAction<Costs>>,key:keyof Costs,value:string)=>setter(v=>({...v,[key]:value}));
 const abroadYears=mode==='pakistan-first'?Math.max(0,years-pakistanYears):years;
 const valid=overseas.tuition!==''&&alternative.tuition!==''&&(mode==='direct'||pakistan.tuition!=='');
 const result=useMemo(()=>{
  const ours=total(overseas,abroadYears)+(mode==='pakistan-first'?total(pakistan,pakistanYears):0);
  const theirs=total(alternative,years);
  return {ours,theirs,difference:theirs-ours,percent:theirs>0?(theirs-ours)/theirs*100:0};
 },[overseas,alternative,pakistan,mode,years,pakistanYears,abroadYears]);
 return <section aria-labelledby="savings-heading" className="space-y-5 rounded-2xl border bg-card p-5 sm:p-8">
  <header><p className="text-xs font-bold uppercase tracking-wide text-success">Interactive international study cost comparison</p><h2 id="savings-heading" className="mt-2 text-2xl font-bold">Compare your study costs and progression options</h2><p className="mt-2 text-sm text-muted-foreground">Enter your own verified programme quotes and estimated living expenses. No exchange rates, university acceptance, visa approvals or savings are assumed.</p></header>
  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
   <label className="text-sm font-medium">Destination<select aria-label="Destination" className="mt-1 w-full rounded-md border bg-background p-2" value={destination} onChange={e=>setDestination(e.target.value)}>{destinations.map(x=><option key={x}>{x}</option>)}</select></label>
   <label className="text-sm font-medium">Display currency<select aria-label="Display currency" className="mt-1 w-full rounded-md border bg-background p-2" value={currency} onChange={e=>setCurrency(e.target.value as Currency)}>{currencies.map(x=><option key={x}>{x}</option>)}</select></label>
   <label className="text-sm font-medium">Total planned years<select aria-label="Total planned years" className="mt-1 w-full rounded-md border bg-background p-2" value={years} onChange={e=>{const y=Number(e.target.value);setYears(y);setPakistanYears(v=>Math.min(v,y-1));}}>{[1,2,3,4,5,6].map(x=><option key={x} value={x}>{x} years</option>)}</select></label>
   <label className="text-sm font-medium">Route<select aria-label="Route" className="mt-1 w-full rounded-md border bg-background p-2" value={mode} onChange={e=>setMode(e.target.value as 'direct'|'pakistan-first')}><option value="pakistan-first">Pakistan first, then abroad</option><option value="direct">Entire programme abroad</option></select></label>
  </div>
  {mode==='pakistan-first'&&<label className="block max-w-xs text-sm font-medium">Years studied in Pakistan<select aria-label="Years in Pakistan" className="mt-1 w-full rounded-md border bg-background p-2" value={Math.min(pakistanYears,years-1)} onChange={e=>setPakistanYears(Number(e.target.value))}>{Array.from({length:Math.min(2,years-1)},(_,i)=>i+1).map(y=><option key={y} value={y}>{y} year{y===1?'':'s'}</option>)}</select></label>}
  <p className="text-sm text-muted-foreground">{mode==='pakistan-first'?Math.min(pakistanYears,years-1)+' year(s) in Pakistan + '+abroadYears+' abroad':'All '+years+' years abroad'} in {destination}. Each stage must be separately eligible and approved by the receiving institution. Credit transfer, advanced entry and duration are not guaranteed.</p>
  <div className="grid gap-5 lg:grid-cols-3">
   {([{label:'Full overseas alternative',value:alternative,set:setAlternative,yrs:years},{label:'Your overseas stage',value:overseas,set:setOverseas,yrs:abroadYears},...(mode==='pakistan-first'?[{label:'Your Pakistan stage',value:pakistan,set:setPakistan,yrs:pakistanYears}]:[])]).map(block=><fieldset key={block.label} className="space-y-3 rounded-xl border p-4"><legend className="px-2 font-semibold">{block.label} ({block.yrs} yr)</legend>{(['tuition','living','extras','travel'] as const).map(key=><Field key={key} label={{tuition:'Annual tuition / course fee',living:'Annual accommodation and food',extras:'Annual other costs',travel:'Total travel, visas and one-off fees'}[key]} value={block.value[key]} onChange={v=>update(block.set,key,v)}/>)}</fieldset>)}
  </div>
  <p className="text-xs text-muted-foreground">All three columns must use the same selected currency. Changing the currency label does not convert previously entered amounts. Annual figures multiply by years; travel and other one-off fees are added once per stage.</p>
  <details className="rounded-lg border p-4"><summary className="cursor-pointer font-semibold">Optional exchange-rate reference</summary><p className="mt-2 text-sm text-muted-foreground">For cross-currency quotes, obtain a current rate from a trusted provider, convert the quote yourself and enter all costs in one currency. This field records your reference only; it never alters amounts.</p><div className="mt-3 grid gap-3 sm:grid-cols-2"><Field label="Rate used (reference only)" value={rate} onChange={setRate}/><label className="block text-sm font-medium">Rate provider and date<Input className="mt-1" value={source} onChange={e=>setSource(e.target.value)} placeholder="Provider, date and rate pair"/></label></div></details>
  <label className="flex gap-2 text-sm"><input type="checkbox" checked={included} onChange={e=>setIncluded(e.target.checked)}/><span>Accommodation and meals have been confirmed in writing for my chosen UniPathway quote.</span></label>
  <div role="status" aria-live="polite" className="rounded-xl bg-secondary p-5">{valid?<><p className="text-sm">Full overseas alternative: <strong>{money(result.theirs,currency)}</strong></p><p className="mt-1 text-sm">Your selected pathway: <strong>{money(result.ours,currency)}</strong></p><p className="mt-3 text-2xl font-bold">{result.difference>=0?'Illustrative cost difference':'Selected pathway costs more by'}: {money(Math.abs(result.difference),currency)}</p>{result.theirs>0&&<p className="mt-1 text-sm">{Math.abs(result.percent).toFixed(1)}% {result.difference>=0?'lower':'higher'} relative to full overseas study</p>}</>:<p>Enter the tuition estimates for the compared routes to display your calculation.</p>}
  <p className="mt-3 text-xs text-muted-foreground">Illustrative only; not a quotation or financial guarantee. Confirm tuition, exam fees, travel, insurance, visas, exchange rates, accommodation and meals. {included?'Residential inclusions marked as confirmed by you; verify the written offer.':'Accommodation and meals have not been confirmed.'} No university entry or advanced standing is assured.</p></div>
 </section>;
}
