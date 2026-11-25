import {useState} from 'react';
import {Calculator,Info} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {calculateStudyBudget,initialStudyBudget,studyCurrencies,type StudyBudgetInput} from '@/lib/studyBudget';

const fields:{key:keyof StudyBudgetInput;label:string;placeholder:string;help:string}[]=[
 {key:'tuition',label:'Total tuition for your planned study period',placeholder:'Enter amount',help:'Use the institution’s current fee quote for the full period.'},
 {key:'living',label:'Monthly living costs',placeholder:'Enter amount',help:'Include accommodation, food, transport and everyday expenses.'},
 {key:'months',label:'Number of months',placeholder:'12',help:'Enter 1–120 whole months.'},
 {key:'other',label:'Other one-off costs',placeholder:'Enter amount',help:'Include travel, insurance, application fees and other expected costs.'},
 {key:'funding',label:'Confirmed funding or scholarships',placeholder:'0',help:'Include only funding you can reasonably rely on.'},
 {key:'reserve',label:'Contingency reserve (%)',placeholder:'10',help:'Adjust the allowance for unexpected expenses, from 0–100%.'},
];
export default function StudyBudgetPlanner({destination}:{destination:keyof typeof studyCurrencies}){
 const currency=studyCurrencies[destination];
 const [inputs,setInputs]=useState<StudyBudgetInput>(initialStudyBudget);
 const result=calculateStudyBudget(inputs);
 const format=(amount:number)=>new Intl.NumberFormat('en',{style:'currency',currency,currencyDisplay:'code',maximumFractionDigits:2}).format(amount);
 return <section aria-labelledby="study-budget-heading" className="rounded-2xl border bg-card p-5 sm:p-8">
  <div className="flex items-start gap-3"><Calculator aria-hidden="true" className="mt-1 size-6 shrink-0 text-success"/><div><p className="text-label text-success">Financial planning</p><h2 id="study-budget-heading" className="mt-2 text-2xl font-bold">Build your study budget</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Enter your own estimates in {currency}. No live exchange rates, university fee quotes or official visa funding thresholds are assumed.</p></div></div>
  <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
   <fieldset className="min-w-0"><legend className="sr-only">Study cost assumptions</legend><div className="grid gap-4 sm:grid-cols-2">{fields.map(field=><label className="block min-w-0 text-sm font-semibold" key={field.key}>{field.label}<input aria-describedby={'budget-help-'+field.key} inputMode={field.key==='months'?'numeric':'decimal'} value={inputs[field.key]} placeholder={field.placeholder} onChange={e=>setInputs(old=>({...old,[field.key]:e.target.value}))} className="mt-2 block min-h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3 py-2 text-base font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /><span id={'budget-help-'+field.key} className="mt-1 block text-xs font-normal leading-relaxed text-muted-foreground">{field.help}</span></label>)}</div><Button type="button" variant="outline" className="mt-4" onClick={()=>setInputs(initialStudyBudget)}>Reset estimates</Button></fieldset>
   <div className="min-w-0 rounded-xl border bg-muted/30 p-5"><h3 className="font-bold">Estimated cost summary</h3>{result?<dl aria-live="polite" className="mt-4 space-y-3 text-sm">{[['Living costs for full period',result.livingTotal],['Subtotal before reserve',result.subtotal],['Contingency reserve',result.contingency],['Estimated total',result.total],['Remaining funding gap',result.fundingGap]].map(([label,value])=><div key={label} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-2 last:border-0"><dt>{label}</dt><dd className="break-all font-bold tabular-nums">{format(Number(value))}</dd></div>)}</dl>:<p role="status" className="mt-4 text-sm text-muted-foreground">Enter all amounts (use 0 where applicable), a valid number of months, and a reserve percentage to calculate your estimate. Amounts must be non-negative, with at most two decimal places.</p>}<p className="mt-5 flex gap-2 text-xs leading-relaxed text-muted-foreground"><Info aria-hidden="true" className="size-4 shrink-0"/>This is a personal planning estimate, not proof of available funds or visa eligibility. Confirm official requirements independently.</p></div>
  </div>
 </section>;
}
