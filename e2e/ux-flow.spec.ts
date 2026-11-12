import {test, expect, type BrowserContext} from '@playwright/test';
import {dismissConsent, inspectLayouts} from './support/layoutEvidence';

const tenant = '00000000-0000-4000-8000-000000000010';
const user = {
  id: '00000000-0000-4000-8000-000000000001', aud: 'authenticated', role: 'authenticated',
  email: 'synthetic-ux@unipathway.invalid', app_metadata: {provider: 'email'}, user_metadata: {},
  created_at: '2026-01-01T00:00:00Z',
};
type Row = Record<string, unknown>;
type Read = {name: string; method: string; params: URLSearchParams};

/** Synthetic data only. Never authenticates against a hosted backend. */
async function records(context: BrowserContext, role: string, tables: Record<string, Row[]>) {
  const requests: Read[] = [];
  const failures = new Set<string>();
  await context.addInitScript(({user}) => {
    if (location.origin === 'null') return;
    const token = btoa(JSON.stringify({alg: 'HS256', typ: 'JWT'})) + '.' +
      btoa(JSON.stringify({sub: user.id, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600})) + '.synthetic';
    localStorage.setItem('sb-unipathway-browser-ci-auth-token', JSON.stringify({
      access_token: token, refresh_token: 'synthetic', token_type: 'bearer',
      expires_at: Math.floor(Date.now() / 1000) + 3600, expires_in: 3600, user,
    }));
  }, {user});
  await context.route('https://unipathway-browser-ci.invalid/**', async route => {
    const request = route.request(), url = new URL(request.url());
    const name = url.pathname.split('/').at(-1) || '';
    requests.push({name, method: request.method(), params: url.searchParams});
    const headers = {'access-control-allow-origin': '*', 'content-type': 'application/json'};
    if (failures.has(name) || failures.has(`${request.method()}:${name}`)) {
      return route.fulfill({status: 503, headers, body: JSON.stringify({message: 'Synthetic unavailable source'})});
    }
    if (url.pathname.endsWith('/auth/v1/user')) return route.fulfill({status: 200, headers, body: JSON.stringify(user)});
    if (name === 'profiles') return route.fulfill({status: 200, headers, body: JSON.stringify({full_name: 'Synthetic learner', tenant_id: tenant})});
    if (name === 'user_roles') return route.fulfill({status: 200, headers, body: JSON.stringify([{role, tenant_id: tenant}])});
    let data = [...(tables[name] || [])];
    for (const [key, value] of url.searchParams) {
      if (value.startsWith('eq.')) data = data.filter(row => String(row[key]) === value.slice(3));
      if (value.startsWith('in.(')) {
        const ids = value.slice(4, -1).split(',');
        data = data.filter(row => ids.includes(String(row[key])));
      }
    }
    for (const order of (url.searchParams.get('order') || '').split(',').reverse()) {
      const [field, direction] = order.split('.');
      if (field) data.sort((a, b) => String(a[field] ?? '').localeCompare(String(b[field] ?? '')) * (direction === 'desc' ? -1 : 1));
    }
    const total = data.length, offset = Number(url.searchParams.get('offset') || 0);
    data = data.slice(offset, offset + Number(url.searchParams.get('limit') || 250));
    return route.fulfill({status: 200, headers: {...headers, 'content-range': `${offset}-${offset + data.length - 1}/${total}`}, body: request.method() === 'HEAD' ? '' : JSON.stringify(data)});
  });
  return {requests, failures};
}

