import {test, expect, type Locator, type Page, type TestInfo} from '@playwright/test';
import {academicRecords, tenant, user, type Row} from './support/syntheticAcademicRecords';
import {dismissConsent, inspectLayouts} from './support/layoutEvidence';

test.use({actionTimeout: 15_000, navigationTimeout: 30_000});
test.describe.configure({retries: 0});
const runtimeErrors = new WeakMap<Page, string[]>();
test.beforeEach(({page}) => {
  const errors: string[] = [];
  runtimeErrors.set(page, errors);
  page.on('pageerror', error => errors.push(error.message));
});
test.afterEach(({page}) => {
  expect(runtimeErrors.get(page) || [], 'Assessment journeys must not raise unhandled browser errors').toEqual([]);
});

const uuid = (number: number) => `00000000-0000-4000-8000-${String(number).padStart(12, '0')}`;
const lecturer = uuid(2), learner = uuid(3), assessor = uuid(4), reviewer = uuid(5);
const moduleId = uuid(100), firstBrief = uuid(200), secondBrief = uuid(201), firstAttempt = uuid(300);
const teaching = 'We demonstrated how to plan a function, test boundary inputs and explain the resulting evidence.';
const outcomes = 'Design and justify a reliable solution using written reasoning and repeatable tests.';
const expectations = 'Explain your own approach, compare alternatives and connect every conclusion to a specific test result.';
const evidence = 'Submit the source code, a table of test inputs and outputs, and an explanation with citations.';
const policy = 'Synthetic approved assessment policy 2026 / section 4';

function brief(id: string, title: string, extra: Row = {}): Row {
  return {id, tenant_id: tenant, lecturer_id: lecturer, module_id: moduleId, title,
    status: 'draft', assessment_type: 'coursework', teaching_summary: teaching,
    learning_outcomes: outcomes, student_expectations: expectations, required_evidence: evidence,
    due_at: '2026-11-20T05:00:00Z', submission_cutoff: '2026-11-25T05:00:00Z',
    max_attempts: 2, penalty_points_per_resubmission: 5, policy_reference: policy,
    rubric_version: 'v1', published_at: null, published_by: null, created_at: '2026-11-01T09:00:00Z', ...extra};
}

function rubric(id: string, index = 0): Row[] {
  return ['LO1.P1', 'LO2.P1'].map((code, criterion) => ({
    id: uuid(500000 + index * 2 + criterion), tenant_id: tenant, brief_id: id, criterion_code: code,
    learning_outcome: criterion ? 'Explain how test evidence supports the solution.' : 'Plan a solution with clear assumptions.',
    criterion_description: criterion ? 'Compare observed results with the expected outcomes and explain discrepancies.' : 'Show the design, inputs, outputs and the reasoning behind the chosen approach.',
    scoring_guidance: 'Award full points for a correct explanation supported by the submitted evidence; explain partial or zero credit.',
    max_points: 50, display_order: criterion + 1,
  }));
}

function moduleRow(owner = lecturer): Row {
  return {id: moduleId, tenant_id: tenant, lecturer_id: owner, title: 'Programming and problem solving', code: 'PRG01', status: 'active'};
}

async function restoreText(page: Page) {
  await page.evaluate(() => {document.documentElement.style.fontSize = ''; document.documentElement.classList.remove('dark');});
  await page.setViewportSize({width: 390, height: 1000});
}

async function start(page: Page, path: string) {
  await page.clock.setFixedTime(new Date('2026-11-08T09:00:00Z'));
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.setViewportSize({width: 390, height: 1000});
  await page.goto(path);
  await dismissConsent(page);
}

