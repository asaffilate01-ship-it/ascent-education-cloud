import {describe,expect,it} from 'vitest';
import {lastCompletedMonth,readGrossMonth,readGrossBatch,filterGrossEvidence} from '@/lib/grossPreparation';
const id=(n:number)=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0'),tenant=id(1),lecturer=id(2),finance=id(3),director=id(4),month='2026-10',time='2026-11-24T10:00:00Z',fingerprint='a'.repeat(64);
const row={lecturer_id:lecturer,lecturer_name:'Example lecturer',agreement_id:id(6),basis:'hourly',rate_paisa:100000,resolution:'calculated',sessions:2,minutes:60,gross_paisa:100000};
const summary={tenant_id:tenant,month:month+'-01',currency:'PKR',source_count:3,approved_claims:2,pending_claims:0,rejected_claims:1,unresolved_claims:0,gross_paisa:100000,rows:[row]};
const batch={id:id(7),tenant_id:tenant,month:month+'-01',status:'prepared',fingerprint,prepared_by:finance,prepared_at:time,reviewed_by:null,reviewed_at:null,review_note:null,summary};
const result={tenant_id:tenant,role:'centre_director',month:month+'-01',summary,fingerprint,ready:true,contains_own:false,batch,batch_current:true,rejected_history:[]};
describe('closed-month gross preparation',()=>{
 it('chooses completed months with year rollover',()=>{expect(lastCompletedMonth('2026-11-24')).toBe('2026-10');expect(lastCompletedMonth('2026-01-01')).toBe('2025-12');});
 it('validates exact independent receipt and detects stale source',()=>{expect(readGrossBatch(batch,tenant,month,{id:batch.id,fingerprint}).summary.gross_paisa).toBe(100000);expect(readGrossMonth(result,tenant,'centre_director',month,director).batch_current).toBe(true);expect(readGrossMonth({...result,fingerprint:'b'.repeat(64),batch_current:false},tenant,'centre_director',month,director).batch_current).toBe(false);expect(()=>readGrossMonth({...result,batch_current:false},tenant,'centre_director',month,director)).toThrow();});
 it('rejects wrong tenant, wrong totals, self review and conflicting source gates',()=>{for(const invalid of [{...batch,tenant_id:id(9)},{...batch,summary:{...summary,gross_paisa:1}},{...batch,status:'reviewed',reviewed_by:finance,reviewed_at:time,review_note:'Reviewed source'},{...batch,prepared_by:lecturer}])expect(()=>readGrossBatch(invalid,tenant,month)).toThrow();expect(()=>readGrossMonth({...result,ready:false},tenant,'centre_director',month,director)).toThrow();expect(()=>readGrossMonth({...result,summary:{...summary,source_count:4}},tenant,'centre_director',month,director)).toThrow();});
 it('validates an unresolved source without treating it as ready',()=>{const missing={...row,agreement_id:null,basis:null,rate_paisa:null,resolution:'missing_rate',gross_paisa:null};const s={...summary,rows:[missing],unresolved_claims:2,gross_paisa:0};const read=readGrossMonth({...result,summary:s,ready:false,batch:null,batch_current:null},tenant,'centre_director',month,director);expect(read.ready).toBe(false);expect(read.summary.unresolved_claims).toBe(2);});
});

describe('gross evidence review filters',()=>{
 it('finds matching lecturers and unresolved groups without changing the verified totals',()=>{
  const calculated=readGrossMonth(result,tenant,'centre_director',month,director).summary;
  const missing={...row,lecturer_id:id(8),lecturer_name:'Second tutor',agreement_id:null,basis:null,rate_paisa:null,resolution:'missing_rate',gross_paisa:null};
  const combined={...summary,source_count:5,approved_claims:4,unresolved_claims:2,rows:[row,missing]};
  const verified=readGrossMonth({...result,summary:combined,ready:false,batch:null,batch_current:null},tenant,'centre_director',month,director);
  expect(filterGrossEvidence(verified.summary.rows,'lecturer example',false)).toEqual(calculated.rows);
  expect(filterGrossEvidence(verified.summary.rows,'tutor second',true)).toHaveLength(1);
  expect(filterGrossEvidence(verified.summary.rows,'example',true)).toEqual([]);
  expect(filterGrossEvidence(verified.summary.rows,id(6),false)).toEqual(calculated.rows);
  expect(verified.summary.gross_paisa).toBe(100000);
  expect(verified.summary.unresolved_claims).toBe(2);
  expect(verified.ready).toBe(false);
 });
});
