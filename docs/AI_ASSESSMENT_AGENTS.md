# AI Assessment Agents and Human-Controlled Marking

## Principle
AI is decision support, never the final assessor. A human assessor signs every summative decision. IQA remains independent. Only a QA-gated result can be released.

## Agents
### 1. Submission Intake Agent
Validates file/version, timestamps the attempt, captures deadline, hashes the evidence, checks attempt allowance and preserves prior versions.

### 2. Integrity Agent
Runs similarity/integrity checks and identifies evidence requiring human investigation. It must not declare misconduct from an AI-detection score.

### 3. Criteria Mapping Agent
Loads the controlled specification version, unit, learning outcomes, assessment criteria, approved brief and rubric. It maps the learner evidence to each criterion with exact evidence locations.

### 4. AI Assessment Agent
Produces structured advisory output per criterion:
- criterion code
- met/not-met recommendation
- evidence location
- rationale
- confidence
- missing evidence
- suggested feedback
- suggested grade/outcome

### 5. Fairness / Consistency Agent
Compares AI suggestion with assessor decision, prior standardisation patterns and grade-boundary rules. Large variance, low confidence or unusual patterns create a QA flag, never an automatic grade change.

### 6. Resubmission Agent
When the human assessor requires resubmission, creates one controlled second attempt by default. If the student submitted/resubmitted within the permitted deadline, no late penalty is applied where policy permits. If after deadline, the qualification-specific configured late/cap rule is calculated. The AI cannot invent the rule.

### 7. IQA Sampling Agent
Creates risk-based samples across assessors, units, outcomes, cohorts, boundary grades, AI/human disagreement and integrity flags. It cannot assign an assessor to IQA their own decision.

### 8. Release Gate Agent
Checks: human declaration, required IQA approval/actions closed, policy calculation, appeal/hold state and audit completeness. It may transition an eligible result to released but cannot create or alter the academic grade.

### 9. Audit / Evidence Agent
Builds a reproducible evidence pack containing submission versions, content hashes, specification/rubric versions, AI model/prompt version, criterion analysis, human changes, IQA decisions and released result.

## Resubmission policy
Default UniPathway operating intent, subject to the controlled qualification policy:
1. First attempt is assessed but remains provisional.
2. Human assessor may mark it assessed or require one resubmission.
3. A resubmission within the permitted deadline receives no late penalty where the active policy permits.
4. A resubmission after deadline is marked late and the active policy applies its configured penalty/cap/manual decision.
5. The latest valid assessed attempt becomes the candidate final result.
6. Students/parents see "Resubmission Required — Not Final" until final release.
7. No unlimited attempts. Additional attempts require authorised academic exception.
8. Feedback guides improvement but must not write the missing answer for the learner.

## Human assessor screen
Show original evidence and any resubmission side-by-side, controlled LO/AC/rubric, AI recommendation, evidence citations, confidence and integrity flags. For every criterion the assessor chooses Agree / Modify / Reject, records the human decision and signs the declaration.

## Quality dashboard
Track:
- assessor workload and turnaround
- AI/human agreement and grade variance
- IQA sampling and rejection/action rates
- grade boundaries and resubmissions
- appeals
- criterion-level disagreement
- standardisation actions
- model/prompt/rubric versions

These metrics support quality monitoring; they must not autonomously punish staff or students.

## Release invariant
No client page may directly set a learner-visible final result. Database/server authorization must enforce the state transition and RLS must restrict every actor to their assigned scope.
