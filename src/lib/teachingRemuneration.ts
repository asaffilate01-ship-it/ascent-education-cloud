// Planning-only gross remuneration. Rates are in PKR, calculated in integer paisa.
export type RateBasis='hourly'|'session';
export function teachingRemuneration(basis:RateBasis,rate:string,minutes:string,sessions:string){
 if(!/^\d{1,7}(?:\.\d{1,2})?$/.test(rate.trim()))return null;
 const [whole,fraction='']=rate.trim().split('.');
 const ratePaisa=Number(whole)*100+Number(fraction.padEnd(2,'0'));
 if(ratePaisa<=0||!Number.isSafeInteger(ratePaisa))return null;
 const quantity=basis==='hourly'?minutes:sessions;
 if(!/^\d{1,5}$/.test(quantity.trim()))return null;
 const count=Number(quantity);
 if(basis==='hourly'&&count>44640||basis==='session'&&count>1000)return null;
 const gross=basis==='hourly'?Math.round(ratePaisa*count/60):ratePaisa*count;
 return Number.isSafeInteger(gross)?{grossPaisa:gross,ratePaisa,quantity:count}:null;
}
export const formatPkrPaisa=(paisa:number)=>'PKR '+(paisa/100).toLocaleString('en-PK',{minimumFractionDigits:2,maximumFractionDigits:2});