/** Preserve the real dialog and scroll its final action into view at every required width. */
async function inspectReview(page: Page, dialog: Locator, actionName: string, info: TestInfo, name: string) {
  for (const summary of await dialog.locator('details:not([open]) > summary').all()) await summary.click();
  for (const enlarged of [false, true]) {
    await page.evaluate(enlarged => {
      document.documentElement.classList.toggle('dark', enlarged);
      document.documentElement.style.fontSize = enlarged ? '32px' : '';
    }, enlarged);
    for (const width of [360, 390, 768, 1440]) {
      await page.setViewportSize({width, height: 1000});
      await dialog.evaluate(async element => {
        element.scrollTop = 0;
        await document.fonts.ready;
        await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      });
      const bounds = await dialog.evaluate(element => {
        const box = element.getBoundingClientRect();
        return {inside: box.left >= -1 && box.right <= innerWidth + 1 && box.top >= -1 && box.bottom <= innerHeight + 1,
          contains: element.scrollWidth <= element.clientWidth + 1,
          overflowing: Array.from(element.querySelectorAll('*')).filter(child => child.getBoundingClientRect().right > box.right + 1)
            .slice(0, 10).map(child => ({tag: child.tagName, text: child.textContent?.slice(0, 80)}))};
      });
      await page.screenshot({path: info.outputPath(`${name}-${enlarged ? 'dark-200-percent-text-' : ''}${width}.png`), animations: 'disabled'});
      expect(bounds.inside, 'The review dialog must fit within the viewport').toBe(true);
      expect(bounds.contains, JSON.stringify(bounds)).toBe(true);
      const close = dialog.getByRole('button', {name: 'Close', exact: true});
      if (await close.count()) {
        const box = await close.boundingBox();
        expect(box?.width).toBeGreaterThanOrEqual(44);
        expect(box?.height).toBeGreaterThanOrEqual(44);
      }
      const action = dialog.getByRole('button', {name: actionName, exact: true});
      await action.scrollIntoViewIfNeeded();
      await expect(action).toBeInViewport();
      if (width === 360) await page.screenshot({path: info.outputPath(`${name}-actions-${enlarged ? 'dark-200-percent-text-' : ''}${width}.png`), animations: 'disabled'});
    }
  }
  await restoreText(page);
}

