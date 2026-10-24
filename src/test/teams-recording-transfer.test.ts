import {describe,it,expect} from 'vitest';
import {recordingId,graphUrl,belongsToSession,listRecordings} from '../../scripts/lib/teams-recordings.mjs';
describe('Teams recording transfer boundaries',()=>{
 const session={starts_at:'2026-10-24T10:00:00Z',ends_at:'2026-10-24T11:00:00Z'};
 const recording={id:'recording',meetingId:'meeting',createdDateTime:'2026-10-24T10:01:00Z',endDateTime:'2026-10-24T10:55:00Z'};
 it('uses stable IDs without mixing lessons or recordings',()=>{expect(recordingId('a','b','c')).toBe(recordingId('a','b','c'));expect(recordingId('a','b','c')).not.toBe(recordingId('d','b','c'));});
 it('accepts this lesson and rejects other recurring instances',()=>{expect(belongsToSession(recording,session,'meeting')).toBe(true);expect(belongsToSession({...recording,createdDateTime:'2026-10-23T10:01:00Z'},session,'meeting')).toBe(false);expect(belongsToSession(recording,session,'other')).toBe(false);expect(belongsToSession({...recording,endDateTime:'bad'},session,'meeting')).toBe(false);});
 it('rejects credential exfiltration through pagination',()=>{for(const url of ['https://evil.test/v1.0/x','https://graph.microsoft.com.evil.test/v1.0/x','https://user:pass@graph.microsoft.com/v1.0/x','https://graph.microsoft.com/v1.0/other'])expect(()=>graphUrl(url,'/v1.0/x')).toThrow();});
 it('follows bounded same-resource pages and deduplicates',async()=>{let page=0;const base='https://graph.microsoft.com/v1.0/x';const result=await listRecordings(async()=>++page===1?{value:[recording],'@odata.nextLink':`${base}?skip=1`}:{value:[recording,{...recording,id:'two'}]},base);expect(result).toHaveLength(2);});
 it('rejects repeated pages and invalid payloads',async()=>{const base='https://graph.microsoft.com/v1.0/x';await expect(listRecordings(async()=>({value:[],'@odata.nextLink':base}),base)).rejects.toThrow();await expect(listRecordings(async()=>({}),base)).rejects.toThrow();});
});
