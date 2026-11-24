import {describe,it,expect} from 'vitest';
import {availabilityFit,parseAvailability,weeklyLimit} from '@/lib/lecturerAvailability';
describe('declared lecturer availability',()=>{
 it('matches complete sessions against PKT windows',()=>{expect(availabilityFit('09:00–12:00, 14:00-16:00','10:30','12:00','Asia/Karachi')).toBe('fits');expect(availabilityFit('09:00–12:00','11:30','12:15','Asia/Karachi')).toBe('outside');});
 it('never guesses timezone or parses ambiguous free text',()=>{expect(availabilityFit('09:00-12:00','09:00','10:30','Europe/London')).toBe('unknown');expect(availabilityFit('mornings','09:00','10:30','Asia/Karachi')).toBe('unknown');expect(parseAvailability('11:00-09:00')).toBeNull();});
 it('distinguishes unavailable days and missing records',()=>{expect(availabilityFit('unavailable','09:00','10:30','Asia/Karachi')).toBe('outside');expect(availabilityFit('','09:00','10:30','Asia/Karachi')).toBe('unknown');});
 it('validates explicit numeric weekly hours',()=>{expect(weeklyLimit('12.5')).toBe(12.5);expect(weeklyLimit('10–20')).toBeNull();expect(weeklyLimit('169')).toBeNull();});
});
