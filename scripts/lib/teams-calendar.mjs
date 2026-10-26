const uuid=/^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i;
const institutional=/^[a-z0-9._+-]+@unipathway\.pk$/i;
export function calendarConfig(env){
 for(const key of ['UNIPATHWAY_TENANT_ID','MS_TENANT_ID','MS_CLIENT_ID'])if(!uuid.test(env[key]||''))throw Error(`Invalid ${key}`);
 if(env.MS_CALENDAR_ENABLED!=='true'||!env.MS_CLIENT_SECRET)throw Error('Microsoft calendar connector is not enabled/configured');
 return {tenant:env.UNIPATHWAY_TENANT_ID};
}
function email(value){if(typeof value!=='string'||!institutional.test(value))throw Error('preflight_institutional_mailbox_required');return value.toLowerCase();}
function stamp(value){const date=new Date(value);if(!Number.isFinite(date.getTime()))throw Error('preflight_invalid_time');return date.toISOString().replace(/Z$/,'');}
export function calendarPayload(session,attendees){
 const addresses=[...new Set(attendees.map(x=>email(x.email)))].sort();
 if(addresses.length>300)throw Error('preflight_attendee_limit');
 return {subject:session.title,start:{dateTime:stamp(session.starts_at),timeZone:'UTC'},end:{dateTime:stamp(session.ends_at),timeZone:'UTC'},
  attendees:addresses.map(address=>({emailAddress:{address},type:'required'})),hideAttendees:true,allowNewTimeProposals:false,responseRequested:false};
}
export async function syncTeamsCalendar(graph,config,claim){
 const {session:s,job,organiser,attendees}=claim;
 if(s.tenant_id!==config.tenant||job.tenant_id!==config.tenant||!uuid.test(s.id)||!uuid.test(organiser?.id)||!['scheduled','cancelled'].includes(s.status))throw Error('preflight_invalid_class');
 const organiserEmail=email(organiser.email),root=`/users/${organiser.id}`;
 // No calendar mutation until the organiser and all active recipients are verified.
 for(const person of [organiser,...(s.status==='cancelled'?[]:attendees)]){
  if(!uuid.test(person.id))throw Error('preflight_connected_student_account_required');
  const wanted=email(person.email);
  const actual=await graph(`/users/${person.id}?$select=id,mail,userPrincipalName,accountEnabled`);
  if(actual.id?.toLowerCase()!==person.id.toLowerCase()||actual.accountEnabled!==true||String(actual.mail||actual.userPrincipalName).toLowerCase()!==wanted)throw Error('preflight_mailbox_mapping_mismatch');
 }
 let event=s.provider_event_id?await graph(`${root}/events/${encodeURIComponent(s.provider_event_id)}`,'GET',undefined,true):null;
 if(job.verify_only&&!event){
  const query=new URLSearchParams({startDateTime:s.starts_at,endDateTime:s.ends_at,'$select':'id,transactionId,isCancelled,isOrganizer,organizer,onlineMeeting,start,end,subject,attendees','$top':'100'});
  let path=`${root}/calendarView?${query}`;
  for(let page=0;path&&page<20;page++){
   const data=await graph(path);const found=(data.value||[]).filter(x=>x.transactionId===s.id);
   if(found.length>1||event&&found.length)throw Error('provider_receipt_ambiguous');if(found.length)event=found[0];
   path=null;if(data['@odata.nextLink']){const next=new URL(data['@odata.nextLink']);if(next.origin!=='https://graph.microsoft.com'||!next.pathname.startsWith(`/v1.0${root}/calendarView`))throw Error('provider_cursor_invalid');path=next.pathname.slice('/v1.0'.length)+next.search;}
   if(page===19&&path)throw Error('provider_receipt_scan_limit');
  }
 }
 if(event&&(event.transactionId!==s.id||event.isOrganizer!==true||String(event.organizer?.emailAddress?.address).toLowerCase()!==organiserEmail))throw Error('provider_event_ownership_mismatch');
 if(s.status==='cancelled'){
  if(!event){if(!s.provider_event_id&&job.verify_only)throw Error('provider_receipt_not_found');return {eventId:s.provider_event_id,joinUrl:null};}
  if(!event.isCancelled)await graph(`${root}/events/${encodeURIComponent(event.id)}/cancel`,'POST',{comment:'This UniPathway class has been cancelled. Please check your dashboard for the updated timetable.'});
  return {eventId:event.id,joinUrl:null};
 }
 if(job.verify_only&&!event)throw Error('provider_receipt_not_found');
 if(event?.isCancelled)throw Error('provider_event_already_cancelled');
 const payload=calendarPayload(s,attendees);
 if(!event){
  const calendar=await graph(`${root}/calendar?$select=allowedOnlineMeetingProviders`);
  if(!calendar.allowedOnlineMeetingProviders?.includes('teamsForBusiness'))throw Error('preflight_teams_calendar_not_available');
  event=await graph(`${root}/events`,'POST',{...payload,transactionId:s.id,isOnlineMeeting:true,onlineMeetingProvider:'teamsForBusiness',body:{contentType:'text',content:'Your UniPathway class. Sign in to your UniPathway dashboard for authorised course materials and class information.'}});
 }else if(job.verify_only){
  const normalTime=x=>new Date(x.dateTime+(/[zZ]|[+-]\d\d:\d\d$/.test(x.dateTime)?'':'Z')).toISOString();
  const actual=(event.attendees||[]).map(a=>a.emailAddress.address.toLowerCase()).sort();
  const wanted=payload.attendees.map(a=>a.emailAddress.address);
  if(event.subject!==payload.subject||normalTime(event.start)!==new Date(s.starts_at).toISOString()||normalTime(event.end)!==new Date(s.ends_at).toISOString()||JSON.stringify(actual)!==JSON.stringify(wanted))throw Error('provider_receipt_does_not_match_requested_change');
 }else if(!job.verify_only){
  // Do not overwrite the HTML body: Graph stores the Teams meeting details there.
  event=await graph(`${root}/events/${encodeURIComponent(event.id)}`,'PATCH',payload);
 }
 if(!event?.id||!/^https:\/\/teams\.microsoft\.com\//.test(event.onlineMeeting?.joinUrl||''))throw Error('provider_meeting_receipt_pending');
 return {eventId:event.id,joinUrl:event.onlineMeeting.joinUrl};
}
