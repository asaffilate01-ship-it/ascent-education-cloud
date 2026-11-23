import { describe, expect, it } from 'vitest';
import { classCounts, describeDisplay, panelSystem } from '@/lib/labs/classroomScreen';

describe('classroom screen helpers', () => {
  it('recognises a 4K panel running at 200% scaling', () => {
    const d = describeDisplay({ cssWidth: 1920, cssHeight: 1080, pixelRatio: 2, touchPoints: 20 });
    expect(d.pixels).toBe('3840 × 2160');
    expect(d.isUltraHd).toBe(true);
    expect(d.touch).toBe('multi');
  });
  it('does not call a 1080p screen 4K and reports missing touch', () => {
    const d = describeDisplay({ cssWidth: 1920, cssHeight: 1080, pixelRatio: 1, touchPoints: 0 });
    expect(d.isUltraHd).toBe(false);
    expect(d.touch).toBe('none');
  });
  it('tells the Windows (OPS) computer apart from the built-in Android system', () => {
    expect(panelSystem('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130')).toBe('windows');
    expect(panelSystem('Mozilla/5.0 (Linux; Android 13; DS-D5C86RB) Chrome/130')).toBe('android');
  });
  it('counts in-class, remote, online, hands and passes without double-counting a student', () => {
    const now = Date.parse('2026-11-23T10:00:00Z');
    const people = [
      { location: 'in_class' as const, hand_raised: true, last_seen: '2026-11-23T09:59:50Z' },
      { location: 'remote' as const, hand_raised: false, last_seen: '2026-11-23T09:50:00Z' },
    ];
    const attempts = [
      { user_id: 'a', activity_id: 'x', passed: false }, { user_id: 'a', activity_id: 'x', passed: true },
      { user_id: 'b', activity_id: 'y', passed: true },
    ];
    expect(classCounts(people, attempts, 'x', now)).toEqual({ joined: 2, inClass: 1, remote: 1, online: 1, hands: 1, tried: 1, passed: 1 });
  });
});