test('homepage discovery combines reordered words and filters with keyboard recovery', async ({context, page}, info) => {
  test.setTimeout(60_000);
  await context.route('https://unipathway-browser-ci.invalid/**', route => route.fulfill({status: 200, contentType: 'application/json', body: '[]'}));
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.setViewportSize({width: 360, height: 1000});
  await page.goto('/#study');
  await dismissConsent(page);
  const search = page.getByRole('searchbox', {name: 'Search learning areas'});
  await search.fill('cloud Python');
  await expect(page.getByRole('heading', {name: 'Technology Academy', exact: true})).toBeVisible();
  await expect(page.locator('#home-course-results')).toHaveText('1 matching learning area');
  await page.getByRole('button', {name: 'Languages', exact: true}).click();
  await expect(page.locator('#home-course-results')).toHaveText('0 matching learning areas');
  await page.getByRole('button', {name: 'Show all learning areas'}).click();
  await expect(search).toBeFocused();
  await search.fill('practice IELTS');
  await expect(page.getByRole('heading', {name: 'IELTS Preparation', exact: true})).toBeVisible();
  await inspectLayouts(page, info, 'home-discovery');
  const navigation = page.getByRole('navigation', {name: 'Main navigation', exact: true});
  for (const [triggerName, regionName] of [['Courses', 'Course options'], ['Study Abroad', 'Study abroad options']]) {
    const trigger = navigation.getByRole('button', {name: triggerName, exact: true});
    await trigger.click();
    const panel = page.getByRole('region', {name: regionName, exact: true});
    await expect(panel).toBeVisible();
    const bounds = await panel.boundingBox();
    expect(bounds?.x).toBeGreaterThanOrEqual(0);
    expect((bounds?.x || 0) + (bounds?.width || 0)).toBeLessThanOrEqual(1440);
    expect((bounds?.y || 0) + (bounds?.height || 0)).toBeLessThanOrEqual(1000);
    await panel.getByRole('link').last().scrollIntoViewIfNeeded();
    await page.screenshot({path: info.outputPath(`home-${triggerName.toLowerCase().replaceAll(' ', '-')}-menu-dark-200-percent-text.png`)});
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(trigger).toBeFocused();
  }
});

test('admissions keeps the applicant and pipeline filters across every review section', async ({context, page}, info) => {
  test.setTimeout(60_000);
  const application = {id: 'application-a', tenant_id: tenant, student_name: 'Synthetic Applicant', email: 'applicant@example.invalid',
    stage: 'applied', programme_id: 'programme-a', programme_name: 'Diploma in Computing and Digital Systems', user_id: null,
    intake: 'November 2026', document_checklist: {}, counsellor: null, source: 'website', updated_at: '2026-11-07T09:00:00Z'};
  const fixture = await records(context, 'admissions_admin', {applications: [application,
    {...application, id: 'foreign-application', tenant_id: 'another-centre', student_name: 'Foreign Applicant'}]});
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.setViewportSize({width: 360, height: 1000});
  await page.goto('/admissions?q=Synthetic&stage=applied');
  await dismissConsent(page);
  await page.getByRole('link', {name: 'Review documents for Synthetic Applicant', exact: true}).click();
  const selected = page.getByRole('region', {name: 'Selected applicant'});
  await expect(selected.getByRole('heading', {name: 'Synthetic Applicant', exact: true})).toBeVisible();
  const nav = page.getByRole('navigation', {name: 'Application review sections'});
  for (const section of ['Eligibility', 'Offers', 'Allocations', 'Documents']) {
    await nav.getByRole('link', {name: section, exact: true}).click();
    await expect(nav.getByRole('link', {name: section, exact: true})).toHaveAttribute('aria-current', 'page');
    await expect(selected.getByRole('heading', {name: 'Synthetic Applicant', exact: true})).toBeVisible();
    expect(new URL(page.url()).searchParams.get('application')).toBe('application-a');
  }
  await page.reload();
  await expect(selected).toContainText('Synthetic Applicant');
  await inspectLayouts(page, info, 'admissions-review');
  await page.getByRole('link', {name: 'Back to pipeline', exact: true}).click();
  await expect(page.getByLabel('Search applications', {exact: true})).toHaveValue('Synthetic');
  expect(new URL(page.url()).searchParams.get('stage')).toBe('applied');
  expect(fixture.requests.filter(read => read.name === 'applications').every(read => read.params.get('tenant_id') === `eq.${tenant}`)).toBe(true);
  expect(fixture.requests.some(read => /admit_application|enrol_application/.test(read.name))).toBe(false);
});

