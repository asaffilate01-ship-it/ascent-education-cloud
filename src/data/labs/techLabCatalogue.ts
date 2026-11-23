// Browser tech-lab curriculum. Code runs in the isolated runner; prompts are marked by the AI coach.
export type TechRuntime = 'python' | 'javascript' | 'html' | 'sql' | 'prompt';
export type TrackId = 'ai' | 'python' | 'web' | 'javascript' | 'sql' | 'data' | 'cyber';
export interface HtmlCheck { label: string; test: (doc: Document, source: string) => boolean }
export interface TechExercise {
  id: string; track: TrackId; title: string; level: 'Beginner' | 'Intermediate' | 'Advanced';
  runtime: TechRuntime; minutes: number; brief: string; starter: string;
  /** Python or JavaScript lines calling check(label, () => condition). */
  tests?: string;
  htmlChecks?: HtmlCheck[];
  sql?: { expected: (string | number | null)[][]; ordered: boolean };
  prompt?: { task: string; input: string; rubric: string[] };
}
export interface TechTrack { id: TrackId; title: string; summary: string; skills: string }

export const TECH_TRACKS: TechTrack[] = [
  { id: 'ai', title: 'AI & machine learning', summary: 'Prompt engineering, AI tutoring and the maths behind simple models.', skills: 'Prompting · classification · regression · evaluation' },
  { id: 'python', title: 'Python programming', summary: 'Variables, loops, decisions, dictionaries and real-world functions.', skills: 'Functions · loops · conditions · data structures' },
  { id: 'web', title: 'Web development', summary: 'Build pages with HTML and CSS that work on phones and are accessible.', skills: 'HTML · CSS · forms · responsive design · accessibility' },
  { id: 'javascript', title: 'JavaScript', summary: 'Functions, arrays and objects for interactive websites.', skills: 'Functions · arrays · objects · strings' },
  { id: 'sql', title: 'SQL & databases', summary: 'Query a student records database: filter, count, join and find gaps.', skills: 'SELECT · WHERE · GROUP BY · JOIN · LEFT JOIN' },
  { id: 'data', title: 'Data analysis', summary: 'Clean, summarise and count real-looking data with Python.', skills: 'CSV · cleaning · statistics · reporting' },
  { id: 'cyber', title: 'Cyber security basics', summary: 'Passwords, ciphers, suspicious links and phishing awareness.', skills: 'Password policy · encryption · threat spotting' },
];

export const SQL_SCHEMA = `CREATE TABLE students (id INTEGER PRIMARY KEY, name TEXT, city TEXT, programme TEXT);
INSERT INTO students VALUES
 (1,'Ayesha Khan','Lahore','Business'),(2,'Bilal Ahmed','Jhelum','Computing'),(3,'Fatima Noor','Lahore','Computing'),
 (4,'Hamza Ali','Karachi','Business'),(5,'Zainab Raza','Islamabad','Health'),(6,'Usman Tariq','Jhelum','Computing');
CREATE TABLE payments (id INTEGER PRIMARY KEY, student_id INTEGER, amount INTEGER, status TEXT);
INSERT INTO payments VALUES
 (1,1,50000,'paid'),(2,2,45000,'paid'),(3,2,45000,'due'),(4,3,60000,'paid'),
 (5,4,50000,'due'),(6,6,45000,'paid'),(7,6,20000,'paid');`;

const SQL_TABLES = `Tables:
 students(id, name, city, programme)
 payments(id, student_id, amount, status)   — status is 'paid' or 'due'`;

const text = (doc: Document, selector: string) => (doc.querySelector(selector)?.textContent || '').trim();
const style = (doc: Document) => Array.from(doc.querySelectorAll('style')).map(s => s.textContent || '').join('\n');
const labelled = (doc: Document, input: Element | null) => {
  if (!input) return false;
  if (input.closest('label')) return true;
  const id = input.getAttribute('id');
  return !!id && !!doc.querySelector(`label[for="${CSS.escape(id)}"]`);
};

