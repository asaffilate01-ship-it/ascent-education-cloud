import {describe,it,expect} from 'vitest';
import {verifyFacilitiesRegister} from './facilitiesRegister';
const asset={id:'asset1',tenant_id:'a',category:'extinguisher',asset_code:'F01',location:'Reception',planned_inspection_date:'2026-12-01'};
const inspection={id:'inspection1',tenant_id:'a',asset_id:'asset1',inspected_on:'2026-11-25',outcome:'defect',notes:'Review required',next_due_date:'2026-12-01',recorded_at:'2026-11-25T08:00:00Z'};
describe('facilities register verification',()=>{
 it('accepts scoped and empty verified snapshots',()=>{expect(verifyFacilitiesRegister({assets:[asset],inspections:[inspection]},'a').assets).toHaveLength(1);expect(verifyFacilitiesRegister({assets:[],inspections:[]},'a').inspections).toHaveLength(0);});
 it('rejects cross-centre and orphan records',()=>{expect(()=>verifyFacilitiesRegister({assets:[{...asset,tenant_id:'b'}],inspections:[]},'a')).toThrow();expect(()=>verifyFacilitiesRegister({assets:[asset],inspections:[{...inspection,tenant_id:'b'}]},'a')).toThrow();expect(()=>verifyFacilitiesRegister({assets:[],inspections:[inspection]},'a')).toThrow();});
 it('rejects malformed and duplicate data',()=>{expect(()=>verifyFacilitiesRegister(null,'a')).toThrow();expect(()=>verifyFacilitiesRegister({assets:[asset,asset],inspections:[]},'a')).toThrow();expect(()=>verifyFacilitiesRegister({assets:[asset],inspections:[{...inspection,inspected_on:'2026-02-30'}]},'a')).toThrow();});
});