test('student resume uses the most recent current lesson and recovers after a failed progress read', async ({context, page}, info) => {
  test.setTimeout(60_000);
  const fixture = await records(context, 'student', {
    student_enrolments: [{id: 'enrolment-a', tenant_id: tenant, student_id: user.id, programme_id: 'programme-a', status: 'active'}],
    programmes: [{id: 'programme-a', tenant_id: tenant, title: 'Computing', awarding_body: 'OTHM', level: '5'}],
    modules: [{id: 'module-a', tenant_id: tenant, programme_id: 'programme-a', title: 'Programming and problem solving', code: 'PRG01', status: 'active'}],
    unipathway_lessons: [
      {id: 'lesson-one', tenant_id: tenant, module_id: 'module-a', title: 'First published lesson', position: 0, status: 'published', revision: 1},
      {id: 'lesson-resume', tenant_id: tenant, module_id: 'module-a', title: 'Building reliable Python functions', position: 1, status: 'published', revision: 2},
      {id: 'lesson-withdrawn', tenant_id: tenant, module_id: 'module-a', title: 'Withdrawn lesson', position: 2, status: 'draft', revision: 1},
    ],
    unipathway_lesson_progress: [
      {lesson_id: 'lesson-one', student_id: user.id, revision: 1, completed: true, position_seconds: 300, updated_at: '2026-11-05T10:00:00Z'},
      {lesson_id: 'lesson-resume', student_id: user.id, revision: 2, completed: false, position_seconds: 90, updated_at: '2026-11-06T10:00:00Z'},
      {lesson_id: 'lesson-withdrawn', student_id: user.id, revision: 1, completed: false, position_seconds: 10, updated_at: '2026-11-07T10:00:00Z'},
    ],
    unipathway_assessment_released_results: [{attempt_id: 'attempt-a', student_id: user.id, tenant_id: tenant, brief_id: 'brief-a', final_score: 78, released_at: '2026-11-06T09:00:00Z'}],
    unipathway_assessment_briefs: [{id: 'brief-a', tenant_id: tenant, module_id: 'module-a', title: 'Statistical investigation'}],
  });
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.setViewportSize({width: 360, height: 1000});
  await page.goto('/student');
  await dismissConsent(page);
  const learning = page.getByRole('region', {name: 'Continue learning', exact: true});
  await expect(learning.getByRole('link', {name: 'Resume lesson', exact: true})).toHaveAttribute('href', '/student/lessons?module=module-a&lesson=lesson-resume');
  await expect(learning).toContainText('Building reliable Python functions');
  await expect(learning).not.toContainText('Withdrawn lesson');
  await expect(page.getByRole('link', {name: 'View approved feedback for Statistical investigation'})).toHaveAttribute('href', '/student/grades?module=module-a');
  const gradeSummary = page.locator('dl[aria-label="Verified student learning summary"]');
  await expect(gradeSummary).toContainText('Approved Average');
  await expect(gradeSummary).toContainText('78%');
  // At 360px and 200% text, the summary must reflow instead of forcing 3 tiny columns.
  await page.evaluate(() => {document.documentElement.style.fontSize = '32px';});
  await expect(gradeSummary).toBeVisible();
  const summaryBounds = await gradeSummary.evaluate(element => {
    const box = element.getBoundingClientRect();
    return {inside: box.left >= -1 && box.right <= innerWidth + 1,
      noHorizontalOverflow: element.scrollWidth <= element.clientWidth + 1,
      cardCount: element.children.length};
  });
  expect(summaryBounds.inside, JSON.stringify(summaryBounds)).toBe(true);
  expect(summaryBounds.noHorizontalOverflow, JSON.stringify(summaryBounds)).toBe(true);
  expect(summaryBounds.cardCount).toBe(3);
  await page.evaluate(() => {document.documentElement.style.fontSize = '';});
  fixture.failures.add('unipathway_lesson_progress');
  await page.reload();
  await expect(learning.getByRole('alert')).toContainText('could not be verified');
  await expect(learning.getByRole('link', {name: 'Resume lesson'})).toHaveCount(0);
  fixture.failures.clear();
  await learning.getByRole('button', {name: 'Retry learning progress'}).click();
  await expect(learning.getByRole('link', {name: 'Resume lesson'})).toBeVisible();
  await inspectLayouts(page, info, 'student-resume');
  expect(fixture.requests.filter(read => read.name === 'unipathway_lessons').every(read => read.params.get('tenant_id') === `eq.${tenant}` && read.params.get('status') === 'eq.published')).toBe(true);
  expect(fixture.requests.filter(read => read.name === 'unipathway_lesson_progress').every(read => read.params.get('student_id') === `eq.${user.id}`)).toBe(true);
});

