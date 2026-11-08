import {test, expect} from '@playwright/test';
import {dismissConsent, inspectLayouts} from './support/layoutEvidence';
import {academicRecords, tenant, user, type Row} from './support/syntheticAcademicRecords';

const programme = '00000000-0000-4000-8000-000000000020';
const moduleId = '00000000-0000-4000-8000-000000000100';
const firstLesson = '00000000-0000-4000-8000-000000000101';
const secondLesson = '00000000-0000-4000-8000-000000000102';
const withdrawnLesson = '00000000-0000-4000-8000-000000000103';
const brief = '00000000-0000-4000-8000-000000000200';
const session = '00000000-0000-4000-8000-000000000300';
const attempt = '00000000-0000-4000-8000-000000000500';

function enrolledTables(): Record<string, Row[]> {
  return {
    student_enrolments: [{id: '00000000-0000-4000-8000-000000000021', tenant_id: tenant,
      student_id: user.id, programme_id: programme, status: 'active'}],
    programmes: [{id: programme, tenant_id: tenant, title: 'Diploma in Computing', awarding_body: 'OTHM', level: '5'}],
    modules: [{id: moduleId, tenant_id: tenant, programme_id: programme,
      lecturer_id: user.id, title: 'Programming and problem solving', code: 'PRG01', status: 'active'}],
  };
}

test('a withdrawn lesson link stays unavailable until the learner explicitly chooses a published lesson', async ({context, page}, info) => {
  test.setTimeout(90_000);
  const tables = enrolledTables();
  const lesson = {tenant_id: tenant, module_id: moduleId, revision: 1, status: 'published',
    video_url: null, resource_url: null, transcript: 'Read the code aloud and explain how each parameter changes the result.'};
  tables.unipathway_lessons = [
    {...lesson, id: firstLesson, position: 0, title: 'Plan a reliable Python function',
      body: 'Start with the problem. Write down the inputs, the expected result and the cases your function needs to handle.\n\nUse small examples to check the plan before you write the implementation.'},
    {...lesson, id: secondLesson, position: 1, title: 'Explain your solution with evidence',
      body: 'Show how your function behaves for an ordinary input, an empty input and a boundary case.\n\nRecord what each example demonstrates and explain any assumptions. Bring your reasoning to the coursework brief.'},
    {...lesson, id: withdrawnLesson, position: 2, status: 'draft', title: 'Withdrawn lesson', body: 'Unpublished material'},
  ];
  const fixture = await academicRecords(context, 'student', tables);
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.setViewportSize({width: 360, height: 1000});
  await page.goto(`/student/lessons?module=${moduleId}&lesson=${withdrawnLesson}`);
  await dismissConsent(page);
  await expect(page.getByRole('heading', {name: 'Lesson unavailable', exact: true})).toBeVisible();
  expect(new URL(page.url()).searchParams.get('lesson')).toBe(withdrawnLesson);
  await expect(page.getByRole('button', {name: 'Mark as completed', exact: true})).toHaveCount(0);
  await expect(page.getByRole('link', {name: 'Open module overview', exact: true})).toHaveAttribute('href', `/student/module?module=${moduleId}`);
  await page.getByRole('button', {name: 'Choose an available lesson', exact: true}).click();
  await expect(page.getByRole('heading', {name: 'Plan a reliable Python function', exact: true})).toBeVisible();
  await expect.poll(() => new URL(page.url()).searchParams.get('lesson')).toBe(firstLesson);
  await page.getByRole('button', {name: 'Next lesson', exact: true}).click();
  await expect(page.getByRole('heading', {name: 'Explain your solution with evidence', exact: true})).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', {name: 'Explain your solution with evidence', exact: true})).toBeVisible();
  expect(new URL(page.url()).searchParams.get('lesson')).toBe(secondLesson);
  await expect(page.getByRole('link', {name: 'Continue to assignments', exact: true})).toHaveAttribute('href', `/student/assignments?module=${moduleId}`);
  await inspectLayouts(page, info, 'selected-lesson');
  expect(fixture.requests.filter(read => read.name === 'unipathway_lessons').every(read =>
    read.params.get('tenant_id') === `eq.${tenant}` && read.params.get('module_id') === `eq.${moduleId}` && read.params.get('status') === 'eq.published')).toBe(true);
  expect(fixture.requests.some(read => !['GET', 'HEAD'].includes(read.method) && read.name !== 'ensure_my_account')).toBe(false);
});

