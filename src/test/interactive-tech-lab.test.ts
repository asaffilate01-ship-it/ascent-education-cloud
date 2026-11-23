import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { TECH_EXERCISES, TECH_TRACKS, exerciseById } from '@/data/labs/techLabCatalogue';
import { buildMarkedRun, parseMarkedOutput, runHtmlChecks, scoreChecks, wordAccuracy } from '@/lib/labs/grading';

const TOKEN = '__LAB_TEST_TOKEN__';
const hasPython = (() => { try { execFileSync('python3', ['-c', 'import sqlite3'], { stdio: 'ignore' }); return true; } catch { return false; } })();

// Reference answers live only in tests so learners never receive them in the app bundle.
const SOLUTIONS: Record<string, string> = {
  'ai-py-nearest': 'import math\ndef nearest_label(sample, data):\n    return min(data, key=lambda p: math.dist(sample, p[:2]))[2]',
  'ai-py-regression': 'def fit_line(xs, ys):\n    mx=sum(xs)/len(xs); my=sum(ys)/len(ys)\n    s=sum((x-mx)*(y-my) for x,y in zip(xs,ys))/sum((x-mx)**2 for x in xs)\n    return s, my-s*mx\ndef predict(x,s,c):\n    return s*x+c',
  'ai-py-evaluate': 'def accuracy(p,a):\n    return round(sum(x==y for x,y in zip(p,a))/len(a),2)\ndef precision(p,a,pos):\n    hits=[y for x,y in zip(p,a) if x==pos]\n    return round(sum(y==pos for y in hits)/len(hits),2) if hits else 0',
  'py-greeting': 'def greet(name):\n    return f"Hello, {name}! Welcome to UniPathway."',
  'py-even-sum': 'def sum_even(n):\n    return sum(i for i in range(2, n+1, 2))',
  'py-grade': 'def grade(s):\n    if s<0 or s>100: raise ValueError("out of range")\n    return "Distinction" if s>=70 else "Merit" if s>=60 else "Pass" if s>=40 else "Refer"',
  'py-word-count': 'def word_count(t):\n    c={}\n    for w in t.lower().translate(str.maketrans("", "", ".,!?")).split():\n        c[w]=c.get(w,0)+1\n    return c',
  'py-fee': 'def final_fee(b,s,e):\n    return int(round(b*(1-(0.10 if s else 0)-(0.05 if e else 0))))',
  'data-attendance': 'def attendance_rate(r):\n    t=sum(x["total"] for x in r)\n    return round(sum(x["present"] for x in r)/t*100,1) if t else 0',
  'data-csv': 'def count_by_city(t):\n    c={}\n    for line in t.splitlines()[1:]:\n        if not line.strip(): continue\n        city=line.split(",")[1].strip(); c[city]=c.get(city,0)+1\n    return c',
  'data-phone': 'def clean_phone(raw):\n    d="".join(ch for ch in raw if ch.isdigit())\n    if d.startswith("92"): d="0"+d[2:]\n    return d if len(d)==11 and d.startswith("03") else None',
  'data-summary': 'import statistics\ndef summary(v):\n    return {"mean": round(statistics.mean(v),2), "median": round(statistics.median(v),2), "min": min(v), "max": max(v)}',
  'cyber-password': 'def strength(p):\n    k=sum([any(c.isupper() for c in p), any(c.islower() for c in p), any(c.isdigit() for c in p), any(not c.isalnum() for c in p)])\n    return "strong" if len(p)>=12 and k==4 else "medium" if len(p)>=8 and k>=3 else "weak"',
  'cyber-links': 'def is_suspicious(u):\n    host=u.split("://",1)[-1].split("/",1)[0]\n    return (not u.startswith("https://")) or "@" in u or all(c.isdigit() or c=="." for c in host) or len(host)>30',
  'sql-select': "SELECT name FROM students WHERE city = 'Lahore' ORDER BY name;",
  'sql-count': 'SELECT programme, COUNT(*) FROM students GROUP BY programme ORDER BY programme',
  'sql-join': "SELECT s.name, SUM(p.amount) AS total FROM students s JOIN payments p ON p.student_id = s.id WHERE p.status = 'paid' GROUP BY s.id ORDER BY total DESC",
  'sql-due': "SELECT DISTINCT s.name FROM students s JOIN payments p ON p.student_id = s.id WHERE p.status = 'due' ORDER BY s.name",
  'sql-missing': 'SELECT s.name FROM students s LEFT JOIN payments p ON p.student_id = s.id WHERE p.id IS NULL',
  'js-temp': 'function celsiusToFahrenheit(c){ return c*9/5+32; }',
  'js-passed': 'function passedNames(s){ return s.filter(x=>x.score>=40).map(x=>x.name).sort(); }',
  'js-basket': 'function basketTotal(items, d=0){ const t=items.reduce((a,i)=>a+i.price*i.qty,0); return Math.round(t*(1-d/100)*100)/100; }',
  'js-palindrome': 'function isPalindrome(t){ const c=t.toLowerCase().replace(/[^a-z0-9]/g,""); return c===[...c].reverse().join(""); }',
  'cyber-caesar': 'function caesar(t,s){ return t.replace(/[a-z]/gi,ch=>{const b=ch<="Z"?65:97; return String.fromCharCode(((ch.charCodeAt(0)-b+s)%26+26)%26+b);}); }',
};
const HTML_SOLUTIONS: Record<string, string> = {
  'web-profile': '<html lang="en"><body><h1>Ayesha Khan</h1><p>I am studying computing in Jhelum and love web design.</p><img src="me.jpg" alt="Ayesha smiling"><ul><li>HTML</li><li>CSS</li><li>Python</li></ul></body></html>',
  'web-form': '<html lang="en"><body><form><label for="e">Email</label><input id="e" type="email" required><label>Message <textarea></textarea></label><button type="submit">Send</button></form></body></html>',
  'web-responsive': '<html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>nav{display:flex} @media (max-width: 600px){nav{flex-direction:column}}</style></head><body><nav><a href="/">Home</a><a href="/c">Courses</a><a href="/a">Apply</a></nav></body></html>',
  'web-accessible': '<html lang="en"><body><h1>Courses</h1><h2>Business</h2><img src="b.jpg" alt="Business students"><button>Search</button><p><a href="/apply">Apply for a course</a>.</p></body></html>',
};