test('a lecturer recovers the original brief and keeps criterion wording attached to its assessment', async ({context, page}, info) => {
  test.setTimeout(180_000);
  const titleA = 'Explain a reliable Python function', titleB = 'Compare two algorithm designs';
  const tables: Record<string, Row[]> = {
    modules: [moduleRow(user.id)],
    unipathway_assessment_briefs: [brief(firstBrief, titleA, {lecturer_id: user.id}), brief(secondBrief, titleB, {lecturer_id: user.id})],
    unipathway_assessment_criteria: [],
  };
  const fixture = await academicRecords(context, 'lecturer', tables);
  for (const name of ['unipathway_assessment_briefs', 'unipathway_assessment_criteria']) {
    fixture.overrides.set(name, request => {
      if (request.method !== 'POST') return;
      tables[name].push({...request.body!});
      return {body: null}; // Persisted synthetic record, lost response: recover by its original UUID.
    });
  }
  await start(page, `/lecturer/assessments?module=${moduleId}`);
  await page.getByLabel('Assigned teaching module', {exact: true}).selectOption(moduleId);
  await page.getByLabel('Assessment title', {exact: true}).fill('Test and explain boundary cases');
  await page.getByLabel('Lessons taught and progress', {exact: true}).fill(teaching);
  await page.getByLabel('Learning outcomes', {exact: true}).fill(outcomes);
  await page.getByLabel('Student expectations', {exact: true}).fill(expectations);
  await page.getByLabel('Required evidence and deliverables', {exact: true}).fill(evidence);
  await page.getByLabel('First submission due (Pakistan time)', {exact: true}).fill('2026-11-20T10:00');
  await page.getByLabel('Final submission cutoff (Pakistan time)', {exact: true}).fill('2026-11-25T10:00');
  await page.getByLabel('Allowed attempts', {exact: true}).selectOption('2');
  await page.getByLabel('Approved penalty points per resubmission', {exact: true}).fill('5');
  await page.getByLabel('Awarding-body or centre-approved assessment policy reference', {exact: true}).fill(policy);
  await page.getByRole('button', {name: 'Review assessment brief', exact: true}).click();
  const briefReview = page.getByRole('dialog', {name: 'Review unpublished assessment brief', exact: true});
  await expect(briefReview).toContainText(teaching);
  await expect(briefReview).toContainText('Test and explain boundary cases');
  await inspectReview(page, briefReview, 'Save reviewed assessment brief', info, 'lecturer-brief-review');
  await briefReview.getByRole('button', {name: 'Save reviewed assessment brief', exact: true}).click();
  await expect(briefReview.getByRole('button', {name: 'Check saved record', exact: true})).toBeEnabled();
  const briefWrites = () => fixture.requests.filter(request => request.name === 'unipathway_assessment_briefs' && request.method === 'POST');
  expect(briefWrites()).toHaveLength(1);
  const saved = briefWrites()[0].body!;
  expect(saved).toMatchObject({tenant_id: tenant, lecturer_id: user.id, module_id: moduleId,
    due_at: '2026-11-20T05:00:00.000Z', submission_cutoff: '2026-11-25T05:00:00.000Z', status: 'draft'});
  await briefReview.getByRole('button', {name: 'Close and keep save check', exact: true}).click();
  await page.getByRole('button', {name: 'Continue save check', exact: true}).click();
  await expect(briefReview).toContainText(String(saved.id));
  await briefReview.getByRole('button', {name: 'Check saved record', exact: true}).click();
  await expect(briefReview).toBeHidden();
  expect(briefWrites()).toHaveLength(1);
  await expect(page.getByRole('button', {name: 'Open assessment Test and explain boundary cases', exact: true})).toBeVisible();

  await page.getByRole('button', {name: `Open assessment ${titleA}`, exact: true}).click();
  await page.getByLabel('Criterion code', {exact: true}).fill('LO1.P1');
  await page.getByLabel('Criterion learning outcome', {exact: true}).fill('Explain a reliable solution using evidence.');
  await page.getByLabel('Criterion evidence standard', {exact: true}).fill('Include the source code and explain a boundary test for every input.');
  await page.getByLabel('Criterion marking guidance', {exact: true}).fill('Award points for a correct explanation supported by repeatable test results.');
  await page.getByLabel('Maximum points', {exact: true}).fill('50');
  await page.getByRole('button', {name: `Open assessment ${titleB}`, exact: true}).click();
  await expect(page.getByLabel('Criterion code', {exact: true})).toHaveValue('');
  await page.getByLabel('Criterion code', {exact: true}).fill('LO2.P1');
  await page.getByRole('button', {name: `Open assessment ${titleA}`, exact: true}).click();
  await expect(page.getByLabel('Criterion code', {exact: true})).toHaveValue('LO1.P1');
  await expect(page.getByLabel('Criterion evidence standard', {exact: true})).toHaveValue('Include the source code and explain a boundary test for every input.');
  await inspectLayouts(page, info, 'lecturer-assessment-drafts');
  await restoreText(page);
  await page.getByRole('button', {name: 'Review criterion', exact: true}).click();
  const criterionReview = page.getByRole('dialog', {name: 'Review assessment criterion', exact: true});
  await expect(criterionReview).toContainText(titleA);
  await expect(criterionReview).toContainText(firstBrief);
  await inspectReview(page, criterionReview, 'Save reviewed criterion', info, 'lecturer-criterion-review');
  await criterionReview.getByRole('button', {name: 'Save reviewed criterion', exact: true}).click();
  await expect(criterionReview.getByRole('button', {name: 'Check saved record', exact: true})).toBeEnabled();
  await criterionReview.getByRole('button', {name: 'Check saved record', exact: true}).click();
  await expect(criterionReview).toBeHidden();
  const criterionWrites = fixture.requests.filter(request => request.name === 'unipathway_assessment_criteria' && request.method === 'POST');
  expect(criterionWrites).toHaveLength(1);
  expect(criterionWrites[0].body).toMatchObject({tenant_id: tenant, brief_id: firstBrief, criterion_code: 'LO1.P1', max_points: 50});
  expect(fixture.requests.some(request => request.name === 'unipathway_assessment_criteria' && request.method === 'GET'
    && request.params.get('id') === `eq.${criterionWrites[0].body!.id}` && request.params.get('brief_id') === `eq.${firstBrief}`
    && request.params.get('tenant_id') === `eq.${tenant}`)).toBe(true);
  await page.getByRole('button', {name: `Open assessment ${titleB}`, exact: true}).click();
  await expect(page.getByLabel('Criterion code', {exact: true})).toHaveValue('LO2.P1');
  expect(fixture.requests.some(request => ['publish_unipathway_assessment_brief', 'record_unipathway_human_mark'].includes(request.name))).toBe(false);
});

