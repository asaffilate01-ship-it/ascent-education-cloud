import {describe,it,expect} from 'vitest';
import {teachingRemuneration,formatPkrPaisa} from '@/lib/teachingRemuneration';
import {readSchedulingReceipt} from '@/components/admissions/TeachingSchedulingAdvisory';
describe('part-time remuneration planning',()=>{
 it('computes exact hourly and session estimates, rounding once to paisa',()=>{expect(teachingRemuneration('hourly','1000','45','')?.grossPaisa).toBe(75000);expect(teachingRemuneration('hourly','1000','90','')?.grossPaisa).toBe(150000);expect(teachingRemuneration('session','1250.50','','3')?.grossPaisa).toBe(375150);expect(teachingRemuneration('hourly','1000','1','')?.grossPaisa).toBe(1667);expect(formatPkrPaisa(75000)).toBe('PKR 750.00');});
 it('requires a valid positive rate and bounded whole quantities',()=>{for(const rate of ['','-50','0','1e6','1.001','abc'])expect(teachingRemuneration('hourly',rate,'45','')).toBeNull();for(const m of ['','-1','1.5','44641'])expect(teachingRemuneration('hourly','1000',m,'')).toBeNull();expect(teachingRemuneration('session','1000','','1001')).toBeNull();expect(teachingRemuneration('hourly','1000','0','')?.grossPaisa).toBe(0);});
});
describe('scheduling advisory receipts',()=>{
 const module='00000000-0000-0000-0000-000000000001',lecturer='00000000-0000-0000-0000-000000000002',slot={date:'2026-11-30',start:'09:00',end:'09:45',mode:'centre' as const,room:'A'};
 const receipt={schemaVersion:'2026-11-24-v1',mode:'deterministic-advisory',moduleId:module,asOf:'2026-11-24T09:00:00Z',proposals:[{userId:lecturer,slotIndex:0,slot}]};
 it('matches the reviewed slot and assigned lecturer',()=>expect(readSchedulingReceipt(receipt,module,lecturer,slot)).toMatchObject({count:1,assignedInOptions:true}));
 it('rejects mismatched, duplicated and stale-form recommendations',()=>{for(const bad of [{...receipt,moduleId:'other'},{...receipt,proposals:[...receipt.proposals,...receipt.proposals]},{...receipt,proposals:[{...receipt.proposals[0],slot:{...slot,start:'10:00'}}]}])expect(()=>readSchedulingReceipt(bad,module,lecturer,slot)).toThrow();});
});
