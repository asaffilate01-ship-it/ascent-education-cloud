export const PUBLIC_MESSAGE_ROUTING_ENABLED=import.meta.env.VITE_UNIPATHWAY_PUBLIC_MESSAGES_ENABLED==='true';
export type PublicMessageChannel='admissions'|'recruitment';
export function verifyPublicMessageReceipt(value:unknown,requestId:string,channel:PublicMessageChannel){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Message receipt unavailable');
 const v=value as Record<string,unknown>;
 if(v.ok!==true||v.recorded!==true||v.request_id!==requestId||v.channel!==channel||typeof v.team_accepted!=='boolean'||typeof v.receipt_accepted!=='boolean'||typeof v.retry_available!=='boolean')throw Error('Message receipt did not match the request');
 return {teamAccepted:v.team_accepted,receiptAccepted:v.receipt_accepted,retryAvailable:v.retry_available,complete:v.team_accepted&&v.receipt_accepted};
}
export function publicMessageStatus(receipt:ReturnType<typeof verifyPublicMessageReceipt>,channel:PublicMessageChannel){
 const team=channel==='admissions'?'admissions':'recruitment';
 if(receipt.complete)return 'Message sent. Your message was recorded and the '+team+' email and branded confirmation were accepted for delivery.';
 return 'Your message is recorded. '+(receipt.teamAccepted?'The '+team+' email was accepted for delivery. ':'Team email delivery is not yet confirmed. ')+(receipt.receiptAccepted?'Your confirmation email was accepted for delivery. ':'Your confirmation email is not yet confirmed. ')+(receipt.retryAvailable?'Complete a new security check to retry the same reference.':'Contact the team with your reference; do not submit another copy.');
}
