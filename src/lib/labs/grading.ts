// Builds marked runs for the isolated runner and scores the results. Pure functions (unit tested).
import { SQL_SCHEMA, type TechExercise } from '@/data/labs/techLabCatalogue';

export interface CheckResult { label: string; passed: boolean; detail: string }
export interface RunPlan { language: 'python' | 'javascript'; code: string; packages: string[] }

const pyString = (value: string) => JSON.stringify(value); // JSON strings are valid Python string literals

export function buildMarkedRun(exercise: TechExercise, learnerCode: string, token: string): RunPlan | null {
  if (exercise.runtime === 'python' && exercise.tests) {
    return { language: 'python', packages: [], code: `${learnerCode}

import json as __lab_json
__lab_results = []
def check(label, fn):
    try:
        __lab_results.append([label, bool(fn()), ''])
    except Exception as __e:
        __lab_results.append([label, False, type(__e).__name__ + ': ' + str(__e)[:200]])
def raises(fn, exc=Exception):
    try:
        fn()
    except exc:
        return True
    return False
${exercise.tests}
print(${pyString(token)} + __lab_json.dumps(__lab_results))
` };
  }
  if (exercise.runtime === 'javascript' && exercise.tests) {
    return { language: 'javascript', packages: [], code: `${learnerCode}
;{
const __labResults = [];
const check = (label, fn) => { try { __labResults.push([label, !!fn(), '']); } catch (e) { __labResults.push([label, false, String(e && e.message || e).slice(0, 200)]); } };
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
${exercise.tests}
console.log(${JSON.stringify(token)} + JSON.stringify(__labResults));
}
` };
  }
  if (exercise.runtime === 'sql' && exercise.sql) {
    return { language: 'python', packages: ['sqlite3'], code: buildSqlRun(learnerCode, exercise.sql.expected, exercise.sql.ordered, token) };
  }
  return null;
}

export function buildSqlRun(learnerSql: string, expected: (string | number | null)[][] | null, ordered: boolean, token: string) {
  return `import sqlite3, json as __j
__con = sqlite3.connect(':memory:')
__con.executescript(${pyString(SQL_SCHEMA)})
__results = []
__sql = ${pyString(learnerSql)}.strip().rstrip(';').strip()
__expected = __j.loads(${pyString(JSON.stringify(expected))})
try:
    if not __sql:
        raise ValueError('Write a query first')
    __cur = __con.execute(__sql)
    __rows = [list(r) for r in __cur.fetchall()]
    __cols = [d[0] for d in (__cur.description or [])]
    print(' | '.join(__cols))
    for __r in __rows[:50]:
        print(' | '.join('NULL' if v is None else str(v) for v in __r))
    print('(' + str(len(__rows)) + ' row' + ('' if len(__rows) == 1 else 's') + ')')
    __results.append(['Your query runs without errors', True, ''])
    if __expected is not None:
        __results.append(['Returns the right number of rows', len(__rows) == len(__expected), 'Expected ' + str(len(__expected)) + ' rows, got ' + str(len(__rows))])
        __width = len(__expected[0]) if __expected else 0
        __results.append(['Returns the right number of columns', (not __rows) or len(__rows[0]) == __width, 'Expected ' + str(__width) + ' column(s)'])
        __match = __rows == __expected if ${ordered ? 'True' : 'False'} else sorted(map(repr, __rows)) == sorted(map(repr, __expected))
        __results.append(['Returns exactly the expected results' + (' in the right order' if ${ordered ? 'True' : 'False'} else ''), __match, ''])
except Exception as __e:
    __results.append(['Your query runs without errors', False, str(__e)[:300]])
print(${pyString(token)} + __j.dumps(__results))
`;
}

/** Splits runner output into learner-visible text and the marked results line. */
export function parseMarkedOutput(output: string, token: string): { visible: string; results: CheckResult[] | null } {
  const index = output.lastIndexOf(token);
  if (index < 0) return { visible: output.trim(), results: null };
  const lineEnd = output.indexOf('\n', index);
  const payload = output.slice(index + token.length, lineEnd < 0 ? undefined : lineEnd);
  const visible = (output.slice(0, index) + (lineEnd < 0 ? '' : output.slice(lineEnd + 1))).trim();
  try {
    const raw = JSON.parse(payload) as unknown;
    if (!Array.isArray(raw)) return { visible, results: null };
    return { visible, results: raw.map(r => ({ label: String(r?.[0] ?? ''), passed: r?.[1] === true, detail: r?.[1] === true ? '' : String(r?.[2] ?? '') })) };
  } catch { return { visible, results: null }; }
}

export function runHtmlChecks(exercise: TechExercise, source: string): CheckResult[] {
  const doc = new DOMParser().parseFromString(source, 'text/html');
  return (exercise.htmlChecks || []).map(c => {
    let passed = false;
    try { passed = !!c.test(doc, source); } catch { passed = false; }
    return { label: c.label, passed, detail: '' };
  });
}

export function scoreChecks(results: CheckResult[]) {
  if (!results.length) return { score: 0, passed: false };
  const ok = results.filter(r => r.passed).length;
  return { score: Math.round((ok / results.length) * 100), passed: ok === results.length };
}

// ── Language-lab scoring ───────────────────────────────────────────
export const normaliseWords = (value: string) =>
  value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/ß/g, 'ss')
    .replace(/[’']/g, '').replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);

/** Word-level accuracy (0–100) of an attempt against a target using edit distance over words. */
export function wordAccuracy(target: string, attempt: string) {
  const a = normaliseWords(target), b = normaliseWords(attempt);
  if (!a.length) return { score: 0, missing: [] as string[], extra: [] as string[] };
  const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  const score = Math.max(0, Math.round((1 - dp[a.length][b.length] / a.length) * 100));
  const bag = new Map<string, number>(); b.forEach(w => bag.set(w, (bag.get(w) || 0) + 1));
  const missing: string[] = [];
  a.forEach(w => { const n = bag.get(w) || 0; if (n) bag.set(w, n - 1); else missing.push(w); });
  const extra = [...bag.entries()].flatMap(([w, n]) => Array(n).fill(w));
  return { score, missing, extra };
}