export const TECH_EXERCISES: TechExercise[] = [
  // ── AI & machine learning ─────────────────────────────────────────
  { id: 'ai-prompt-summary', track: 'ai', title: 'Summarise for a young reader', level: 'Beginner', runtime: 'prompt', minutes: 10,
    brief: 'Write a prompt that makes the AI summarise the passage in exactly 3 bullet points for a 15-year-old, using simple words. Your prompt is sent to the AI with the passage underneath, then marked against the checklist.',
    starter: 'Summarise this text.',
    prompt: { task: 'Summarise the passage in exactly 3 bullet points for a 15-year-old reader using simple language.',
      input: 'Solar panels convert sunlight into electricity using photovoltaic cells. In Pakistan, many households now install rooftop solar systems to reduce electricity bills and keep fans and lights running during load-shedding. Net metering allows owners to sell surplus electricity back to the national grid, although the rules and tariffs are reviewed from time to time.',
      rubric: ['Asks for exactly 3 bullet points', 'States the audience (a 15-year-old) or reading level', 'Asks for simple, clear language', 'The produced summary is accurate to the passage'] } },
  { id: 'ai-prompt-extract', track: 'ai', title: 'Extract data into a table', level: 'Beginner', runtime: 'prompt', minutes: 12,
    brief: 'An admissions team receives enquiry emails. Write a prompt that turns the email into a table with the columns Name, City, Course and Preferred start. If something is missing, the AI must write "Not stated" rather than guessing.',
    starter: '',
    prompt: { task: 'Extract Name, City, Course and Preferred start from an enquiry email into a table, writing "Not stated" for missing fields.',
      input: 'Assalam-o-Alaikum, my name is Hira Saeed and I live in Gujranwala. I am interested in the Level 4 Business Management diploma. Could you tell me the fees? Thank you.',
      rubric: ['Names all four columns: Name, City, Course, Preferred start', 'Asks for a table format', 'Tells the AI to write "Not stated" (or similar) instead of guessing', 'The produced table is correct and marks the start date as not stated'] } },
  { id: 'ai-prompt-fewshot', track: 'ai', title: 'Few-shot classification', level: 'Intermediate', runtime: 'prompt', minutes: 15,
    brief: 'Teach the AI by example. Write a prompt with at least two labelled examples so it classifies each customer message as Complaint, Question or Praise, replying with one label per line.',
    starter: 'Classify these messages:',
    prompt: { task: 'Use few-shot examples to classify each message as Complaint, Question or Praise, one label per line.',
      input: '1. My certificate still has not arrived after six weeks.\n2. Do you offer evening classes in Jhelum?\n3. The online tutor was brilliant, thank you!\n4. Why was I charged twice this month?',
      rubric: ['Includes at least two labelled examples (few-shot)', 'Defines the only allowed labels: Complaint, Question, Praise', 'Specifies the output format (one label per line)', 'The produced labels are correct (4 could be Complaint or Question if justified)'] } },
  { id: 'ai-prompt-tutor', track: 'ai', title: 'Design an AI tutor', level: 'Intermediate', runtime: 'prompt', minutes: 15,
    brief: 'Write instructions that make the AI behave like a good maths tutor: it should guide the learner with a question or hint and must NOT give the final answer straight away. The student message is added underneath your instructions.',
    starter: 'You are a maths tutor.',
    prompt: { task: 'Make the AI act as a tutor who guides with questions and hints instead of giving the final answer.',
      input: 'Student: What is 1/2 + 1/3? Just tell me the answer please.',
      rubric: ['Gives the AI a clear tutor role and audience', 'Explicitly forbids giving the final answer immediately', 'Asks the AI to respond with a guiding question or hint', 'The produced reply guides without revealing 5/6'] } },
  { id: 'ai-py-nearest', track: 'ai', title: 'Nearest-neighbour classifier', level: 'Intermediate', runtime: 'python', minutes: 20,
    brief: 'Many AI systems label new data by finding the most similar known example. Write nearest_label(sample, data).\n• sample is (weight_g, colour_score)\n• data is a list of (weight_g, colour_score, label)\nReturn the label of the point with the smallest straight-line (Euclidean) distance to sample.',
    starter: 'import math\n\ndef nearest_label(sample, data):\n    # Work out the distance from sample to every point and return the closest label\n    pass\n\nfruit = [(150, 0.9, "apple"), (120, 0.2, "lime"), (170, 0.8, "apple"), (110, 0.3, "lime")]\nprint(nearest_label((160, 0.85), fruit))\n',
    tests: `fruit = [(150, 0.9, "apple"), (120, 0.2, "lime"), (170, 0.8, "apple"), (110, 0.3, "lime")]
check("A heavy red fruit is an apple", lambda: nearest_label((160, 0.85), fruit) == "apple")
check("A light green fruit is a lime", lambda: nearest_label((115, 0.25), fruit) == "lime")
check("Uses distance on both features (118 g, 0.9 → lime)", lambda: nearest_label((118, 0.9), fruit) == "lime")
check("Works with a single known point", lambda: nearest_label((1, 1), [(5, 5, "x")]) == "x")` },
  { id: 'ai-py-regression', track: 'ai', title: 'Fit a straight line', level: 'Advanced', runtime: 'python', minutes: 25,
    brief: 'Linear regression predicts a number from another number. Write fit_line(xs, ys) that returns (slope, intercept) using least squares:\nslope = Σ(x − x̄)(y − ȳ) ÷ Σ(x − x̄)²\nintercept = ȳ − slope × x̄\nThen write predict(x, slope, intercept).',
    starter: 'def fit_line(xs, ys):\n    pass\n\ndef predict(x, slope, intercept):\n    pass\n\n# Study hours vs mock score\nprint(fit_line([1, 2, 3, 4], [3, 5, 7, 9]))\n',
    tests: `s, c = fit_line([1, 2, 3, 4], [3, 5, 7, 9])
check("A perfect line gives slope 2", lambda: round(s, 4) == 2)
check("A perfect line gives intercept 1", lambda: round(c, 4) == 1)
s2, c2 = fit_line([0, 1, 2], [1, 2, 2])
check("Noisy data: slope 0.5", lambda: round(s2, 4) == 0.5)
check("Noisy data: intercept 1.1667", lambda: round(c2, 4) == 1.1667)
check("predict(10, 2, 1) is 21", lambda: predict(10, 2, 1) == 21)` },
  { id: 'ai-py-evaluate', track: 'ai', title: 'Evaluate a spam filter', level: 'Intermediate', runtime: 'python', minutes: 15,
    brief: 'Write accuracy(predicted, actual) — the share of correct predictions rounded to 2 decimal places — and precision(predicted, actual, positive) — of the items predicted as positive, the share that really were positive, rounded to 2 decimal places (return 0 if nothing was predicted positive).',
    starter: 'def accuracy(predicted, actual):\n    pass\n\ndef precision(predicted, actual, positive):\n    pass\n',
    tests: `p = ["spam", "ham", "spam", "spam"]
a = ["spam", "ham", "ham", "spam"]
check("accuracy is 0.75", lambda: accuracy(p, a) == 0.75)
check("precision for spam is 0.67", lambda: precision(p, a, "spam") == 0.67)
check("precision for ham is 1.0", lambda: precision(p, a, "ham") == 1.0)
check("precision is 0 when nothing is predicted positive", lambda: precision(["ham"], ["spam"], "spam") == 0)` },

  // ── Python ────────────────────────────────────────────────────────
  { id: 'py-greeting', track: 'python', title: 'Your first function', level: 'Beginner', runtime: 'python', minutes: 5,
    brief: 'Write greet(name) that returns the text "Hello, <name>! Welcome to UniPathway." — for example greet("Ayesha") returns "Hello, Ayesha! Welcome to UniPathway."',
    starter: 'def greet(name):\n    # return a greeting using an f-string\n    pass\n\nprint(greet("Ayesha"))\n',
    tests: `check('greet("Ayesha") is correct', lambda: greet("Ayesha") == "Hello, Ayesha! Welcome to UniPathway.")
check('greet("Bilal") is correct', lambda: greet("Bilal") == "Hello, Bilal! Welcome to UniPathway.")
check("Returns text rather than printing it", lambda: isinstance(greet("X"), str))` },
  { id: 'py-even-sum', track: 'python', title: 'Loops: add the even numbers', level: 'Beginner', runtime: 'python', minutes: 10,
    brief: 'Write sum_even(n) that adds every even number from 1 up to and including n. sum_even(10) = 2 + 4 + 6 + 8 + 10 = 30.',
    starter: 'def sum_even(n):\n    total = 0\n    # loop and add the even numbers\n    return total\n\nprint(sum_even(10))\n',
    tests: `check("sum_even(10) is 30", lambda: sum_even(10) == 30)
check("Includes n when n is even: sum_even(4) is 6", lambda: sum_even(4) == 6)
check("sum_even(7) is 12", lambda: sum_even(7) == 12)
check("sum_even(1) is 0", lambda: sum_even(1) == 0)` },
  { id: 'py-grade', track: 'python', title: 'Decisions: grade bands', level: 'Beginner', runtime: 'python', minutes: 10,
    brief: 'Write grade(score): 70+ → "Distinction", 60–69 → "Merit", 40–59 → "Pass", below 40 → "Refer". If score is below 0 or above 100, raise ValueError.',
    starter: 'def grade(score):\n    pass\n',
    tests: `check("85 is Distinction", lambda: grade(85) == "Distinction")
check("70 is Distinction (boundary)", lambda: grade(70) == "Distinction")
check("60 is Merit", lambda: grade(60) == "Merit")
check("40 is Pass", lambda: grade(40) == "Pass")
check("39 is Refer", lambda: grade(39) == "Refer")
check("101 raises ValueError", lambda: raises(lambda: grade(101), ValueError))
check("-1 raises ValueError", lambda: raises(lambda: grade(-1), ValueError))` },
  { id: 'py-word-count', track: 'python', title: 'Dictionaries: count words', level: 'Intermediate', runtime: 'python', minutes: 15,
    brief: 'Write word_count(text) that returns a dictionary of each lower-case word and how many times it appears. Ignore the punctuation marks . , ! ?',
    starter: 'def word_count(text):\n    counts = {}\n    return counts\n\nprint(word_count("Learn, practise, learn again!"))\n',
    tests: `check("Counts repeated words", lambda: word_count("Learn, practise, learn again!") == {"learn": 2, "practise": 1, "again": 1})
check("Ignores case", lambda: word_count("Lahore lahore LAHORE") == {"lahore": 3})
check("Empty text gives an empty dictionary", lambda: word_count("") == {})` },
  { id: 'py-fee', track: 'python', title: 'Real-world logic: fee calculator', level: 'Intermediate', runtime: 'python', minutes: 15,
    brief: 'Write final_fee(base, has_sibling, paid_early). A sibling discount is 10% and an early-payment discount is 5%. Add the discounts together, take them off the base fee and return a whole number of rupees (round to the nearest rupee).',
    starter: 'def final_fee(base, has_sibling, paid_early):\n    pass\n\nprint(final_fee(100000, True, True))\n',
    tests: `check("Both discounts: 100000 → 85000", lambda: final_fee(100000, True, True) == 85000)
check("Early only: 100000 → 95000", lambda: final_fee(100000, False, True) == 95000)
check("Sibling only: 80000 → 72000", lambda: final_fee(80000, True, False) == 72000)
check("No discount", lambda: final_fee(45000, False, False) == 45000)
check("Returns a whole number", lambda: isinstance(final_fee(33333, True, True), int))` },

  // ── Web development ───────────────────────────────────────────────
  { id: 'web-profile', track: 'web', title: 'Build a profile card', level: 'Beginner', runtime: 'html', minutes: 10,
    brief: 'Build a simple profile page with: a main heading (h1) containing your name, a paragraph about you, an image with alt text describing it, and a list with at least 3 skills.',
    starter: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="utf-8">\n  <title>My profile</title>\n</head>\n<body>\n  \n</body>\n</html>\n',
    htmlChecks: [
      { label: 'Has an h1 heading with text', test: d => text(d, 'h1').length > 1 },
      { label: 'Has a paragraph of at least 20 characters', test: d => Array.from(d.querySelectorAll('p')).some(p => (p.textContent || '').trim().length >= 20) },
      { label: 'Has an image with descriptive alt text', test: d => Array.from(d.querySelectorAll('img')).some(i => (i.getAttribute('alt') || '').trim().length >= 3) },
      { label: 'Has a list with 3 or more items', test: d => Array.from(d.querySelectorAll('ul,ol')).some(l => l.querySelectorAll('li').length >= 3) },
    ] },
  { id: 'web-form', track: 'web', title: 'An accessible enquiry form', level: 'Beginner', runtime: 'html', minutes: 15,
    brief: 'Create a form with a labelled email field that is required, a labelled message box (textarea) and a submit button.',
    starter: '<!DOCTYPE html>\n<html lang="en">\n<body>\n  <form>\n    \n  </form>\n</body>\n</html>\n',
    htmlChecks: [
      { label: 'Has a form', test: d => !!d.querySelector('form') },
      { label: 'Has an email input', test: d => !!d.querySelector('input[type="email"]') },
      { label: 'The email input has a label', test: d => labelled(d, d.querySelector('input[type="email"]')) },
      { label: 'The email input is required', test: d => !!d.querySelector('input[type="email"][required]') },
      { label: 'Has a labelled textarea', test: d => labelled(d, d.querySelector('textarea')) },
      { label: 'Has a submit button', test: d => !!d.querySelector('button[type="submit"], input[type="submit"], form button:not([type])') },
    ] },
  { id: 'web-responsive', track: 'web', title: 'A responsive navigation bar', level: 'Intermediate', runtime: 'html', minutes: 20,
    brief: 'Make a page that works on phones: add the viewport meta tag, a <nav> with at least 3 links, lay the links out with flexbox or grid, and use a @media rule to change the layout on small screens.',
    starter: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <style>\n    \n  </style>\n</head>\n<body>\n  \n</body>\n</html>\n',
    htmlChecks: [
      { label: 'Has a viewport meta tag', test: d => /width=device-width/i.test(d.querySelector('meta[name="viewport"]')?.getAttribute('content') || '') },
      { label: 'Has a nav with 3+ links', test: d => (d.querySelector('nav')?.querySelectorAll('a[href]').length || 0) >= 3 },
      { label: 'Uses flexbox or grid', test: d => /display\s*:\s*(flex|grid|inline-flex)/i.test(style(d)) },
      { label: 'Has a @media rule', test: d => /@media[^{]*\(/i.test(style(d)) },
    ] },
  { id: 'web-accessible', track: 'web', title: 'Fix accessibility problems', level: 'Intermediate', runtime: 'html', minutes: 15,
    brief: 'This page has accessibility problems. Fix them so: the html tag declares a language, there is exactly one h1, every image has alt text, every button has visible text and no link says "click here".',
    starter: '<!DOCTYPE html>\n<html>\n<body>\n  <h1>Courses</h1>\n  <h1>Business</h1>\n  <img src="business.jpg">\n  <button></button>\n  <p>To apply <a href="/apply">click here</a>.</p>\n</body>\n</html>\n',
    htmlChecks: [
      { label: 'The html element has a lang attribute', test: d => !!d.documentElement.getAttribute('lang')?.trim() },
      { label: 'Exactly one h1', test: d => d.querySelectorAll('h1').length === 1 },
      { label: 'Every image has an alt attribute', test: d => Array.from(d.querySelectorAll('img')).every(i => i.hasAttribute('alt')) },
      { label: 'Every button has text', test: d => Array.from(d.querySelectorAll('button')).every(b => (b.textContent || '').trim() || b.getAttribute('aria-label')) },
      { label: 'No "click here" links', test: d => Array.from(d.querySelectorAll('a')).every(a => !/click here/i.test(a.textContent || '')) },
    ] },

  // ── JavaScript ────────────────────────────────────────────────────
  { id: 'js-temp', track: 'javascript', title: 'Functions: temperature converter', level: 'Beginner', runtime: 'javascript', minutes: 5,
    brief: 'Write celsiusToFahrenheit(c) that returns c × 9 ÷ 5 + 32.',
    starter: 'function celsiusToFahrenheit(c) {\n  // return the converted value\n}\n\nconsole.log(celsiusToFahrenheit(40));\n',
    tests: `check('0°C is 32°F', () => celsiusToFahrenheit(0) === 32);
check('40°C is 104°F', () => celsiusToFahrenheit(40) === 104);
check('-40°C is -40°F', () => celsiusToFahrenheit(-40) === -40);` },
  { id: 'js-passed', track: 'javascript', title: 'Arrays: who passed?', level: 'Beginner', runtime: 'javascript', minutes: 10,
    brief: 'Write passedNames(students) where students is an array of { name, score }. Return the names of students with a score of 40 or more, sorted alphabetically.',
    starter: 'function passedNames(students) {\n  // use filter, map and sort\n}\n\nconsole.log(passedNames([{ name: "Usman", score: 72 }, { name: "Ali", score: 35 }, { name: "Hira", score: 40 }]));\n',
    tests: `check('Filters and sorts', () => eq(passedNames([{ name: 'Usman', score: 72 }, { name: 'Ali', score: 35 }, { name: 'Hira', score: 40 }]), ['Hira', 'Usman']));
check('Empty list gives empty list', () => eq(passedNames([]), []));
check('Does not change the original array order', () => { const s = [{ name: 'Zara', score: 90 }, { name: 'Amna', score: 80 }]; passedNames(s); return s[0].name === 'Zara'; });` },
  { id: 'js-basket', track: 'javascript', title: 'Objects: basket total', level: 'Intermediate', runtime: 'javascript', minutes: 15,
    brief: 'Write basketTotal(items, discountPercent = 0). Each item is { price, qty }. Add price × qty for every item, apply the percentage discount and return the total rounded to 2 decimal places as a number.',
    starter: 'function basketTotal(items, discountPercent = 0) {\n}\n\nconsole.log(basketTotal([{ price: 250, qty: 2 }, { price: 99.99, qty: 1 }], 10));\n',
    tests: `check('No discount', () => basketTotal([{ price: 250, qty: 2 }, { price: 100, qty: 1 }]) === 600);
check('10% discount', () => basketTotal([{ price: 250, qty: 2 }, { price: 99.99, qty: 1 }], 10) === 539.99);
check('Empty basket is 0', () => basketTotal([]) === 0);
check('Returns a number', () => typeof basketTotal([{ price: 1, qty: 1 }]) === 'number');` },
  { id: 'js-palindrome', track: 'javascript', title: 'Strings: palindrome checker', level: 'Intermediate', runtime: 'javascript', minutes: 10,
    brief: 'Write isPalindrome(text) that returns true if the text reads the same backwards, ignoring capital letters, spaces and punctuation.',
    starter: 'function isPalindrome(text) {\n}\n\nconsole.log(isPalindrome("Never odd or even"));\n',
    tests: `check('"Never odd or even" is a palindrome', () => isPalindrome('Never odd or even') === true);
check('"A man, a plan, a canal: Panama!" is a palindrome', () => isPalindrome('A man, a plan, a canal: Panama!') === true);
check('"UniPathway" is not', () => isPalindrome('UniPathway') === false);` },

  // ── SQL ───────────────────────────────────────────────────────────
  { id: 'sql-select', track: 'sql', title: 'SELECT and WHERE', level: 'Beginner', runtime: 'sql', minutes: 5,
    brief: `List the names of students who live in Lahore, in alphabetical order. Return only the name column.\n\n${SQL_TABLES}`,
    starter: 'SELECT * FROM students;', sql: { expected: [['Ayesha Khan'], ['Fatima Noor']], ordered: true } },
  { id: 'sql-count', track: 'sql', title: 'GROUP BY and COUNT', level: 'Beginner', runtime: 'sql', minutes: 10,
    brief: `Show each programme and how many students study it, ordered by programme name. Return two columns: programme, and the count.\n\n${SQL_TABLES}`,
    starter: 'SELECT programme FROM students;', sql: { expected: [['Business', 2], ['Computing', 3], ['Health', 1]], ordered: true } },
  { id: 'sql-join', track: 'sql', title: 'JOIN and SUM', level: 'Intermediate', runtime: 'sql', minutes: 15,
    brief: `For every student who has paid something, show their name and the total amount with status 'paid', highest total first.\n\n${SQL_TABLES}`,
    starter: 'SELECT s.name, p.amount\nFROM students s\nJOIN payments p ON p.student_id = s.id;',
    sql: { expected: [['Usman Tariq', 65000], ['Fatima Noor', 60000], ['Ayesha Khan', 50000], ['Bilal Ahmed', 45000]], ordered: true } },
  { id: 'sql-due', track: 'sql', title: 'Find outstanding fees', level: 'Intermediate', runtime: 'sql', minutes: 10,
    brief: `List the names (A–Z, each name once) of students who have at least one payment with status 'due'.\n\n${SQL_TABLES}`,
    starter: '', sql: { expected: [['Bilal Ahmed'], ['Hamza Ali']], ordered: true } },
  { id: 'sql-missing', track: 'sql', title: 'LEFT JOIN: who has no payments?', level: 'Advanced', runtime: 'sql', minutes: 15,
    brief: `Find the names of students who have no payment records at all. Hint: a LEFT JOIN keeps students with no matching payments, and their payment columns are NULL.\n\n${SQL_TABLES}`,
    starter: '', sql: { expected: [['Zainab Raza']], ordered: false } },

  // ── Data analysis ─────────────────────────────────────────────────
  { id: 'data-attendance', track: 'data', title: 'Overall attendance rate', level: 'Beginner', runtime: 'python', minutes: 10,
    brief: 'records is a list of dictionaries like {"name": "Ayesha", "present": 18, "total": 20}. Write attendance_rate(records) that returns the overall percentage (all present ÷ all sessions × 100) rounded to 1 decimal place. Return 0 if there are no sessions.',
    starter: 'def attendance_rate(records):\n    pass\n\nclass_data = [\n    {"name": "Ayesha", "present": 18, "total": 20},\n    {"name": "Bilal", "present": 15, "total": 20},\n]\nprint(attendance_rate(class_data))\n',
    tests: `check("Two learners: 82.5", lambda: attendance_rate([{"name": "A", "present": 18, "total": 20}, {"name": "B", "present": 15, "total": 20}]) == 82.5)
check("Different totals are weighted: 70.0", lambda: attendance_rate([{"name": "A", "present": 9, "total": 10}, {"name": "B", "present": 5, "total": 10}]) == 70.0)
check("No records gives 0", lambda: attendance_rate([]) == 0)` },
  { id: 'data-csv', track: 'data', title: 'Count rows in a CSV', level: 'Intermediate', runtime: 'python', minutes: 15,
    brief: 'Write count_by_city(csv_text). The first line is a header "name,city". Return a dictionary of city → number of students. Trim spaces around values and skip blank lines.',
    starter: 'def count_by_city(csv_text):\n    pass\n\ndata = """name,city\nAyesha, Lahore\nBilal,Jhelum\nHira ,Lahore\n"""\nprint(count_by_city(data))\n',
    tests: `check("Counts each city", lambda: count_by_city("name,city\\nAyesha, Lahore\\nBilal,Jhelum\\nHira ,Lahore\\n") == {"Lahore": 2, "Jhelum": 1})
check("Skips blank lines", lambda: count_by_city("name,city\\n\\nA,Karachi\\n\\n") == {"Karachi": 1})
check("Header only gives empty dictionary", lambda: count_by_city("name,city") == {})` },
  { id: 'data-phone', track: 'data', title: 'Clean phone numbers', level: 'Intermediate', runtime: 'python', minutes: 20,
    brief: 'Admissions data has messy mobile numbers. Write clean_phone(raw) that returns the 11-digit local format 03XXXXXXXXX. Accept forms like "+92 300 1234567", "0300-1234567" and "923001234567". Return None if it is not a valid Pakistani mobile number.',
    starter: 'def clean_phone(raw):\n    digits = "".join(ch for ch in raw if ch.isdigit())\n    pass\n',
    tests: `check("+92 300 1234567", lambda: clean_phone("+92 300 1234567") == "03001234567")
check("0300-1234567", lambda: clean_phone("0300-1234567") == "03001234567")
check("923451234567", lambda: clean_phone("923451234567") == "03451234567")
check("Too short is None", lambda: clean_phone("0300123") is None)
check("Landline-style 042 is None", lambda: clean_phone("042-35761234") is None)` },
  { id: 'data-summary', track: 'data', title: 'Summary statistics', level: 'Beginner', runtime: 'python', minutes: 15,
    brief: 'Write summary(values) that returns a dictionary with "mean", "median", "min" and "max", with mean and median rounded to 2 decimal places. (You may use the statistics module.)',
    starter: 'def summary(values):\n    pass\n\nprint(summary([55, 72, 64, 90, 48]))\n',
    tests: `r = summary([55, 72, 64, 90, 48])
check("mean is 65.8", lambda: r["mean"] == 65.8)
check("median is 64", lambda: r["median"] == 64)
check("min and max", lambda: r["min"] == 48 and r["max"] == 90)
check("Even count median is the middle average", lambda: summary([1, 2, 3, 4])["median"] == 2.5)` },

  // ── Cyber security ────────────────────────────────────────────────
  { id: 'cyber-password', track: 'cyber', title: 'Password strength checker', level: 'Beginner', runtime: 'python', minutes: 15,
    brief: 'Write strength(password). Count the character types used: upper-case, lower-case, digits, symbols (anything else).\n• "strong": 12+ characters and all 4 types\n• "medium": 8+ characters and at least 3 types\n• otherwise "weak"',
    starter: 'def strength(password):\n    pass\n\nprint(strength("Pakistan@2026!"))\n',
    tests: `check('"password" is weak', lambda: strength("password") == "weak")
check('"Lahore2026" is medium', lambda: strength("Lahore2026") == "medium")
check('"Pakistan@2026!" is strong', lambda: strength("Pakistan@2026!") == "strong")
check('"Ab1!" is weak (too short)', lambda: strength("Ab1!") == "weak")
check('"abcdefgh1234" is weak (2 types)', lambda: strength("abcdefgh1234") == "weak")` },
  { id: 'cyber-caesar', track: 'cyber', title: 'Caesar cipher', level: 'Intermediate', runtime: 'javascript', minutes: 15,
    brief: 'Write caesar(text, shift) that moves each letter shift places along the alphabet, wrapping from z to a, keeping capitals as capitals and leaving other characters unchanged. A negative shift decodes.',
    starter: 'function caesar(text, shift) {\n}\n\nconsole.log(caesar("Hello, World!", 3));\n',
    tests: `check('Encodes with shift 3', () => caesar('Hello, World!', 3) === 'Khoor, Zruog!');
check('Wraps around: xyz → abc', () => caesar('xyz', 3) === 'abc');
check('Negative shift decodes', () => caesar('Khoor', -3) === 'Hello');
check('Large shift 29 works like 3', () => caesar('abc', 29) === 'def');` },
  { id: 'cyber-links', track: 'cyber', title: 'Spot suspicious links', level: 'Intermediate', runtime: 'python', minutes: 15,
    brief: 'Write is_suspicious(url) that returns True if ANY of these is true:\n• it does not start with https://\n• it contains an @ sign\n• the host name is an IP address (only digits and dots)\n• the host name is longer than 30 characters\nThe host is the part between :// and the next / (or the end).',
    starter: 'def is_suspicious(url):\n    pass\n\nprint(is_suspicious("http://192.168.1.10/login"))\n',
    tests: `check("A normal https link is safe", lambda: is_suspicious("https://unipathway.pk/courses") is False)
check("http is suspicious", lambda: is_suspicious("http://unipathway.pk") is True)
check("@ trick is suspicious", lambda: is_suspicious("https://bank.com@evil.example/login") is True)
check("IP address host is suspicious", lambda: is_suspicious("https://192.168.1.10/login") is True)
check("Very long host is suspicious", lambda: is_suspicious("https://secure-account-verification-update.example.com/") is True)` },
  { id: 'cyber-phishing', track: 'cyber', title: 'AI phishing analyst', level: 'Intermediate', runtime: 'prompt', minutes: 12,
    brief: 'Write a prompt that asks the AI to analyse the email below for phishing warning signs. It should list each sign it finds, give an overall risk rating (Low, Medium or High) and recommend one safe action.',
    starter: '',
    prompt: { task: 'Get the AI to list phishing warning signs, give a Low/Medium/High risk rating and one safe action.',
      input: 'From: HBL Support <alerts@hbl-secure-verify.co>\nSubject: URGENT: Account suspended\nDear customer, your account will be closed in 2 hours. Verify your CNIC and PIN now at http://hbl-secure-verify.co/login to avoid losing your money.',
      rubric: ['Asks the AI to list specific warning signs', 'Asks for a risk rating using Low, Medium or High', 'Asks for a recommended safe action', 'The output correctly rates this email as High risk and spots the fake domain and urgency'] } },
];

export const exerciseById = (id: string | null | undefined) => TECH_EXERCISES.find(e => e.id === id);
export const exercisesForTrack = (track: TrackId) => TECH_EXERCISES.filter(e => e.track === track);
