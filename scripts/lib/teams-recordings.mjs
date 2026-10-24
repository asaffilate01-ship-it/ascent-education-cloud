import {createHash} from 'node:crypto';
export function recordingId(sessionId, meetingId, recordingId) {
 const h=createHash('sha256').update(JSON.stringify([sessionId,meetingId,recordingId])).digest('hex');
 return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-8${h.slice(17,20)}-${h.slice(20,32)}`;
}
export function graphUrl(value, expectedPath) {
 const u=new URL(value);
 if(u.origin!=='https://graph.microsoft.com'||u.username||u.password||u.hash||u.pathname!==expectedPath) throw new Error('unsafe_graph_url');
 return u.href;
}
export function belongsToSession(recording, session, meetingId) {
 const start=Date.parse(recording.createdDateTime),end=Date.parse(recording.endDateTime);
 return recording.meetingId===meetingId&&typeof recording.id==='string'&&recording.id.length>0&&
 Number.isFinite(start)&&Number.isFinite(end)&&end>=start&&start>=Date.parse(session.starts_at)-20*60000&&end<=Date.parse(session.ends_at)+30*60000;
}
export async function listRecordings(fetchJson, base) {
 const path=new URL(base).pathname,seen=new Set(),items=[];let next=base;
 while(next){
  if(seen.has(next)||seen.size>=100)throw new Error('recording_pagination_limit');
  seen.add(next);const page=await fetchJson(graphUrl(next,path));
  if(!Array.isArray(page.value))throw new Error('invalid_graph_response');
  items.push(...page.value);next=page['@odata.nextLink'];
 }
 return [...new Map(items.map(item=>[item.id,item])).values()];
}
