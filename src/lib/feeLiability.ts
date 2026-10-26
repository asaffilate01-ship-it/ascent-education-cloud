export function feeLiability(invoice:{amount:unknown;paid:unknown;sponsor_amount?:unknown;sponsor_paid?:unknown}){
 const total=Number(invoice.amount),paid=Number(invoice.paid??0),cover=Number(invoice.sponsor_amount??0),received=Number(invoice.sponsor_paid??0);
 if([total,paid,cover,received].some(n=>!Number.isFinite(n)||n<0)||cover>total||received>cover)throw Error('Fee agreement requires finance review.');
 return {studentTotal:Math.max(0,total-cover),studentDue:Math.max(0,total-cover-paid),sponsorDue:Math.max(0,cover-received),totalDue:Math.max(0,total-paid-received)};
}
