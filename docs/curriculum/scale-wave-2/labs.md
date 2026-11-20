# Wave 2: Offline technology labs

Staff-review drafts. Use only the fictional inputs below, with paper or a local scratch file. No accounts, installations or connection to real systems are needed. Board and awarding-body mapping is pending.

## W2-LAB-01 · Rotate and reflect a bitmap

**Audience:** Grade 8 · 25 minutes  
**Objective:** Transform a pixel grid and distinguish a mirror from a rotation.

1. Draw a 4 × 4 grid; label rows top-down and columns left-right from 1.
2. Plot example (row, column) points (1,1), (2,1), (2,2). A horizontal mirror sends (r,c) to (r,5−c), giving (1,4), (2,4), (2,3).
3. A clockwise rotation sends (r,c) to (c,5−r), giving (1,4), (1,3), (2,3). Describe positions in text, not colour alone.

**Independent task:** Transform (1,2), (1,3), (2,2), (3,2) both ways. Deliver the new coordinates and compare marked pixel counts.

**Observable check:** Mirror: (1,3), (1,2), (2,3), (3,3). Rotation: (2,4), (3,4), (2,3), (2,2). Both preserve four marked pixels; equal counts cannot identify the transform.

## W2-LAB-02 · Simulate an exhibit with a truth table

**Audience:** Grade 9 · 25 minutes  
**Objective:** Distinguish an inclusive OR from an AND with an overriding condition.

1. Label B “button pressed” and D “demo timer reached.” Write their four combinations in order 00, 01, 10, 11.
2. Enter outputs for B OR D (0,1,1,1) and B AND D (0,0,0,1).
3. Add quiet mode Q. Copy the four input pairs once with Q=0 and once with Q=1.

**Independent task:** A caption shows if (B OR D) AND NOT Q. Fill all eight outputs. Find a counterexample showing that (B AND D) AND NOT Q would behave differently.

**Observable check:** Q=0 produces 0,1,1,1; Q=1 produces 0,0,0,0. Example B=1,D=0,Q=0 gives 1 under the intended rule and 0 under the alternative. This is a paper simulation, not wiring.

## W2-LAB-03 · Calculate elapsed time across midnight

**Audience:** Grade 10 · 30 minutes  
**Objective:** Convert fictional timestamps to comparable minute values while preserving invalid and missing readings.

1. Write columns for start day offset, start time, finish day offset and finish time. Offset 0 is the first day, 1 the next day.
2. Convert each 24-hour timestamp to 1,440 × offset + 60 × hour + minute.
3. Example: day 0 23:50 to day 1 00:15 is 1,455−1,430 = 25 minutes. Mark missing time as unknown.

**Independent task:** Calculate and rank known valid durations: A (day 0 23:55 → day 1 00:10), B (day 1 09:25 → day 1 10:15), C (day 1 10:00 → missing), D (day 1 11:00 → day 1 10:55).

**Observable check:** B=50 and A=15, in that order. C is unknown and D is invalid (−5). Do not infer an extra day for D without evidence.

## W2-LAB-04 · Fit a raster under a payload cap

**Audience:** Grade 11 · 30 minutes  
**Objective:** Calculate uncompressed raster payloads and explain why increasing both sides affects storage.

1. Use width × height × bits per pixel, then divide by 8. For this toy format ignore headers, padding and compression.
2. Sketch two grids of the same aspect ratio; double both sides to show four times as many positions.
3. Example: 20 × 12 at 4 bits per pixel needs 960 bits or 120 bytes and can encode 16 values per pixel.

**Independent task:** Compare A (40 × 24 at 4 bits), B (40 × 24 at 8 bits), C (80 × 48 at 4 bits). Choose the highest-resolution option under a 600-byte payload cap and state its available values per pixel.

**Observable check:** A=480 bytes, B=960, C=1,920. Only A fits, with 16 available values per pixel. Real file sizes may include metadata or compression.

## W2-LAB-05 · Trace states in a print-proof workflow

**Audience:** Grade 12 · 35 minutes  
**Objective:** Specify valid state transitions separately from invalid events that must leave state unchanged.

1. Write states Draft, Review, Approved and Archived. Rules: Draft + submit → Review; Review + return → Draft; Review + approve → Approved; Approved + archive → Archived.
2. Make a 4 × 4 state/event table, marking every unlisted combination invalid and unchanged.
3. Trace Draft + submit + return. Record before-state, event, after-state and whether accepted for each step.

**Independent task:** From Draft, process approve, submit, return, submit, approve, submit, archive. Deliver the transition log and propose one check that detects an update on invalid input.

