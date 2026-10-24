// Shared validation only. Payment confirmation still requires provider verification.
export function invoicePaymentMinorUnits(invoice:{student_id:string|null;status:string;amount:unknown;paid:unknown},userId:string,requested?:unknown):number {
 if(invoice.student_id!==userId)throw Error('Only your own student invoice can be paid here');
 if(!['pending','partial','overdue'].includes(invoice.status))throw Error('This invoice is not open for payment');
 const amount=Number(invoice.amount),paid=Number(invoice.paid??0);
 if(!Number.isFinite(amount)||!Number.isFinite(paid)||amount<0||paid<0)throw Error('Invoice balance requires finance review');
 const balance=amount-paid;
 if(balance<=0)throw Error('This invoice has no outstanding balance');
 const payment=requested===undefined?balance:Number(requested);
 if(!Number.isFinite(payment)||payment<=0||payment>balance)throw Error('Payment must be positive and no greater than the outstanding balance');
 const minor=Math.round(payment*100);
 if(!Number.isSafeInteger(minor)||minor<=0||Math.abs(payment*100-minor)>1e-7)throw Error('Payment amount is outside supported limits');
 return minor;
}