function runPython(code: string) { return execFileSync('python3', ['-c', code], { encoding: 'utf8', timeout: 20000 }); }
function runJs(code: string) {
  const lines: string[] = [];
  const console = { log: (...a: unknown[]) => lines.push(a.map(String).join(' ')) };
  new Function('console', code)(console);
  return lines.join('\n');
}
function mark(id: string, answer: string) {
  const ex = exerciseById(id)!;
  const plan = buildMarkedRun(ex, answer, TOKEN)!;
  const out = plan.language === 'python' ? runPython(plan.code) : runJs(plan.code);
  return parseMarkedOutput(out, TOKEN).results!;
}

describe('tech lab catalogue', () => {
  it('has every track populated and unique ids', () => {
    for (const track of TECH_TRACKS) expect(TECH_EXERCISES.some(e => e.track === track.id)).toBe(true);
    expect(new Set(TECH_EXERCISES.map(e => e.id)).size).toBe(TECH_EXERCISES.length);
  });
  it('every auto-marked exercise has a reference answer and every prompt has a rubric', () => {
    for (const ex of TECH_EXERCISES) {
      if (ex.runtime === 'prompt') expect(ex.prompt?.rubric.length).toBeGreaterThanOrEqual(3);
      else if (ex.runtime === 'html') expect(HTML_SOLUTIONS[ex.id]).toBeTruthy();
      else expect(SOLUTIONS[ex.id]).toBeTruthy();
    }
  });
});

describe('JavaScript marking', () => {
  for (const ex of TECH_EXERCISES.filter(e => e.runtime === 'javascript')) {
    it(`${ex.id}: reference passes, starter does not`, () => {
      expect(scoreChecks(mark(ex.id, SOLUTIONS[ex.id])).passed).toBe(true);
      expect(scoreChecks(mark(ex.id, ex.starter)).passed).toBe(false);
    });
  }
});

describe('HTML marking', () => {
  for (const ex of TECH_EXERCISES.filter(e => e.runtime === 'html')) {
    it(`${ex.id}: reference passes, starter does not`, () => {
      expect(scoreChecks(runHtmlChecks(ex, HTML_SOLUTIONS[ex.id])).passed).toBe(true);
      expect(scoreChecks(runHtmlChecks(ex, ex.starter)).passed).toBe(false);
    });
  }
});

describe.skipIf(!hasPython)('Python and SQL marking', () => {
  for (const ex of TECH_EXERCISES.filter(e => e.runtime === 'python' || e.runtime === 'sql')) {
    it(`${ex.id}: reference passes, starter does not`, () => {
      const good = mark(ex.id, SOLUTIONS[ex.id]);
      expect(good.filter(r => !r.passed)).toEqual([]);
      let starterPassed = false;
      try { starterPassed = scoreChecks(mark(ex.id, ex.starter) || []).passed; } catch { starterPassed = false; }
      expect(starterPassed).toBe(false);
    });
  }
  it('SQL errors are reported as a failed check, not a crash', () => {
    const results = mark('sql-select', 'SELEC name FROM nowhere');
    expect(results[0]).toMatchObject({ label: 'Your query runs without errors', passed: false });
  });
});

describe('marked output and scoring', () => {
  it('hides the results line from learner output', () => {
    const parsed = parseMarkedOutput(`hello\n${TOKEN}[["a", true, ""], ["b", false, "boom"]]\n`, TOKEN);
    expect(parsed.visible).toBe('hello');
    expect(parsed.results).toEqual([{ label: 'a', passed: true, detail: '' }, { label: 'b', passed: false, detail: 'boom' }]);
    expect(scoreChecks(parsed.results!)).toEqual({ score: 50, passed: false });
  });
  it('dictation accuracy ignores case and punctuation and lists missing words', () => {
    expect(wordAccuracy('I would like to study, please.', 'i would like to study please').score).toBe(100);
    const r = wordAccuracy('The library opens at nine', 'The library open at nine');
    expect(r.score).toBe(80);
    expect(r.missing).toEqual(['opens']);
    expect(wordAccuracy('Guten Morgen', '').score).toBe(0);
  });
});
