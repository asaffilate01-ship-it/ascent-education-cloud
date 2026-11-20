# Practical technology labs: 16 items

**Staff review only.** Use fictional data only in an offline scratch workspace, spreadsheet, existing local tool or on paper. No personal accounts, live targets, hardware assembly or publishing. Have a tutor review the output or equivalent paper trace. Do not require a learner to install software to complete these activities.

## LAB-01 · Total a library returns sheet

**Audience:** Grade 8

**Objective:** Use addition in a spreadsheet or on squared paper and reconcile a total.

**Worked example:** Create columns Day, Fiction, Fact. Enter Mon 4 3 and Tue 6 2. Add a Total column; in D2 type =B2+C2 and copy down. Monday returns total 7 and Tuesday 8.

**Practice:** Add Wed 3 5. Deliver the three daily totals and use a second calculation (fiction subtotal plus fact subtotal) to check the grand total.

**Answer / success criteria:** Daily totals 7, 8, 8; fiction subtotal 13, fact subtotal 10; grand total 23 either way. If a check differs, inspect the cell references.

## LAB-02 · Trace a classroom slide sorter

**Audience:** Grade 8

**Objective:** Make an explicit decision diagram and test a limiting case.

**Worked example:** On paper draw Start, then Is the fictional slide numbered?, then Yes to Sort by number and No to Put in review tray. Test slide labelled 07 and unlabelled slide.

**Practice:** Write a separate diagram for a school model display: 0–30 cm inclusive uses a small shelf, >30 cm uses a large shelf; missing or negative values require review. Deliver traces for missing, −2, 30 and 31.

**Answer / success criteria:** One valid diagram tests missing or negative first, then ≤30. Expected outputs: review, review, small, large. Draw labelled arrows from each decision.

## LAB-03 · Count entries with a running tally

**Audience:** Grade 9

**Objective:** Trace a loop with an inclusive condition and separate count from total.

**Worked example:** In a paper grid use Count=0. For each value in [3, 5, 2], increment Count only if the value is at least 4. Trace counts 0, 1, 1.

**Practice:** Trace [4, 2, 6, 1, 4] under the same rule. Then change the rule to greater than 4. Deliver both traces and explain the difference.

**Answer / success criteria:** At least 4: 1, 1, 2, 2, 3. Greater than 4: 0, 0, 1, 1, 1. Values equal to 4 count only under the inclusive rule.

## LAB-04 · Group records without double-counting

**Audience:** Grade 9

**Objective:** Organise fictional device inventory rows and verify that grouped counts agree with the source count.

**Worked example:** On paper or a local sheet, list T1 Tablet, L1 Laptop, T2 Tablet, M1 Monitor. Make a tally by category; counts are Tablet 2, Laptop 1, Monitor 1.

**Practice:** Add L2 Laptop, T3 Tablet and M2 Monitor. Deliver the grouped table and demonstrate what an accidental repeated T3 would do to a count of rows versus distinct item IDs.

**Answer / success criteria:** Groups should be Tablet 3, Laptop 2, Monitor 2, total 7. With accidental repeated T3 there are 8 rows but still 7 distinct IDs; investigate the duplicate before reporting.

## LAB-05 · Make a handout easier to navigate

**Audience:** Grade 10

**Objective:** Use headings, descriptive wording and non-colour status cues in an offline document.

**Worked example:** In a text editor or notebook rewrite a section titled Click here with a standalone heading such as Find your practice worksheet; replace a green dot with the label Ready.

**Practice:** Redesign a fictional lab notice: bold text alone acts as a heading, dates are called here, and red and green dots show status. Deliver a before/after text outline and read it top to bottom without colour.

**Answer / success criteria:** One solution: “Lab practice” as main heading, “Practice dates” and “Equipment status” as subsections, “View practice dates” as descriptive action, and “Ready” / “Not ready” written as labels. All meaning remains when dots are removed.

## LAB-06 · Compress a repeated-symbol row

**Audience:** Grade 10

**Objective:** Encode and decode runs using a fixed count-symbol representation.