test('the learning agenda opens the exact invited class and preserves its archive return path', async ({context, page}, info) => {
  test.setTimeout(90_000);
  await page.clock.setFixedTime(new Date('2026-11-08T09:00:00Z'));
  const tables = enrolledTables();
  const selectedClass = {id: session, tenant_id: tenant, module_id: moduleId, title: 'Python problem-solving workshop',
    starts_at: '2026-11-08T09:10:00Z', ends_at: '2026-11-08T10:00:00Z', status: 'scheduled',
    class_mode: 'hybrid', recording_enabled: false, capacity: 24, join_url: null};
  tables.live_class_sessions = [selectedClass, ...Array.from({length: 205}, (_, index) => ({...selectedClass,
    id: `other-session-${index}`, module_id: 'another-module', title: `Another module ${index}`,
    starts_at: '2026-11-09T09:00:00Z', ends_at: '2026-11-09T10:00:00Z'}))];
  const board = '00000000-0000-4000-8000-000000000400';
  tables.lesson_whiteboards = [{id: board, tenant_id: tenant, session_id: session,
    title: 'Workshop examples', created_at: '2026-11-08T08:00:00Z'}];
  const fixture = await academicRecords(context, 'student', tables);
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.setViewportSize({width: 360, height: 1000});
  await page.goto('/student');
  await dismissConsent(page);
  const agenda = page.getByRole('region', {name: 'Enrolled module class agenda', exact: true});
  const openClass = agenda.getByRole('link', {name: 'Check classroom invitation and access →', exact: true});
  const classPath = `/student/classroom?module=${moduleId}&session=${session}`;
  await expect(openClass).toHaveAttribute('href', classPath);
  const classroomReads = fixture.requests.length;
  await openClass.click();
  const selected = page.getByRole('region', {name: 'Selected class', exact: true});
  await expect(selected.getByRole('heading', {name: selectedClass.title, exact: true})).toBeVisible();
  await expect(selected).toContainText('Verified Teams link not configured');
  await expect(selected.getByRole('link', {name: 'Join Teams', exact: true})).toHaveCount(0);
  await expect(selected.getByRole('link', {name: 'Open live board & replay', exact: true})).toHaveAttribute('href', `/classroom/whiteboard/${board}`);
  await page.reload();
  await expect(selected.getByRole('heading', {name: selectedClass.title, exact: true})).toBeVisible();
  expect(new URL(page.url()).searchParams.get('session')).toBe(session);
  const reads = fixture.requests.slice(classroomReads).filter(read => read.name === 'live_class_sessions');
  expect(reads.length).toBeGreaterThan(0);
  expect(reads.every(read => read.params.get('tenant_id') === `eq.${tenant}` &&
    read.params.get('module_id') === `eq.${moduleId}` && read.params.get('id') === `eq.${session}`)).toBe(true);
  expect(fixture.requests.filter(read => read.name === 'lesson_whiteboards').every(read =>
    read.params.get('tenant_id') === `eq.${tenant}` && read.params.get('session_id') === `in.(${session})`)).toBe(true);

  fixture.failures.add('lesson_whiteboards');
  await page.getByRole('button', {name: 'Refresh classes', exact: true}).click();
  await expect(page.getByRole('alert')).toContainText('Whiteboards could not be checked');
  await expect(selected).toContainText('Board availability could not be checked');
  await expect(selected).not.toContainText('No live board is available');
  fixture.failures.clear();
  await page.getByRole('button', {name: 'Refresh classes', exact: true}).click();
  await expect(selected.getByRole('link', {name: 'Open live board & replay', exact: true})).toBeVisible();
  await inspectLayouts(page, info, 'selected-class');
  await page.evaluate(() => {document.documentElement.style.fontSize = ''; document.documentElement.classList.remove('dark');});
  await page.setViewportSize({width: 390, height: 1000});
  const archiveStart = fixture.requests.length;
  await page.getByRole('link', {name: 'Open my class archive', exact: true}).click();
  await expect(page.getByRole('heading', {name: 'Recordings are awaiting activation', exact: true})).toBeVisible();
  await expect(page.getByRole('link', {name: 'Return to classroom', exact: true})).toHaveAttribute('href', classPath);
  expect(new URL(page.url()).searchParams.get('session')).toBe(session);
  expect(fixture.requests.slice(archiveStart).some(read =>
    read.pathname.includes('/storage/v1/') ||
    ['live_class_sessions', 'live_class_artifacts', 'lesson_ai_packs', 'can_open_my_unipathway_class_media'].includes(read.name))).toBe(false);
  await page.getByRole('link', {name: 'Return to classroom', exact: true}).click();
  await expect(selected.getByRole('heading', {name: selectedClass.title, exact: true})).toBeVisible();

  const missing = '00000000-0000-4000-8000-000000000399';
  await page.goto(`/student/classroom?module=${moduleId}&session=${missing}`);
  await expect(page.getByRole('heading', {name: 'Requested class is unavailable', exact: true})).toBeVisible();
  await expect(selected).toHaveCount(0);
  expect(new URL(page.url()).searchParams.get('session')).toBe(missing);
  await page.getByRole('link', {name: 'View all classes', exact: true}).click();
  await expect(page.getByRole('heading', {name: selectedClass.title, exact: true})).toBeVisible();
  expect(new URL(page.url()).searchParams.get('module')).toBe(moduleId);
  expect(new URL(page.url()).searchParams.has('session')).toBe(false);
});