test('management reviews the complete older brief and allocates the oldest eligible submission independently', async ({context, page}, info) => {
  test.setTimeout(180_000);
  const drafts = Array.from({length: 260}, (_, index) => brief(uuid(10000 + index), `Synthetic assessment ${index + 1}`));
  const target = drafts.at(-1)!;
  target.title = 'Boundary testing and evidence review';
  const published = brief(uuid(20000), 'Published coursework awaiting allocation', {status: 'published', published_by: user.id});
  const submitted = Array.from({length: 305}, (_, index) => ({id: uuid(30000 + index), tenant_id: tenant,
    brief_id: published.id, student_id: learner, attempt_no: 1, status: 'submitted',
    evidence_text: 'Synthetic coursework explaining the design, assumptions and results.',
    submitted_at: index === 304 ? '2026-10-01T09:00:00Z' : '2026-11-08T08:00:00Z', resubmission_guidance: null}));
  const waiting = submitted.at(-1)!;
  const tables: Record<string, Row[]> = {
    modules: [moduleRow()],
    unipathway_assessment_briefs: [...drafts, published],
    unipathway_assessment_criteria: [...drafts, published].flatMap((row, index) => rubric(String(row.id), index)),
    unipathway_assessment_attempts: [...submitted, ...Array.from({length: 305}, (_, index) => ({...submitted[0],
      id: uuid(40000 + index), status: 'human_marked', submitted_at: '2026-11-08T09:00:00Z'}))],
    unipathway_assessment_allocations: submitted.slice(0, -1).map(row => ({tenant_id: tenant, attempt_id: row.id, marker_id: assessor, qa_reviewer_id: reviewer})),
  };
  const fixture = await academicRecords(context, 'centre_director', tables);
  fixture.overrides.set('user_roles', request => {
    if (!request.params.get('select')?.includes('user_id')) return;
    return {body: [assessor, lecturer, learner].map(user_id => ({user_id, role: 'assessor', tenant_id: tenant}))
      .concat([assessor, reviewer, lecturer, learner].map(user_id => ({user_id, role: 'iqa_officer', tenant_id: tenant})))};
  });
  fixture.rpc.set('publish_unipathway_assessment_brief', request => {
    expect(request.body).toEqual({p_brief: target.id});
    target.status = 'published'; target.published_by = user.id;
    return {body: null}; // This RPC intentionally returns void.
  });
  fixture.rpc.set('allocate_unipathway_independent_marker', request => {
    expect(request.body).toEqual({p_attempt: waiting.id, p_marker: assessor, p_quality_reviewer: reviewer});
    tables.unipathway_assessment_allocations.push({tenant_id: tenant, attempt_id: waiting.id, marker_id: assessor, qa_reviewer_id: reviewer});
    return {body: null}; // This separate RPC also intentionally returns void.
  });
  await start(page, '/director/assessment-management');
  await page.getByLabel('Find a brief', {exact: true}).fill(String(target.title));
  const review = page.getByRole('button', {name: `Review brief: ${target.title} (${target.id})`, exact: true});
  await expect(review).toBeVisible();
  await inspectLayouts(page, info, 'assessment-management-queue');
  await restoreText(page);
  await review.click();
  const dialog = page.getByRole('dialog', {name: `Review assessment: ${target.title}`, exact: true});
  for (const content of [teaching, outcomes, expectations, evidence, policy, String(target.id), 'LO1.P1', 'LO2.P1']) {
    await expect(dialog).toContainText(content);
  }
  await expect(dialog).toContainText('Pakistan');
  await inspectReview(page, dialog, 'Publish reviewed assessment', info, 'complete-publication-review');
  await dialog.getByRole('button', {name: 'Publish reviewed assessment', exact: true}).click();
  await expect(dialog.getByRole('status')).toContainText('Assessment published');
  await dialog.getByRole('button', {name: 'Close review', exact: true}).click();
  await expect(dialog).toBeHidden();
  expect(fixture.requests.filter(request => request.name === 'publish_unipathway_assessment_brief')).toHaveLength(1);
  expect(target.status).toBe('published');

  const allocation = page.getByRole('article').filter({hasText: String(waiting.id)});
  await expect(allocation).toContainText(String(published.title));
  const markerSelect = allocation.getByLabel(/Independent assessor/);
  const reviewerSelect = allocation.getByLabel(/IQA reviewer/);
  await expect(markerSelect.locator(`option[value="${lecturer}"]`)).toHaveCount(0);
  await expect(markerSelect.locator(`option[value="${learner}"]`)).toHaveCount(0);
  await markerSelect.selectOption(assessor);
  await expect(reviewerSelect.locator(`option[value="${assessor}"]`)).toHaveCount(0);
  await expect(reviewerSelect.locator(`option[value="${lecturer}"]`)).toHaveCount(0);
  await expect(reviewerSelect.locator(`option[value="${learner}"]`)).toHaveCount(0);
  await reviewerSelect.selectOption(reviewer);
  await allocation.getByRole('button', {name: `Review allocation: ${published.title}, attempt 1 (${waiting.id})`, exact: true}).click();
  const allocationReview = page.getByRole('dialog');
  for (const content of [String(published.title), String(waiting.id), assessor, reviewer]) await expect(allocationReview).toContainText(content);
  await inspectReview(page, allocationReview, 'Confirm reviewed allocation', info, 'independent-allocation-review');
  await allocationReview.getByRole('button', {name: 'Confirm reviewed allocation', exact: true}).click();
  await expect(allocationReview.getByRole('status')).toContainText('Independent assessor and IQA allocated');
  await allocationReview.getByRole('button', {name: 'Close review', exact: true}).click();
  await expect(allocationReview).toBeHidden();
  await expect(allocation).toHaveCount(0);
  expect(fixture.requests.filter(request => request.name === 'allocate_unipathway_independent_marker')).toHaveLength(1);
  expect(fixture.requests.some(request => request.name === 'unipathway_assessment_briefs'
    && request.params.get('status') === 'eq.draft' && request.params.get('offset') === '250')).toBe(true);
  expect(fixture.requests.some(request => request.name === 'unipathway_assessment_attempts'
    && request.params.get('status') === 'eq.submitted' && request.params.get('offset') === '250')).toBe(true);
  expect(fixture.requests.filter(request => ['unipathway_assessment_briefs', 'unipathway_assessment_attempts',
    'unipathway_assessment_criteria', 'unipathway_assessment_allocations'].includes(request.name))
    .every(request => request.params.get('tenant_id') === `eq.${tenant}`)).toBe(true);
});