**Worked example:** On paper use pairs such as (3,A) to represent three consecutive A symbols. Encode AAABBCCA as (3,A),(2,B),(2,C),(1,A). Do not combine separated A runs.

**Practice:** Encode MMNMMMMN, then decode (2,Q),(1,R),(3,Q). Record the pair count and prove the first encoding expands to the original string.

**Answer / success criteria:** First encoding (2,M),(1,N),(4,M),(1,N), four pairs. Decoding the second yields QQRQQQ. Expanding the first in the same order recovers MMNMMMMN.

## LAB-07 · Join two stock tables on an item ID

**Audience:** Grade 11

**Objective:** Use a shared identifier to combine two mock data tables and preserve a missing match.

**Worked example:** Draw Items (A3, notebooks), (B7, folders) and Counts (A3, 12). Join on ID. Keep both item rows, writing unknown for missing counts; do not convert unknown into zero.

**Practice:** Add item C2, markers and Counts (C2, 0), plus a stray Counts (X1, 4). Deliver the item-led result, flag the stray row and explain the difference between B7 and C2.

**Answer / success criteria:** Result A3 notebooks 12; B7 folders unknown; C2 markers 0. X1 is unmatched and should be checked, not added as an item. B7 was not recorded; C2 was recorded as zero.

## LAB-08 · Estimate the average from interval readings

**Audience:** Grade 11

**Objective:** Use a local sheet or paper to compare an ordinary mean with a time-weighted mean.

**Worked example:** Two simulated intervals have average readings 10 for 1 minute and 16 for 2 minutes. Ordinary mean is 13; weighted mean is (10×1+16×2)/3 = 14.

**Practice:** Use readings 12, 18, 14 over intervals 2, 3, 5 minutes respectively. Deliver both means and explain which best represents the full 10 minutes.

**Answer / success criteria:** Ordinary mean is 44/3 ≈ 14.67. Time-weighted mean is (24+54+70)/10 = 14.8 and reflects unequal durations. This treats each reading as its interval average.

## LAB-09 · Compare linear and halving search by hand

**Audience:** Grade 12

**Objective:** Count probes of specified algorithms and recognise the prerequisite for halving search.

**Worked example:** Use ordered cards [2, 5, 9, 14, 18]. Linear search for 14 probes 2, 5, 9, 14. Halving search using the lower middle of each remaining range probes 9, then 14.

**Practice:** On cards [3, 8, 12, 17, 21, 26, 34, 39], trace both searches for 26 and run halving search again for absent 13. Stop on a match or empty range.

**Answer / success criteria:** For 26, linear probes 3, 8, 12, 17, 21, 26 (6); halving probes 17, 26 (2). For 13, halving probes 17, 8, 12 then stops absent. Halving search needs ordered data and the same ordering rule used for comparisons.

## LAB-10 · Process a queue of room reservations

**Audience:** Grade 12

**Objective:** Trace a first-in-first-out queue while distinguishing the queue from the completion log.

**Worked example:** On paper start empty. Add A1, add B1, process a request: remove A1 from the front and log it complete. The queue still contains B1.

**Practice:** From empty, add M1, add M2, process, add M3, process, process, process. Deliver the queue after every step and specify an empty-queue message.

**Answer / success criteria:** Queues: [M1], [M1,M2], [M2], [M2,M3], [M3], [], []. Log M1, M2, M3 in order. Final process attempt reports “No request waiting” and changes nothing.

## LAB-11 · Validate a small parts request log

**Audience:** Vocational Level 2 Technology

**Objective:** Treat missing, zero and malformed quantities as distinct cases.

**Worked example:** In a local sheet create fields Part code, Quantity, Status. Accept only known part codes R2 and R8 and whole quantities 1–9. Enter R2, 3 as Accepted; enter R8 with a blank quantity as Missing quantity.

**Practice:** Classify R2/0, R8/4, R9/2 and R2/2.5. Deliver four status labels and one simple reviewer instruction.

**Answer / success criteria:** Invalid quantity, Accepted, Unknown part, Invalid quantity. Ask the requester to provide a valid code or quantity; do not silently change a value to make it pass.