test('calendar recovers failed reads, opens every same-day event and reports failed deletion honestly', async ({context, page}, info) => {
  test.setTimeout(60_000);
  await page.clock.setFixedTime(new Date('2026-11-07T09:00:00Z'));
  const events = [
    {id: 'event-one', title: 'Centre induction', event_type: 'meeting', start_date: '2026-11-07T10:00:00Z', end_date: '2026-11-07T11:00:00Z', all_day: false},
    {id: 'event-two', title: 'Computing assessment', event_type: 'exam', start_date: '2026-11-07T12:00:00Z', end_date: '2026-11-07T13:00:00Z', all_day: false},
    {id: 'event-three', title: 'Coursework submission', event_type: 'deadline', start_date: '2026-11-07T16:00:00Z', end_date: '2026-11-07T17:00:00Z', all_day: false},
    {id: 'event-four', title: 'Residential learning visit', event_type: 'residential', start_date: '2026-11-06T19:00:00Z', end_date: '2026-11-08T19:00:00Z', all_day: true},
  ].map(event => ({...event, tenant_id: tenant, created_by: user.id, location: 'Jhelum centre · main learning room', description: 'Synthetic calendar evidence for responsive review.', color: '#3b82f6'}));
  const fixture = await records(context, 'centre_director', {academic_events: events});
  fixture.failures.add('academic_events');
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.setViewportSize({width: 360, height: 1000});
  await page.goto('/calendar');
  await dismissConsent(page);
  await expect(page.getByRole('heading', {name: 'Calendar could not be loaded'})).toBeVisible();
  await expect(page.getByText('No events this month', {exact: true})).toHaveCount(0);
  fixture.failures.clear();
  await page.getByRole('button', {name: 'Retry calendar'}).click();
  await expect(page.getByRole('button', {name: 'Agenda', exact: true})).toHaveAttribute('aria-pressed', 'true');
  const eventButton = page.getByRole('button', {name: 'View Centre induction and all events on 7 Nov 2026', exact: true}).first();
  await eventButton.click();
  const details = page.getByRole('dialog', {name: 'Saturday, 7 November 2026', exact: true});
  for (const event of events) await expect(details.getByRole('heading', {name: event.title, exact: true})).toBeVisible();
  fixture.failures.add('DELETE:academic_events');
  await details.getByRole('button', {name: 'Delete Centre induction', exact: true}).click();
  const confirmation = page.getByRole('alertdialog', {name: 'Delete calendar event?', exact: true});
  await confirmation.getByRole('button', {name: 'Delete event', exact: true}).click();
  await expect(confirmation.getByRole('alert')).toContainText('Deletion was not confirmed');
  await expect(page.getByText('Event deleted', {exact: true})).toHaveCount(0);
  await confirmation.getByRole('button', {name: 'Keep event', exact: true}).click();
  await expect(details.getByRole('heading', {name: 'Centre induction', exact: true})).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(details).toHaveCount(0);
  await inspectLayouts(page, info, 'academic-calendar');
  await page.evaluate(() => {document.documentElement.style.fontSize = ''; document.documentElement.classList.remove('dark');});
  await page.setViewportSize({width: 1440, height: 1000});
  await page.getByRole('button', {name: 'Month', exact: true}).click();
  await page.getByRole('button', {name: 'Saturday, 7 November 2026, 4 events. View day details.', exact: true}).click();
  await expect(details.getByRole('heading')).toHaveCount(5);
  const deletion = fixture.requests.find(read => read.method === 'DELETE' && read.name === 'academic_events');
  expect(deletion?.params.get('tenant_id')).toBe(`eq.${tenant}`);
  expect(deletion?.params.get('id')).toBe('eq.event-one');
  expect(fixture.requests.filter(read => read.name === 'academic_events').every(read => read.params.get('tenant_id') === `eq.${tenant}`)).toBe(true);
});
