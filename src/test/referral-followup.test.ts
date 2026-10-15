import {it,expect} from 'vitest';
import {referralSubmissionDays,referralFollowUp,compareReferralTiming} from '@/lib/referralQueue';
const now=Date.parse('2026-10-15T12:00:00Z');
const row={id:'a',status:'submitted',submitted_at:'2026-10-08T12:00:00Z'};
it('includes the exact seven-day boundary without rounding up',()=>{expect(referralSubmissionDays(row,now)).toBe(7);expect(referralFollowUp(row,'7',now)).toBe(true);expect(referralFollowUp(row,'7',now-1)).toBe(false);});
it('does not treat missing or future timestamps as old submissions',()=>{expect(referralSubmissionDays({...row,submitted_at:'invalid'},now)).toBe(null);expect(referralFollowUp({...row,submitted_at:'2027-01-01'},'unknown',now)).toBe(true);expect(referralFollowUp({...row,submitted_at:null},'30',now)).toBe(false);});
it('limits response follow-up to submitted and acknowledged records',()=>{for(const status of ['draft','consented','offer','enrolled','withdrawn','rejected'])expect(referralFollowUp({...row,status},'7',now)).toBe(false);expect(referralFollowUp({...row,status:'acknowledged'},'7',now)).toBe(true);});
it('sorts submissions oldest first with undated records last and stable ties',()=>{const rows=[{id:'z'},{...row,id:'b'},row,{id:'old',submitted_at:'2020-01-01'}];expect(rows.sort((a,b)=>compareReferralTiming(a,b,'oldest_submission')).map(r=>r.id)).toEqual(['old','a','b','z']);});
