import { expect,it } from 'vitest';
import { validateSupport,parseSupportPlan,type SupportAppointment } from '@/lib/residentialSupport';
const visit={cohort:1,visit:1,students:200,start:'2027-10-15',end:'2027-10-28'};
const appointment=(overrides:Partial<SupportAppointment>={}):SupportAppointment=>({id:'one',student:51,tutor:'T1',date:'2027-10-15',start:720,minutes:30,...overrides});
it('permits a non-clashing appointment and enforces the teaching changeover',()=>{
 expect(validateSupport(visit,[appointment()],[])).toEqual([]);
 expect(validateSupport(visit,[appointment({start:690})],[]).join()).toContain('30 minutes');
});
it('blocks full-day trips, out-of-cohort learners and invalid dates',()=>{
 expect(validateSupport(visit,[appointment({student:1})],[]).join()).toContain('full-day trip');
 expect(validateSupport({...visit,students:50},[appointment()],[]).join()).toContain('outside this cohort');
 expect(validateSupport(visit,[appointment({date:'2027-02-30'})],[]).join()).toContain('invalid');
});
it('caps private help and prevents duplicate tutor appointments',()=>{
 expect(validateSupport(visit,[appointment({minutes:90}),appointment({id:'two',start:840})],[]).join()).toContain('exceeds 90');
 expect(validateSupport(visit,[appointment(),appointment({id:'two',student:52,tutor:' t1 '})],[]).join()).toContain('double-booked');
});
it('enforces ten places and allows adjacent appointments without false overlap',()=>{
 const many=Array.from({length:11},(_,i)=>appointment({id:String(i),student:51+i,tutor:`T${i}`}));
 expect(validateSupport(visit,many,[]).join()).toContain('More than ten');
 expect(validateSupport(visit,many.slice(0,10),[])).toEqual([]);
 expect(validateSupport(visit,[appointment(),appointment({id:'two',student:52,start:750})],[])).toEqual([]);
});
it('checks tutors against entered teaching duties and rejects files for another visit',()=>{
 expect(validateSupport(visit,[appointment()],[{session:'2027-10-15/720',tutor:'T1'}]).join()).toContain('teaching clash');
 const raw=JSON.stringify({version:1,visit,appointments:[appointment()],allocations:[]});
 expect(parseSupportPlan(raw,visit).appointments).toHaveLength(1);
 expect(()=>parseSupportPlan(raw,{...visit,visit:2})).toThrow('different visit');
});