test('a directory failure and an empty visible directory keep their distinct meanings without hiding brief review', async ({context, page}, info) => {
  const title = 'An assessment available for curriculum review';
  const fixture = await academicRecords(context, 'centre_director', {
    unipathway_assessment_briefs: [brief(firstBrief, title)],
    unipathway_assessment_criteria: rubric(firstBrief),
  });
  let failDirectory = true;
  fixture.overrides.set('user_roles', request => {
    if (!request.params.get('select')?.includes('user_id')) return;
    return failDirectory ? {status: 503, body: {message: 'Synthetic directory interruption'}} : {body: []};
  });
  await start(page, '/director/assessment-management');
  await page.setViewportSize({width: 360, height: 1000});
  await expect(page.getByRole('alert')).toContainText('The assessor and IQA directory could not be verified');
  await expect(page.getByText(/No eligible assessor and IQA choices are visible/)).toHaveCount(0);
  const review = page.getByRole('button', {name: `Review brief: ${title} (${firstBrief})`, exact: true});
  await expect(review).toBeEnabled();
  await page.screenshot({path: info.outputPath('assessment-directory-failed-360.png'), fullPage: true, animations: 'disabled'});
  failDirectory = false;
  await page.getByRole('button', {name: 'Retry staff lookup', exact: true}).click();
  await expect(page.getByText(/No eligible assessor and IQA choices are visible to your account/)).toBeVisible();
  await expect(page.getByText(/Your role may have limited staff-directory access/)).toBeVisible();
  await expect(page.getByText(/The assessor and IQA directory could not be verified/)).toHaveCount(0);
  await page.screenshot({path: info.outputPath('assessment-directory-visible-empty-360.png'), fullPage: true, animations: 'disabled'});
  await review.click();
  const dialog = page.getByRole('dialog', {name: `Review assessment: ${title}`, exact: true});
  await expect(dialog).toContainText(teaching);
  await expect(dialog.getByRole('button', {name: 'Publish reviewed assessment', exact: true})).toBeEnabled();
  await dialog.getByRole('button', {name: 'Close review', exact: true}).click();
  expect(fixture.requests.filter(request => !['GET', 'HEAD'].includes(request.method)
    && !['ensure_my_account', 'consent_records'].includes(request.name))).toEqual([]);
});

