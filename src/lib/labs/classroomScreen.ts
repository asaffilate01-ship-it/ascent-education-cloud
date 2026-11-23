/** Helpers for running lessons on a large classroom touchscreen (e.g. Hikvision Ultra panels). */

export interface DisplayInfo { cssWidth: number; cssHeight: number; pixelRatio: number; touchPoints: number }
export interface DisplaySummary { pixels: string; isUltraHd: boolean; touch: 'none' | 'single' | 'multi'; touchLabel: string }

/** Physical resolution, whether it is a 4K panel, and how much touch the browser reports. */
export function describeDisplay(d: DisplayInfo): DisplaySummary {
  const w = Math.round(d.cssWidth * d.pixelRatio), h = Math.round(d.cssHeight * d.pixelRatio);
  const long = Math.max(w, h), short = Math.min(w, h);
  const isUltraHd = long >= 3800 && short >= 2100;
  const touch = d.touchPoints <= 0 ? 'none' : d.touchPoints === 1 ? 'single' : 'multi';
  const touchLabel = touch === 'none' ? 'No touch detected by this browser' : touch === 'single' ? 'Single touch only' : `Multi-touch (${d.touchPoints} points reported)`;
  return { pixels: `${w} × ${h}`, isUltraHd, touch, touchLabel };
}

/** Which system the panel browser is running on, for the setup advice shown. */
export function panelSystem(userAgent: string): 'windows' | 'android' | 'other' {
  if (/Windows NT/i.test(userAgent)) return 'windows';
  if (/Android/i.test(userAgent)) return 'android';
  return 'other';
}

export const ONLINE_WINDOW_MS = 45000;

/** Class-wide counts safe to show on a projected screen: no names or scores. */
export function classCounts(
  people: { location: 'in_class' | 'remote'; hand_raised: boolean; last_seen: string }[],
  attempts: { user_id: string; activity_id: string; passed: boolean | null }[],
  currentActivity: string | null,
  now = Date.now(),
) {
  const online = people.filter(p => now - Date.parse(p.last_seen) < ONLINE_WINDOW_MS);
  const rows = currentActivity ? attempts.filter(a => a.activity_id === currentActivity) : [];
  return {
    joined: people.length,
    inClass: people.filter(p => p.location === 'in_class').length,
    remote: people.filter(p => p.location === 'remote').length,
    online: online.length,
    hands: people.filter(p => p.hand_raised).length,
    tried: new Set(rows.map(r => r.user_id)).size,
    passed: new Set(rows.filter(r => r.passed).map(r => r.user_id)).size,
  };
}
