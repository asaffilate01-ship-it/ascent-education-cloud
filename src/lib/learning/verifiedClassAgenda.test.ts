import {describe,expect,it,vi} from 'vitest';
import {
 CLASS_AGENDA_CHUNK_SIZE,CLASS_AGENDA_QUERY_LIMIT,CLASS_AGENDA_VISIBLE_LIMIT,
 classAgendaModuleChunks,loadVerifiedClassAgenda,visibleVerifiedClassAgenda,
 type VerifiedClassSession,
} from './verifiedClassAgenda';

const now=Date.parse('2026-11-12T09:00:00Z');
const makeSession=(id:string,module_id='m1',starts_at='2026-11-12T10:00:00Z',
 ends_at='2026-11-12T11:00:00Z',change:Partial<VerifiedClassSession>={}):VerifiedClassSession=>({
 id,tenant_id:'centre-a',module_id,status:'scheduled',title:`Session ${id}`,
 starts_at,ends_at,...change,
});

describe('verified student classroom agenda',()=>{
 it('chunks all active module IDs at 50 and removes exact duplicates without truncating',()=>{
  const ids=Array.from({length:121},(_,i)=>`m${i}`);
  const chunks=classAgendaModuleChunks([...ids,'m0','m50']);
  expect(chunks.map(x=>x.length)).toEqual([50,50,21]);
  expect(chunks.flat()).toEqual(ids);
  expect(CLASS_AGENDA_CHUNK_SIZE).toBe(50);
  expect(CLASS_AGENDA_VISIBLE_LIMIT).toBe(5);
  expect(CLASS_AGENDA_QUERY_LIMIT).toBeGreaterThan(CLASS_AGENDA_VISIBLE_LIMIT);
 });
 it('returns top sessions globally, not just the first chunk or all sessions',async()=>{
  const ids=Array.from({length:121},(_,i)=>`m${i}`);
  const read=vi.fn(async(chunk:readonly string[])=>{
   const number=Number(chunk[0].slice(1));
   if(number===0)return [makeSession('later','m0','2026-11-13T10:00:00Z','2026-11-13T11:00:00Z')];
   if(number===50)return [makeSession('first','m50','2026-11-12T09:30:00Z','2026-11-12T10:30:00Z')];
   return [makeSession('next','m120','2026-11-12T10:00:00Z','2026-11-12T11:00:00Z')];
  });
  const sessions=await loadVerifiedClassAgenda(ids,'centre-a',now,read);
  expect(read).toHaveBeenCalledTimes(3);
  expect(sessions.map(s=>s.id)).toEqual(['first','next','later']);
 });
 it('never returns partial data after a later enrolled-module batch fails',async()=>{
  const ids=Array.from({length:75},(_,i)=>`m${i}`);
  const read=vi.fn(async(chunk:readonly string[])=>{
   if(chunk.includes('m50'))throw Error('RLS or backend denied the second batch');
   return [makeSession('early','m0')];
  });
  await expect(loadVerifiedClassAgenda(ids,'centre-a',now,read)).rejects.toThrow();
  expect(read).toHaveBeenCalledTimes(2);
 });
 it('rejects any row outside a batch centre or module and stale or invalid authorisation',async()=>{
  const denied=[
   makeSession('foreign','m1',undefined,undefined,{tenant_id:'centre-b'}),
   makeSession('not-enrolled','foreign-module'),
   makeSession('draft','m1',undefined,undefined,{status:'cancelled' as VerifiedClassSession['status']}),
   makeSession('impossible','m1','2026-11-12T12:00:00Z','2026-11-12T10:00:00Z'),
   {...makeSession('bad','m1'),starts_at:'not a date'},
   {...makeSession('empty','m1'),title:''},
  ];
  for(const row of denied){
   await expect(loadVerifiedClassAgenda(['m1'],'centre-a',now,async()=>[row])).rejects.toThrow();
  }
  await expect(loadVerifiedClassAgenda(['m1'],'centre-a',Number.NaN,async()=>[])).rejects.toThrow();
  expect(()=>classAgendaModuleChunks(['m1',''])).toThrow();
 });
 it('excludes expired class cards on minute ticks without claiming live invitations',async()=>{
  const rows=[makeSession('now','m1','2026-11-12T08:00:00Z','2026-11-12T09:01:00Z'),
    ...Array.from({length:8},(_,i)=>makeSession(`future${i}`,'m1',
      new Date(now+120_000+i*60_000).toISOString(),
      new Date(now+180_000+i*60_000).toISOString()))];
  const buffered=await loadVerifiedClassAgenda(['m1'],'centre-a',now,async()=>rows);
  expect(buffered).toHaveLength(9);
  expect(visibleVerifiedClassAgenda(buffered,now)).toHaveLength(5);
  const later=visibleVerifiedClassAgenda(buffered,now+61_000);
  expect(later).toHaveLength(5);
  expect(later.some(s=>s.id==='now')).toBe(false);
 });
 it('rejects duplicate session identifiers across batches rather than hiding conflicting records',async()=>{
  const ids=Array.from({length:51},(_,i)=>`m${i}`);
  const read=async(ids:readonly string[])=>[makeSession('same',ids[0])];
  await expect(loadVerifiedClassAgenda(ids,'centre-a',now,read)).rejects.toThrow(/Duplicate/);
 });
 it('skips a query when no authorised modules exist and honours request cancellation',async()=>{
  const read=vi.fn(async()=>[]);
  expect(await loadVerifiedClassAgenda([],'centre-a',now,read)).toEqual([]);
  expect(read).not.toHaveBeenCalled();
  await expect(loadVerifiedClassAgenda(['m1'],'centre-a',now,read,()=>false)).rejects.toThrow(/superseded/);
  expect(read).not.toHaveBeenCalled();
 });
});
