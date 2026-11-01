import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {
 archiveAudience,archiveMinimumEmbargoElapsed,publishedArchiveAssetAvailable,
} from '@/lib/learning/archiveAccess';

const centre='jhelum-centre';
const student={id:'student-a',tenantId:centre,role:'student',roles:['student']};
const completed={status:'ended',ends_at:'2026-11-01T10:00:00Z',actual_ended_at:'2026-11-01T10:30:00Z'};
const available={publication_status:'published',available_at:'2026-11-01T22:30:00Z'};

describe('UniPathway lesson archive source and access boundaries',()=>{
 it('requires verified current role, signed-in identity and centre',()=>{
  expect(archiveAudience(student)).toBe('student');
  expect(archiveAudience({...student,role:'lecturer',roles:['student','lecturer']})).toBe('lecturer');
  expect(archiveAudience({...student,role:'lecturer'})).toBe('blocked');
  expect(archiveAudience({...student,role:'finance_officer',roles:['finance_officer']})).toBe('blocked');
  expect(archiveAudience({...student,tenantId:null})).toBe('blocked');
  expect(archiveAudience(null)).toBe('blocked');
 });
 it('never exposes scheduled, cancelled, unconfirmed or future class assets',()=>{
  const now=Date.parse('2026-11-03T10:00:00Z');
  for(const session of [
   {...completed,status:'scheduled'},
   {...completed,status:'cancelled'},
   {...completed,actual_ended_at:null},
  ])expect(publishedArchiveAssetAvailable(available,session,now)).toBe(false);
  expect(publishedArchiveAssetAvailable({...available,available_at:null},completed,now)).toBe(false);
  expect(publishedArchiveAssetAvailable({...available,available_at:'unparseable'},completed,now)).toBe(false);
  expect(publishedArchiveAssetAvailable({...available,publication_status:'draft'},completed,now)).toBe(false);
  expect(publishedArchiveAssetAvailable(available,completed,Date.parse('2026-11-01T22:29:59Z'))).toBe(false);
 });
 it('enforces the earliest possible twelve-hour embargo, including actual overruns',()=>{
  const short={...completed,actual_ended_at:'2026-11-01T11:00:00Z'};
  expect(archiveMinimumEmbargoElapsed(short,Date.parse('2026-11-01T22:30:00Z'))).toBe(false);
  expect(publishedArchiveAssetAvailable(available,short,Date.parse('2026-11-02T00:00:00Z'))).toBe(false);
  expect(publishedArchiveAssetAvailable({...available,available_at:'2026-11-01T23:00:00Z'},short,Date.parse('2026-11-01T23:00:00Z'))).toBe(true);
  expect(publishedArchiveAssetAvailable(available,completed,Date.parse('2026-11-02T00:00:00Z'))).toBe(true);
 });
 it('reads only authorised study scope before sessions or published packs',()=>{
  const source=readFileSync('src/pages/student/LessonArchive.tsx','utf8');
  expect(source).toContain('archiveAudience(user)');
  expect(source).toContain("from('student_enrolments')");
  expect(source).toContain(".eq('student_id',uid).eq('status','active')");
  expect(source).toContain(".eq('lecturer_id',uid)");
  expect(source).toContain(".in('module_id',batch)");
  expect(source).toContain('publishedArchiveAssetAvailable');
  expect(source).toContain('archiveMinimumEmbargoElapsed');
  expect(source).toContain('classMediaUrl(a.storage_reference)');
  expect(source).not.toContain('(!a.available_at||');
 });
});
