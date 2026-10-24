export const confirmedAccountStatuses=['invited','access_assigned','already_assigned'] as const;
export function accountConfirmed(status?:string){return confirmedAccountStatuses.includes(status as typeof confirmedAccountStatuses[number]);}
export function accountSettled(status?:string){return accountConfirmed(status)||status==='skipped';}
/** Only explicit server outcomes count as success; an HTTP acknowledgement alone does not. */
export async function invitationOutcome(result:{data:unknown;error:unknown}):Promise<string>{
 const data=result.data as {success?:boolean;status?:string;emailSent?:boolean;error?:string}|null;
 if(result.error||data?.error){
  let message=typeof data?.error==='string'?data.error:'';
  const context=(result.error as {context?:Response}|null)?.context;
  if(!message&&context&&typeof context.json==='function'){
   try{const payload=await context.json();if(typeof payload?.error==='string')message=payload.error;}catch{/* A missing error body must not become success. */}
  }
  throw Error(message.slice(0,500)||'Request could not be confirmed. Check account history before retrying.');
 }
 if(data?.success!==true||!accountConfirmed(data.status)||typeof data.emailSent!=='boolean'||(data.status==='invited')!==data.emailSent)throw Error('The server did not confirm a recognised account outcome. Check account history before retrying.');
 return data.status!;
}
