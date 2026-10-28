import {expect,it} from 'vitest';
import {confirmedDraftReceipt} from '@/lib/assessment/draftReceipt';
const expected={attempt:'attempt',owner:'marker',tenant:'centre',revision:3,criteria:{A:{code:'A',points:4,reason:'Reason',evidence:'Line 1',missing:'Compare'}},feedback:'Private wording',guidance:''};
const row={attempt_id:'attempt',marker_id:'marker',tenant_id:'centre',revision:4,updated_at:'2026-10-28T12:00:00Z',criteria:expected.criteria,feedback:expected.feedback,guidance:''};
it('confirms the expected full row independently of JSONB field ordering',()=>{
 expect(confirmedDraftReceipt({...row,criteria:{A:{missing:'Compare',evidence:'Line 1',reason:'Reason',points:4,code:'A'}}},expected)).toBe(true);
});
it('rejects wrong identity, missing or stale revision, missing timestamp and changed content',()=>{
 for(const patch of [{attempt_id:'other'},{marker_id:'other'},{tenant_id:'other'},{revision:3},{revision:99},{updated_at:'invalid'},{updated_at:null},{criteria:{}},{criteria:[]},{criteria:{A:{...expected.criteria.A,evidence:'Different'}}},{feedback:'Wrong'},{guidance:'Wrong'}])expect(confirmedDraftReceipt({...row,...patch},expected)).toBe(false);
 for(const value of [null,[],{},undefined,{revision:4}])expect(confirmedDraftReceipt(value,expected)).toBe(false);
});
