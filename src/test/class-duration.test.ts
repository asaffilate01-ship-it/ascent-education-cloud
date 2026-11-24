import {describe,it,expect} from 'vitest';
import {classEnd,classDuration,clockMinutes} from '@/lib/classDuration';
describe('Jhelum teaching durations',()=>{
 it('supports 45-minute tuition and 90-minute professional sessions',()=>{expect(classEnd('09:00',45)).toBe('09:45');expect(classEnd('09:00',90)).toBe('10:30');});
 it('handles minutes and stored seconds without crossing midnight',()=>{expect(classEnd('09:45',45)).toBe('10:30');expect(classDuration('09:45:00','10:30:00')).toBe(45);expect(classEnd('23:30',45)).toBeNull();expect(classEnd('23:15',45)).toBeNull();});
 it('rejects invalid times and durations',()=>{expect(clockMinutes('24:00')).toBeNull();expect(classEnd('12:60',45)).toBeNull();expect(classEnd('09:00',0)).toBeNull();expect(classDuration('12:00','11:00')).toBeNull();});
});
