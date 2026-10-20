/** Optional teaching examples. These are NOT installed into any course.
 * A lecturer chooses an example and deliberately adds it to an assigned module.
 */
export type CodeLanguage='html'|'javascript'|'python'|'sql'|'bash'|'text';
export type CodeExerciseExample={
 id:string;title:string;language:CodeLanguage;instructions:string;
 starterCode:string;expectedEvidence:string;
};
export const SELF_STUDY_EXAMPLES:CodeExerciseExample[]=[
 {
  id:'html-timetable',title:'Build an accessible course timetable',language:'html',
  instructions:'Create a timetable with a heading and table caption, at least three weekday rows and readable column headings. Preview your HTML and explain one accessibility choice. Save your draft before submitting.',
  starterCode:`<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>My UniPathway Timetable</title>
<style>body{font:16px system-ui;padding:2rem}table{border-collapse:collapse}td,th{border:1px solid #555;padding:.6rem}</style></head>
<body>
<h1>My study timetable</h1>
<table>
<caption>Week 1 lessons</caption>
<thead><tr><th scope="col">Day</th><th scope="col">Subject</th></tr></thead>
<tbody><tr><th scope="row">Monday</th><td>Technology</td></tr></tbody>
</table>
</body></html>`,
  expectedEvidence:'Rendered timetable and a short explanation of table headings and accessibility.'
 },
 {
  id:'javascript-progress',title:'JavaScript learner progress summary',language:'javascript',
  instructions:'Write a function that calculates the average from an array of marks, including zero. Use console.log to show the average for [0,65,85] and for an empty array. Explain how you handled an empty result. The code runs in an isolated browser preview, not against student records.',
  starterCode:`const marks = [0, 65, 85];
function average(values) {
  // TODO: return a number, or null for an empty array
  return null;
}
console.log('Average:', average(marks));
console.log('Empty:', average([]));`,
  expectedEvidence:'Code with an empty-array check, correct average of 50, and console output.'
 },
 {
  id:'python-study-plan',title:'Python: create a revision plan',language:'python',
  instructions:'Using a list of subjects, write a function to create a numbered weekly study plan. Include a guard for an empty list. Save your Python file and explain how you would test it. Real Python execution requires a configured provider; the LMS editor does not simulate execution.',
  starterCode:`subjects = ["Maths", "Chemistry", "English"]

def plan_week(items):
    # TODO: return ["Day 1: Maths", ...]
    return []

for item in plan_week(subjects):
    print(item)`,
  expectedEvidence:'Python code and a short manual test plan. Execution is not available until a Python provider is connected.'
 },
 {
  id:'sql-course-metrics',title:'SQL: analyse anonymised course attendance',language:'sql',
  instructions:'Write a SELECT query grouping attendance rows by course_id. Return the number of present sessions and order by that count descending. Never use real identifiable student records; the sample table is illustrative. SQL execution requires a configured provider.',
  starterCode:`-- Illustrative schema: attendance(course_id, student_ref, mark)
-- mark values include 'present', 'late', 'absent', 'excused'.
SELECT course_id,
       COUNT(*) FILTER (WHERE mark = 'present') AS present_count
FROM attendance
GROUP BY course_id
ORDER BY present_count DESC;`,
  expectedEvidence:'SQL query, explanation of the WHERE/FILTER decision, and a note on privacy.'
 }
];
