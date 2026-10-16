import { expect,it } from 'vitest';
import { validateAccommodation,accommodationSummary,parseAccommodation,type AccommodationPlan } from '@/lib/residentialAccommodation';
const visit={cohort:1,visit:1,students:51,start:'2027-10-15',end:'2027-10-28'};
const plan:AccommodationPlan={version:1,rooms:[{id:'M1',site:'Residence',section:'male',use:'student',beds:1,accessible:false},{id:'F1',site:'Residence',section:'female',use:'staff',beds:1,accessible:true}],allocations:[]};
const student={kind:'student' as const,person:'1',section:'male' as const,room:'M1',needsAccessible:false};
it('counts staff beds separately and reports every unallocated learner',()=>{
 const p={...plan,allocations:[student]};expect(validateAccommodation(visit,p)).toEqual([]);
 const summary=accommodationSummary(visit,p);expect(summary.unallocated).toHaveLength(50);expect(summary.unallocated).not.toContain(1);
 expect(summary.sections[1]).toMatchObject({studentBeds:0,staffBeds:1});
});
it('rejects overcapacity, duplicate learners and duplicate case-insensitive room IDs',()=>{
 expect(validateAccommodation(visit,{...plan,allocations:[student,{...student,person:'2'}]}).join()).toContain('capacity');
 expect(validateAccommodation(visit,{...plan,allocations:[student,{...student,person:'01'}]}).join()).toContain('Duplicate allocation');
 expect(validateAccommodation(visit,{...plan,rooms:[...plan.rooms,{...plan.rooms[0],id:'m1'}]}).join()).toContain('unique');
});
it('enforces section, staff separation, accessible needs and cohort membership',()=>{
 for(const [change,message] of [[{section:'female'},'section'],[{kind:'staff'},'separate rooms'],[{needsAccessible:true},'accessible'],[{person:'52'},'outside this cohort'],[{room:'missing'},'does not exist']] as const){expect(validateAccommodation(visit,{...plan,allocations:[{...student,...change}]}).join()).toContain(message);}
});
it('validates files before restoring and binds them to the precise visit',()=>{
 const raw=JSON.stringify({visit,plan});expect(parseAccommodation(raw,visit)).toEqual(plan);
 expect(()=>parseAccommodation(raw,{...visit,visit:2})).toThrow('different visit');
 expect(()=>parseAccommodation(JSON.stringify({visit,plan:{...plan,rooms:[{...plan.rooms[0],beds:0}]}}),visit)).toThrow();
});
