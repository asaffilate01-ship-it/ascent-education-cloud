import {expect, it} from 'vitest';
import {invoiceMonths, attendanceWeeks, directorReport} from '@/lib/dashboardMetrics';
it('keeps invoice months from different years separate', () => {
  const rows = [{issued_date: '2025-01-01', amount: 100, paid: 50}, {issued_date: '2026-01-01', amount: 200, paid: 100}];
  expect(invoiceMonths(rows)).toEqual([{month: '2025-01', billed: 100, collected: 50}, {month: '2026-01', billed: 200, collected: 100}]);
  expect(directorReport(rows)).toBe('Invoice month,Billed,Recorded paid\r\n2025-01,100,50\r\n2026-01,200,100');
});
it('groups attendance by calendar week regardless of input order and excludes excused marks', () => {
  const marks = [{date: '2026-10-12', status: 'absent'}, {date: '2026-10-06', status: 'late'}, {date: '2026-10-05', status: 'absent'}, {date: '2026-10-07', status: 'excused'}];
  expect(attendanceWeeks(marks)).toEqual([{week: '2026-10-05', rate: 50}, {week: '2026-10-12', rate: 0}]);
  expect(attendanceWeeks([...marks].reverse())).toEqual(attendanceWeeks(marks));
});
