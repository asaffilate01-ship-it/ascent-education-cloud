export function invoiceMonths(rows: {issued_date: string; amount: number; paid: number}[]) {
  const months = new Map<string, {month: string; billed: number; collected: number}>();
  for (const row of rows) {
    const month = row.issued_date.slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) continue;
    const entry = months.get(month) || {month, billed: 0, collected: 0};
    entry.billed += Number(row.amount); entry.collected += Number(row.paid); months.set(month, entry);
  }
  return [...months.values()].sort((a, b) => a.month.localeCompare(b.month));
}
export function attendanceWeeks(rows: {date: string; status: string}[]) {
  const weeks = new Map<string, {present: number; total: number}>();
  for (const row of rows) {
    if (!['present', 'late', 'absent'].includes(row.status)) continue;
    const date = new Date(`${row.date.slice(0, 10)}T00:00:00Z`);
    if (!Number.isFinite(date.getTime())) continue;
    date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
    const week = date.toISOString().slice(0, 10);
    const entry = weeks.get(week) || {present: 0, total: 0};
    entry.total++; if (row.status !== 'absent') entry.present++; weeks.set(week, entry);
  }
  return [...weeks.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-8).map(([week, entry]) => ({week, rate: Math.round(100 * entry.present / entry.total)}));
}
export function directorReport(rows: {issued_date: string; amount: number; paid: number}[]) {
  return ['Invoice month,Billed,Recorded paid', ...invoiceMonths(rows).map(r => `${r.month},${r.billed},${r.collected}`)].join('\r\n');
}