## LAB-12 · Organise and restore a project draft

**Audience:** Vocational Level 3 Technology

**Objective:** Use a clear naming rule and rehearse restoration without touching real files.

**Worked example:** Create text cards, paper or local scratch: inventory-v01.txt has “A: 4”; inventory-v02.txt has “A: 5”. Copy v02 to a pretend backup before deliberately changing the scratch working copy.

**Practice:** Add “B: 8” as v03, preserve v02 separately, simulate an incorrect v03 edit to “B: 80,” and restore the correct v03 to a new working filename. Deliver a version log.

**Answer / success criteria:** Expected restored contents “A: 5” and “B: 8”. Keep the damaged scratch copy separate and log v01, v02, v03 and the restoration source; a missing v03 backup should be reported rather than invented.

## LAB-13 · Split workshop bookings into records

**Audience:** Vocational Level 4 Technology

**Objective:** Normalise a table with repeated names using stable keys; spot inconsistent descriptive data.

**Worked example:** Mock rows (W1, Drawing, S1) and (W1, Drawing, S2) repeat the workshop name. Put W1/Drawing once in Workshop and create distinct Booking rows W1/S1 and W1/S2.

**Practice:** Add (W2, Models, S1) and (W1, Drawings, S3). Deliver the two proposed tables, marking the name conflict for tutor review.

**Answer / success criteria:** Workshop W1 has conflicting source labels Drawing/Drawings; W2 Models. Booking pairs W1/S1, W1/S2, W2/S1, W1/S3. Keep one booking per pair, and resolve the conflicting W1 label before publishing a report.

## LAB-14 · Test an accessible paper interface

**Audience:** Vocational Level 4 Technology

**Objective:** Audit labels, focus order and error recovery for a fictional offline trolley booking form.

**Worked example:** Draw a panel with labelled Date, labelled Trolley size and Save button. Mark a logical keyboard order Date → Trolley size → Save. If a date is missing, report the field and how to correct it.

**Practice:** On paper review a version with an “OK” button, keyboard order Size → OK → Date, and only red shading when the date is missing. Deliver an improved mock-up and two keyboard-only test cases.

**Answer / success criteria:** Use Date → Trolley size → Save booking. Test completing fields with Tab and activating Save; test missing date and confirm a textual prompt such as “Enter a date” identifies the field and returning to it is possible. Paper testing is not a formal accessibility audit.

## LAB-15 · Model a service delay with two scenarios

**Audience:** Vocational Level 5 Technology

**Objective:** Compare a one-worker queue under two processing times with stated assumptions.

**Worked example:** On paper assume tasks arrive at minutes 0 and 2 and each takes 3 minutes, first-come-first-served. Start times 0 and 3; waits 0 and 1.

**Practice:** Use arrivals 0, 1, 4, 6. Calculate start, finish and wait for each with service times of 3 minutes then 2 minutes. Compare means and state one limitation.

**Answer / success criteria:** At 3 min: starts 0,3,6,9; finishes 3,6,9,12; waits 0,2,2,3 (mean 1.75). At 2 min: starts 0,2,4,6; finishes 2,4,6,8; waits 0,1,0,0 (mean 0.25). Fixed durations omit variability and breaks.

## LAB-16 · Review two dashboard metrics for missing data

**Audience:** Vocational Level 6 Technology

**Objective:** Calculate denominator-sensitive metrics and design a transparent reporting rule.

**Worked example:** For hypothetical training exercises with observed scores 70 and 90 and one pending result, report observed mean 80, alongside data coverage 2/3; report no result yet for pending.

**Practice:** Compare mock cohort A scores 60, 80, 100, pending and B scores 82, 86, pending, pending. Deliver observed means, coverage, a fair caution, and one policy for a report requiring at least 75% coverage.

**Answer / success criteria:** A mean 80, coverage 3/4 = 75%; B mean 84, coverage 2/4 = 50%. Do not conclude B performed better; pending results can change the ranking. Under the policy A may show 80 paired with coverage; B shows insufficient coverage and pending counts, not a ranking.
