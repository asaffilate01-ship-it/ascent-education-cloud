import {describe,it,expect} from 'vitest';
import {validCalendarDate,validateInspectionDraft,inspectionTiming,pakistanCalendarDate} from './facilitiesPlanning';
describe('facilities planning',()=>{
 it('rejects invalid calendar dates',()=>{expect(validCalendarDate('2026-02-30')).toBe(false);expect(validCalendarDate('2024-02-29')).toBe(true);expect(validCalendarDate('2026-2-01')).toBe(false);});
 it('validates and trims asset details',()=>{const draft={category:'extinguisher' as const,assetCode:' F01 ',location:' Reception ',dueDate:'2026-12-01'};expect(validateInspectionDraft(draft).assetCode).toBe('F01');expect(()=>validateInspectionDraft({...draft,location:' '})).toThrow();});
 it('compares dates without browser timezone ambiguity',()=>{expect(inspectionTiming('2026-11-24','2026-11-25')).toBe('overdue');expect(inspectionTiming('2026-11-25','2026-11-25')).toBe('due-today');expect(inspectionTiming('2026-11-26','2026-11-25')).toBe('upcoming');expect(inspectionTiming('','2026-11-25')).toBe('unknown');expect(pakistanCalendarDate(new Date('2026-11-25T20:00:00Z'))).toBe('2026-11-26');});
});