test('coursework keeps an uncertain submission and retries the exact reviewed evidence before showing a receipt', async ({context, page}, info) => {
  test.setTimeout(90_000);
  await page.clock.setFixedTime(new Date('2026-11-08T09:00:00Z'));
  const tables = enrolledTables();
  const title = 'Build and explain a reliable function';
  tables.unipathway_assessment_briefs = [{id: brief, tenant_id: tenant, module_id: moduleId, title,
    status: 'published', assessment_type: 'coursework', teaching_summary: 'Planning, functions and checks for boundary cases.',
    learning_outcomes: 'Explain how a function uses its inputs and demonstrate the result with evidence.',
    student_expectations: 'Write your own solution and explain the decisions you made.',
    required_evidence: 'Submit your implementation, three worked examples and a short reflection.',
    due_at: '2026-11-10T12:00:00Z', submission_cutoff: '2026-11-12T12:00:00Z', max_attempts: 3,
    penalty_points_per_resubmission: 0, policy_reference: 'published module assessment', rubric_version: '1'}];
  tables.unipathway_assessment_criteria = [{id: '00000000-0000-4000-8000-000000000201', brief_id: brief,
    criterion_code: 'LO1', learning_outcome: 'Explain a reliable solution', criterion_description: 'Use relevant examples to justify your implementation.',
    scoring_guidance: 'Check the reasoning against the supplied examples.', max_points: 100, display_order: 0}];
  tables.unipathway_assessment_attempts = [];
  const fixture = await academicRecords(context, 'student', tables);
  let submissions = 0;
  fixture.rpc.set('submit_unipathway_coursework', request => {
    if (++submissions === 1) return {body: null};
    tables.unipathway_assessment_attempts.push({id: attempt, brief_id: brief, student_id: user.id,
      tenant_id: tenant, attempt_no: 1, status: 'submitted', submitted_at: '2026-11-08T09:00:00Z',
      resubmission_guidance: null, guidance_at: null, evidence_text: request.body!.p_evidence,
      submission_request_id: request.body!.p_request});
    return {body: attempt};
  });
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.setViewportSize({width: 390, height: 1000});
  await page.goto(`/student/assignments?module=${moduleId}`);
  await dismissConsent(page);
  const evidence = 'My function checks each input before calculating a result. I tested an ordinary value, an empty input and a boundary case, and explained why each result is appropriate.';
  const laterDraft = `${evidence}\nLater note: I would also discuss the assumptions with my lecturer.`;
  const input = page.getByRole('textbox', {name: 'Your original submitted evidence', exact: true});
  await input.fill(evidence);
  await page.getByRole('button', {name: 'Submit coursework', exact: true}).click();
  const confirmation = page.getByRole('alertdialog', {name: `Submit ${title}?`, exact: true});
  await expect(confirmation).toBeVisible();
  await expect(confirmation.getByRole('button', {name: 'Keep editing', exact: true})).toBeFocused();
  await confirmation.getByRole('button', {name: 'Confirm submission', exact: true}).click();
  await expect(confirmation.getByRole('alert')).toContainText('Submission could not be confirmed');
  await expect(page.getByRole('heading', {name: 'Submission confirmed', exact: true})).toHaveCount(0);
  expect(submissions).toBe(1);
  await confirmation.getByRole('button', {name: 'Keep editing', exact: true}).click();
  await expect(input).toHaveValue(evidence);
  await input.fill(laterDraft);
  await expect(page.getByLabel('Choose assignment attachment', {exact: true})).toBeDisabled();
  await page.getByRole('button', {name: 'Check submission status', exact: true}).click();
  await expect(page.getByRole('alert')).toContainText('No receipt is visible yet');
  expect(submissions).toBe(1);
  const recoveryRead = fixture.requests.find(read => read.name === 'unipathway_assessment_attempts' && read.params.has('submission_request_id'));
  expect(recoveryRead?.params.get('student_id')).toBe(`eq.${user.id}`);
  expect(recoveryRead?.params.get('tenant_id')).toBe(`eq.${tenant}`);
  expect(recoveryRead?.params.get('brief_id')).toBe(`eq.${brief}`);
  await inspectLayouts(page, info, 'coursework-recovery');
  await page.setViewportSize({width: 360, height: 1000});
  await page.getByRole('button', {name: 'Retry reviewed submission', exact: true}).click();
  await expect(confirmation).toBeVisible();
  const dialogBounds = await confirmation.boundingBox();
  expect(dialogBounds?.x).toBeGreaterThanOrEqual(0);
  expect((dialogBounds?.x || 0) + (dialogBounds?.width || 0)).toBeLessThanOrEqual(360);
  expect(dialogBounds?.height).toBeLessThanOrEqual(1000);
  await confirmation.getByRole('button', {name: 'Retry same submission', exact: true}).scrollIntoViewIfNeeded();
  await page.screenshot({path: info.outputPath('coursework-confirmation-dark-200-percent-text-360.png')});
  await confirmation.getByRole('button', {name: 'Retry same submission', exact: true}).click();
  const receipt = page.getByRole('status', {name: 'Submission receipt', exact: true});
  await expect(receipt.getByRole('heading', {name: 'Submission confirmed', exact: true})).toBeVisible();
  await expect(receipt).toContainText(attempt);
  await expect(receipt).toContainText('independent marking and approval');
  await receipt.getByText('Unsent later edits', {exact: true}).click();
  await expect(receipt.getByRole('textbox', {name: 'Unsent later edits', exact: true})).toHaveValue(laterDraft);
  const calls = fixture.requests.filter(read => read.name === 'submit_unipathway_coursework');
  expect(calls).toHaveLength(2);
  expect(calls[1].body).toEqual(calls[0].body);
  expect(calls[0].body?.p_evidence).toBe(evidence);
  expect(calls[0].body?.p_uploads).toEqual([]);
  await page.evaluate(() => {document.documentElement.style.fontSize = ''; document.documentElement.classList.remove('dark');});
  await page.getByRole('button', {name: 'Read submitted response', exact: true}).click();
  await expect(page.getByRole('region', {name: 'Original submitted response', exact: true})).toContainText(evidence);
  await expect(page.getByRole('region', {name: 'Original submitted response', exact: true})).not.toContainText('Later note');
});