**Observable check:** After-states are Draft, Review, Draft, Review, Approved, Approved, Archived. Events 1 and 6 are invalid. Compare stored state and the count of accepted changes before and after event 6; neither should change.

## W2-LAB-06 · Scale a diagram without stretching it

**Audience:** Vocational Level 2 Technology · 25 minutes  
**Objective:** Choose the largest proportional version that fits a fictional safe print area.

1. Note original width and height and the usable print dimensions after margins.
2. For 120 × 80 mm and usable 90 × 70 mm, divide available by original for both sides: 0.75 and 0.875.
3. Use the smaller ratio on both dimensions. The example prints at 90 × 60 mm.

**Independent task:** Fit a 180 × 120 mm diagram into 150 × 90 mm. Calculate scale, print dimensions and unused width. Check whether rotating it 90 degrees would let you print larger.

**Observable check:** Without rotation scale is 75%, print 135 × 90, unused width 15 mm. Rotated, scale is 50%, print 60 × 90. Choose no rotation. Stretching to 150 × 90 does not preserve aspect ratio.

## W2-LAB-07 · Turn a long table into a cross-tab

**Audience:** Vocational Level 3 Technology · 30 minutes  
**Objective:** Pivot a table while showing which cells are unreported rather than true zeros.

1. Start with fictional rows (Models, Morning, 4), (Models, Afternoon, 2), (Drawing, Morning, 0).
2. Draw category rows and columns Morning and Afternoon. Drawing/Morning is 0; Drawing/Afternoon is not recorded.
3. Caption the table so readers know any total counts recorded entries only.

**Independent task:** Add (Drawing, Afternoon, 3), (Robotics, Afternoon, 5), (Robotics, Morning, not recorded). Deliver the cross-tab, totals and coverage for both times.

**Observable check:** Morning 4,0,not recorded totals 4 with 2/3 coverage; afternoon 2,3,5 totals 10 with 3/3 coverage. The different reporting coverage limits the interpretation.

## W2-LAB-08 · Reconcile two versions of a data format

**Audience:** Vocational Level 4 Technology · 35 minutes  
**Objective:** Convert a small scratch dataset to a revised schema without losing legitimate zeros.

1. Source fields: item ID, duration in minutes, observed Y/N. Y requires a nonnegative integer; N requires a blank.
2. Target fields: ID, duration in seconds, status observed/pending. Source A|2|Y becomes A|120|observed. Pending duration stays blank.
3. Log rejected IDs with reasons and reconcile input count to converted plus rejected rows.

**Independent task:** Convert B|0|Y, C|blank|N, D|4|N, E|blank|Y, F|3|Y. Identify what must be reviewed rather than inferred.

**Observable check:** B|0|observed, C|blank|pending, F|180|observed. Reject D because pending has a number and E because observed duration is blank. 5=3+2; zero is not missing.

## W2-LAB-09 · Find the critical path in a work plan

**Audience:** Vocational Level 5 Technology · 40 minutes  
**Objective:** Calculate dependency-controlled finish times and show why some shorter tasks do not shorten the plan.

1. Draw A opening two parallel paths to B and C; both must finish before D. Assume no resource conflicts.
2. For durations A=2, B=3, C=1, D=1 hours, start A at 0, B and C at 2, D at 5. Finish at 6.
3. Identify the critical path A→B→D. Compare finish times by recalculating both branches, not just subtracting time.

**Independent task:** Case A=3, B=5, C=4, D=2. Calculate project finish and critical path. Test reducing C by 2 hours and, separately, reducing B by 2 hours.

**Observable check:** Base finish 10 with A→B→D. Reducing C leaves finish 10. Reducing B shifts the critical path to A→C→D and finish to 9. Savings are zero and one hour respectively.

## W2-LAB-10 · Test a service change under two acceptance thresholds

**Audience:** Vocational Level 6 Technology · 40 minutes  
**Objective:** Define denominators and compare synthetic outcomes before accepting a release.

1. Define success per attempt, per request after allowed retries and per request on the first attempt.
2. Example: request A succeeds on its second attempt and B succeeds first time. The rates are 2/3, 2/2 and 1/2 respectively.
3. Write the rule before counting: adopt only if request success is at least 75% and first-attempt success at least 50%.

**Independent task:** Compare X: S, FS, FF, S and Y: FS, FS, FS, F. Each entry is one request; S and F denote successful or failed attempts. Calculate all three rates and apply the rule.

**Observable check:** X: 3/6 per attempt, 3/4 per request, 2/4 first attempt; passes. Y: 3/7 per attempt, 3/4 per request, 0/4 first attempt; fails. Equal request success does not establish equal user effort or the reliability of a real service.