test('an unconfirmed human mark preserves private work and a verified zero goes only to IQA', async ({context, page}, info) => {
  test.setTimeout(180_000);
  const title = 'Independent review of boundary-test evidence';
  const attempt: Row = {id: firstAttempt, tenant_id: tenant, brief_id: firstBrief, student_id: learner,
    attempt_no: 1, status: 'submitted', submitted_at: '2026-11-08T08:00:00Z',
    evidence_text: 'The code prints a result for one ordinary input. No boundary input or expected-output comparison is included.',
    resubmission_guidance: null};
  const tables: Record<string, Row[]> = {
    unipathway_assessment_allocations: [{tenant_id: tenant, attempt_id: firstAttempt, marker_id: user.id, qa_reviewer_id: reviewer}],
    unipathway_assessment_attempts: [attempt],
    unipathway_assessment_briefs: [brief(firstBrief, title, {status: 'published'})],
    unipathway_assessment_criteria: rubric(firstBrief),
    uni_marking_drafts: [],
  };
  const fixture = await academicRecords(context, 'assessor', tables);
  fixture.rpc.set('save_uni_marking_draft', request => {
    const input = request.body!;
    const saved = {tenant_id: tenant, attempt_id: input.p_attempt, marker_id: user.id,
      criteria: input.p_criteria, feedback: input.p_feedback, guidance: input.p_guidance,
      revision: Number(input.p_revision) + 1, updated_at: '2026-11-08T09:00:00Z'};
    tables.uni_marking_drafts = [saved];
    return {body: saved};
  });
  let markingCalls = 0;
  fixture.rpc.set('record_unipathway_human_mark', request => {
    markingCalls++;
    expect(request.body?.p_attempt).toBe(firstAttempt);
    if (markingCalls === 1) return {body: null}; // Not a valid numeric receipt; no synthetic write persisted.
    attempt.status = 'human_marked';
    return {body: 0}; // A valid zero must not be mistaken for missing data.
  });
  await start(page, `/assessor/queue?attempt=${firstAttempt}`);
  const feedback = 'The submission contains an ordinary example, but does not demonstrate the required boundary tests or explain the observed results. Add those checks and link your reasoning to their evidence.';
  for (const index of [0, 1]) {
    await page.getByLabel('Awarded points (not a final student grade)', {exact: true}).nth(index).fill('0');
    await page.getByLabel('Evidence location or quoted excerpt', {exact: true}).nth(index).fill('Submitted text: one ordinary input is described without boundary cases.');
    await page.getByLabel('Reason for your mark', {exact: true}).nth(index).fill('The evidence does not demonstrate the required tests or provide a supported explanation.');
    await page.getByLabel('What is missing, or what evidence is fully met?', {exact: true}).nth(index).fill('Required boundary cases and the explanation of observed results are absent.');
  }
  await page.getByLabel('Individual written feedback', {exact: true}).fill(feedback);
  await page.getByRole('button', {name: 'Save private draft', exact: true}).click();
  await expect(page.getByText(/Draft revision 1 saved/)).toBeVisible();
  await inspectLayouts(page, info, 'independent-marking-editor');
  await restoreText(page);
  const send = page.getByRole('button', {name: 'Send independent human mark to IQA', exact: true});
  await send.click();
  const review = page.getByRole('dialog', {name: 'Review mark', exact: true});
  await expect(review).toContainText(title);
  await expect(review).toContainText(firstAttempt);
  await inspectReview(page, review, 'Submit mark for IQA', info, 'independent-mark-review');
  await review.getByRole('button', {name: 'Submit mark for IQA', exact: true}).click();
  await expect(page.getByText('Mark not confirmed', {exact: true})).toBeVisible();
  await expect(page.getByLabel('Individual written feedback', {exact: true})).toHaveValue(feedback);
  expect(new URL(page.url()).searchParams.get('attempt')).toBe(firstAttempt);
  expect(markingCalls).toBe(1);
  await expect(send).toBeDisabled();
  const readsBeforeCheck = fixture.requests.length;
  await page.getByRole('button', {name: 'Check marking status', exact: true}).click();
  await expect(send).toBeEnabled();
  expect(fixture.requests.slice(readsBeforeCheck).some(request => request.name === 'unipathway_assessment_attempts'
    && request.params.get('tenant_id') === `eq.${tenant}`
    && [request.params.get('id'), request.params.get('attempt_id')].some(value => value === `eq.${firstAttempt}` || value === `in.(${firstAttempt})`))).toBe(true);
  await send.click();
  await review.getByRole('button', {name: 'Submit mark for IQA', exact: true}).click();
  await expect(page.getByText('Mark submitted for IQA review', {exact: true})).toBeVisible();
  await expect(page.getByText('Recorded private score: 0/100', {exact: true})).toBeVisible();
  expect(markingCalls).toBe(2);
  expect(attempt.status).toBe('human_marked');
  expect(tables.uni_marking_drafts[0].feedback).toBe(feedback);
  const writes = fixture.requests.filter(request => request.name === 'record_unipathway_human_mark');
  expect(writes[1].body).toEqual(writes[0].body);
  expect(fixture.requests.some(request => ['decide_unipathway_quality_mark', 'release_unipathway_assessment_mark'].includes(request.name))).toBe(false);
  await inspectLayouts(page, info, 'mark-confirmed-for-iqa');
});
