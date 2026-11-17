import {describe, expect, it} from 'vitest';
import {calendarInputToIso} from './academicCalendar';
import {parseAcademicInstant, parseZonedAcademicTimestamp} from './academicTime';
import {classJoinState, pakistanClassTime} from './classroomExperience';
import {pakistanClassInput, verifiedScheduledClasses} from './liveClassScheduling';
import {
  confirmedLecturerCreation, emptyBriefForm, lecturerBrief, reviewLecturerBrief,
} from './assessment/lecturerBriefs';

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const scope = {userId: id(1), tenantId: id(2)};
const moduleId = id(3), briefId = id(4);

const savedBrief = () => ({
  id: briefId, tenant_id: scope.tenantId, lecturer_id: scope.userId, module_id: moduleId,
  title: 'Independent investigation report', status: 'draft', assessment_type: 'practical',
  due_at: '2030-12-01T04:00:00Z', submission_cutoff: '2030-12-08T04:00:00Z',
  max_attempts: 2, penalty_points_per_resubmission: 5,
  policy_reference: 'APPROVED-2030', rubric_version: 'v1',
});
const session = (n: number, start = '2030-12-01T04:00:00Z', end = '2030-12-01T05:00:00Z') => ({
  id: id(n), tenant_id: scope.tenantId, module_id: moduleId, starts_at: start, ends_at: end,
});

describe('Phase 10: verified academic authoring and scheduling timestamps', () => {
  it('keeps date-only compatibility for legacy display, not persisted class or brief time fields', () => {
    expect(parseAcademicInstant('2030-12-01')).not.toBeNull();
    expect(parseZonedAcademicTimestamp('2030-12-01')).toBeNull();
    expect(parseZonedAcademicTimestamp('2030-12-01T09:00')).toBeNull();
    expect(parseZonedAcademicTimestamp('2030-12-01T09:00:00')).toBeNull();
    expect(parseZonedAcademicTimestamp('2030-12-01T09:00:00+05:00'))
      .toBe(Date.parse('2030-12-01T04:00:00Z'));
    expect(calendarInputToIso('2030-12-01T09:00', false)).toBe('2030-12-01T04:00:00.000Z');
  });

  it('fails closed when a stored lecturer brief has an invalid or ambiguous cutoff', () => {
    expect(lecturerBrief(savedBrief(), scope, [moduleId])).not.toBeNull();
    for (const due_at of [
      '2030-12-01T09:00:00', '2030-02-30T09:00:00Z', '2030-12-01',
    ]) {
      expect(lecturerBrief({...savedBrief(), due_at}, scope, [moduleId])).toBeNull();
    }
    expect(lecturerBrief({...savedBrief(), submission_cutoff: '2030-12-08T09:00:00'}, scope, [moduleId])).toBeNull();
    expect(lecturerBrief({...savedBrief(), submission_cutoff: '2030-11-30T04:00:00Z'}, scope, [moduleId])).toBeNull();
  });

  it('confirms only the intended instant when PostgreSQL returns a different offset', () => {
    const module = {id: moduleId, title: 'Applied research', tenant_id: scope.tenantId, lecturer_id: scope.userId};
    const payload = reviewLecturerBrief({
      ...emptyBriefForm(moduleId), title: 'Independent investigation report',
      kind: 'practical', teaching: 'Document and assess scientific observations using reproducible methods.',
      outcomes: 'Record and interpret experimental observations.',
      expectations: 'Present a clearly explained report with appropriately attributed calculations and findings.',
      required: 'An evidence-backed report and a signed practical log.',
      due: '2030-12-01T09:00', cutoff: '2030-12-08T09:00', attempts: '2',
      penalty: '5', policy: 'APPROVED-2030',
    }, module, scope, briefId, Date.parse('2026-11-17T00:00:00Z'));
    expect(confirmedLecturerCreation({
      ...payload, due_at: '2030-12-01T09:00:00+05:00',
    }, payload)).toBe(true);
    expect(confirmedLecturerCreation({
      ...payload, due_at: '2030-12-01T09:00:00',
    }, payload)).toBe(false);
    expect(confirmedLecturerCreation({
      ...payload, due_at: '2030-02-30T09:00:00Z',
    }, payload)).toBe(false);
  });

  it('rejects unauthorised, duplicate, ambiguous or backwards-time class rows before exposing edit actions', () => {
    const good = session(10);
    const newer = session(11, '2030-12-02T04:00:00Z', '2030-12-02T05:00:00Z');
    const modules = new Set([moduleId]);
    expect(verifiedScheduledClasses([good, newer], scope.tenantId, modules).map(c => c.id))
      .toEqual([newer.id, good.id]);
    for (const bad of [
      {...good, tenant_id: id(98)},
      {...good, module_id: id(99)},
      {...good, starts_at: '2030-12-01T09:00:00'},
      {...good, starts_at: '2030-02-30T04:00:00Z'},
      {...good, ends_at: '2030-12-01T03:00:00Z'},
    ]) expect(() => verifiedScheduledClasses([good, bad], scope.tenantId, modules)).toThrow(/verified/);
    expect(() => verifiedScheduledClasses([good, good], scope.tenantId, modules)).toThrow(/verified/);
  });

  it('never formats or opens an unverified class while retaining valid Pakistan time editing', () => {
    const valid = {starts_at: '2030-12-01T04:00:00Z', ends_at: '2030-12-01T05:00:00Z', status: 'scheduled'};
    expect(pakistanClassInput(valid.starts_at)).toBe('2030-12-01T09:00');
    expect(pakistanClassTime(valid.starts_at)).not.toBe('Date unavailable');
    expect(classJoinState(valid, Date.parse('2030-12-01T04:00:00Z'))).toBe('open');
    expect(pakistanClassInput('2030-12-01T09:00:00')).toBe('');
    expect(pakistanClassTime('2030-02-30T04:00:00Z')).toBe('Date unavailable');
    expect(classJoinState({...valid, ends_at: '2030-12-01T10:00:00'}, Date.parse('2030-12-01T04:00:00Z'))).toBe('unavailable');
    expect(classJoinState(valid, Number.NaN)).toBe('unavailable');
  });
});
