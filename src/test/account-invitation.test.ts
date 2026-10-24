import {expect,it} from 'vitest';
import {invitationOutcome} from '@/lib/accountInvitation';
it('requires explicit recognised success and honest email status',async()=>{
 for(const status of ['invited','access_assigned','already_assigned'])expect(await invitationOutcome({data:{success:true,status,emailSent:status==='invited'},error:null})).toBe(status);
 for(const data of [null,{success:true},{success:true,status:'queued',emailSent:false},{success:true,status:'invited',emailSent:false},{success:true,status:'access_assigned',emailSent:true}])await expect(invitationOutcome({data,error:null})).rejects.toThrow('did not confirm');
});
it('preserves actionable server errors from function HTTP responses',async()=>{
 await expect(invitationOutcome({data:null,error:{context:new Response(JSON.stringify({error:'Invitation email issued, but access assignment failed. Retry the same account.'}),{status:409})}})).rejects.toThrow('email issued');
 await expect(invitationOutcome({data:null,error:{context:new Response('Not JSON',{status:429})}})).rejects.toThrow('could not be confirmed');
});
