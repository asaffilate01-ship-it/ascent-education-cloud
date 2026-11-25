export const studyCurrencies = {pakistan:'PKR',uk:'GBP',germany:'EUR',usa:'USD',canada:'CAD',australia:'AUD'} as const;

export type StudyBudgetInput = {tuition:string;living:string;months:string;other:string;funding:string;reserve:string};
export const initialStudyBudget:StudyBudgetInput={tuition:'',living:'',months:'12',other:'',funding:'0',reserve:'10'};

function amount(raw:string,max:number,integer=false):number|null {
 const value=raw.trim();
 if(!value||!(integer?/^\d+$/:/^\d+(\.\d{1,2})?$/).test(value))return null;
 const n=Number(value);
 return Number.isFinite(n)&&n>=0&&n<=max?n:null;
}
const round=(n:number)=>Math.round((n+Number.EPSILON)*100)/100;

export function calculateStudyBudget(input:StudyBudgetInput){
 const tuition=amount(input.tuition,1000000000),living=amount(input.living,1000000000),months=amount(input.months,120,true),other=amount(input.other,1000000000),funding=amount(input.funding,1000000000),reserve=amount(input.reserve,100);
 if(tuition===null||living===null||months===null||months<1||other===null||funding===null||reserve===null)return null;
 const livingTotal=round(living*months);
 const subtotal=round(tuition+livingTotal+other);
 const contingency=round(subtotal*reserve/100);
 const total=round(subtotal+contingency);
 return {livingTotal,subtotal,contingency,total,fundingGap:round(Math.max(0,total-funding))};
}