test('class scheduling waits for verified candidates, preserves unconfirmed saves and checks cancellation', async ({context, page}, info) => {
  test.setTimeout(90_000);
  await page.clock.setFixedTime(new Date('2026-11-08T09:00:00Z'));
  const tables = enrolledTables();
  tables.live_class_sessions = [];
  tables.uni_calendar_jobs = [];
  tables.live_class_invitations = [];
  const fixture = await academicRecords(context, 'lecturer', tables);
  let releaseLookup: () => void = () => {};
  const lookup = new Promise<void>(resolve => {releaseLookup = resolve;});
  let lookupUnavailable = true, saves = 0, cancellations = 0;
  const learner = '00000000-0000-4000-8000-000000000002';
  fixture.rpc.set('uni_calendar_candidates', async () => {
    await lookup;
    return lookupUnavailable ? {status: 503, body: {message: 'Synthetic candidate lookup unavailable'}}
      : {body: {students: [{id: learner, name: 'Synthetic enrolled learner'}], organisers: [{id: user.id, name: 'Synthetic lecturer'}]}};
  });
  fixture.rpc.set('save_uni_calendar_class', request => {
    if (++saves === 1) return {body: null};
    const payload = request.body!;
    tables.live_class_sessions.push({id: payload.p_id, tenant_id: tenant, module_id: payload.p_module,
      organiser_user_id: payload.p_organiser, title: payload.p_title, starts_at: payload.p_start, ends_at: payload.p_end,
      status: 'scheduled', teams_sync_status: 'pending', join_url: null});
    tables.uni_calendar_jobs.push({id: 'calendar-job', tenant_id: tenant, session_id: payload.p_id, status: 'pending', revision: 1, error_code: null});
    tables.live_class_invitations.push({id: 'class-invitation', tenant_id: tenant, session_id: payload.p_id, user_id: learner, status: 'invited'});
    return {body: payload.p_id};
  });
  fixture.rpc.set('cancel_uni_calendar_class', request => {
    if (++cancellations > 1) tables.live_class_sessions.find(row => row.id === request.body?.p_session)!.status = 'cancelled';
    return {body: null};
  });
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.setViewportSize({width: 390, height: 1000});
  await page.goto(`/lecturer/class-scheduler?module=${moduleId}`);
  await dismissConsent(page);
  const selectAll = page.getByRole('button', {name: 'Select all enrolled learners', exact: true});
  await expect(page.getByText('Checking enrolled learners and connected organisers…', {exact: true})).toBeVisible();
  await expect(selectAll).toBeDisabled();
  await expect(page.getByText('No active learners are enrolled in this programme.', {exact: true})).toHaveCount(0);
  releaseLookup();
  const retryCandidates = page.getByRole('button', {name: 'Retry learners and organisers', exact: true});
  await expect(retryCandidates).toBeVisible({timeout: 15_000});
  await expect(selectAll).toBeDisabled();
  await expect(page.getByText('No active learners are enrolled in this programme.', {exact: true})).toHaveCount(0);
  lookupUnavailable = false;
  await retryCandidates.click();
  await expect(selectAll).toBeEnabled();
  const title = 'Python workshop and evidence review';
  await page.getByRole('textbox', {name: 'Class title', exact: true}).fill(title);
  await page.getByRole('combobox', {name: 'Meeting organiser', exact: true}).selectOption(user.id);
  await page.getByLabel('Starts (Pakistan time)', {exact: true}).fill('2026-11-09T14:00');
  await page.getByLabel('Ends (Pakistan time)', {exact: true}).fill('2026-11-09T15:00');
  await selectAll.click();
  await expect(page.getByRole('checkbox', {name: 'Synthetic enrolled learner', exact: true})).toBeChecked();
  await page.getByRole('button', {name: 'Schedule and invite', exact: true}).click();
  await expect(page.getByRole('alert')).toContainText('Save could not be confirmed');
  await expect(page.getByRole('textbox', {name: 'Class title', exact: true})).toHaveValue(title);
  await expect(page.getByLabel('Starts (Pakistan time)', {exact: true})).toHaveValue('2026-11-09T14:00');
  expect(saves).toBe(1);
  await inspectLayouts(page, info, 'live-class-scheduler');
  await page.evaluate(() => {document.documentElement.style.fontSize = ''; document.documentElement.classList.remove('dark');});
  await page.setViewportSize({width: 390, height: 1000});
  await page.getByRole('button', {name: 'Schedule and invite', exact: true}).click();
  await expect(page.getByText('Class saved. Microsoft invitation delivery is queued, not yet confirmed.', {exact: true})).toBeVisible();
  await expect(page.getByRole('heading', {name: title, exact: true})).toBeVisible();
  const saveCalls = fixture.requests.filter(read => read.name === 'save_uni_calendar_class');
  expect(saveCalls).toHaveLength(2);
  expect(saveCalls[1].body).toEqual(saveCalls[0].body);
  expect(saveCalls[0].body?.p_start).toBe('2026-11-09T09:00:00.000Z');
  expect(saveCalls[0].body?.p_end).toBe('2026-11-09T10:00:00.000Z');
  expect(saveCalls[0].body?.p_students).toEqual([learner]);
  await page.getByRole('button', {name: `Cancel ${title}`, exact: true}).click();
  const confirmation = page.getByRole('alertdialog', {name: 'Cancel live class?', exact: true});
  await expect(confirmation.getByRole('button', {name: 'Keep class', exact: true})).toBeFocused();
  await confirmation.getByRole('button', {name: 'Confirm cancellation', exact: true}).click();
  await expect(confirmation.getByRole('alert')).toContainText('Cancellation could not be confirmed');
  await confirmation.getByRole('button', {name: 'Keep class', exact: true}).click();
  await expect(page.getByRole('button', {name: `Cancel ${title}`, exact: true})).toBeFocused();
  await page.getByRole('button', {name: `Cancel ${title}`, exact: true}).click();
  await confirmation.getByRole('button', {name: 'Confirm cancellation', exact: true}).click();
  await expect(confirmation).toBeHidden();
  await expect(page.getByText(`“${title}” is cancelled in UniPathway. Microsoft cancellation delivery is confirmed separately.`, {exact: true})).toBeVisible();
  await expect(page.getByRole('button', {name: `Cancel ${title}`, exact: true})).toHaveCount(0);
  expect(cancellations).toBe(2);
});
