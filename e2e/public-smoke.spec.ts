import { test, expect } from '@playwright/test';

test.describe('public production smoke', () => {
  test('home and auth routes render without dead-end navigation', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
    await page.goto('/login');
    await expect(page.locator('body')).toBeVisible();
  });

  test('protected student route does not expose dashboard anonymously', async ({ page }) => {
    await page.goto('/student');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/\/login(?:[/?#]|$)/);
  });

  test('native public bottom tabs navigate and retain active state across redirected routes', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    const tabs = page.getByRole('navigation', { name: 'Quick navigation' });
    await expect(tabs).toBeVisible();

    // Cookie choice is a real modal and intentionally blocks the app until answered.
    const consent = page.getByRole('dialog', { name: 'Cookie preferences' });
    if (await consent.isVisible()) await consent.getByRole('button', { name: 'Reject all' }).click();

    await expect(tabs.getByRole('link')).toHaveCount(5);
    await expect(tabs.getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('navigation', { name: 'Dashboard mobile tabs' })).toHaveCount(0);

    await tabs.getByRole('link', { name: 'Study' }).click();
    await expect(page).toHaveURL(/\/study(?:\/?$|\?)/);
    await expect(tabs.getByRole('link', { name: 'Study' })).toHaveAttribute('aria-current', 'page');

    await tabs.getByRole('link', { name: 'Abroad' }).click();
    await expect(page).toHaveURL(/\/tenant\/unipathway\/pathways/);
    await expect(tabs.getByRole('link', { name: 'Abroad' })).toHaveAttribute('aria-current', 'page');
  });
});

test('page navigation starts at top instead of carrying old scroll positions', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const tabs = page.getByRole('navigation', { name: 'Quick navigation' });
  await expect(tabs).toBeVisible();
  const consent = page.getByRole('dialog', { name: 'Cookie preferences' });
  if (await consent.isVisible()) await consent.getByRole('button', { name: 'Reject all' }).click();

  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'auto' }));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100);
  await tabs.getByRole('link', { name: 'Study' }).click();
  await expect(page).toHaveURL(/\/study(?:\/?$|\?)/);
  await expect(page.getByRole('heading', { name: 'Qualifications, skills and your next step.' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(10);
});

test('new public service and awarding body routes render at the beginning', async ({ page }) => {
  for (const route of ['/qualifications', '/german-preparation', '/funded-courses', '/careers', '/student-support']) {
    await page.goto(route);
    await expect(page.locator('main h1').first()).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(10);
  }
});

test('ladies Beauty Academy discloses pending centre and CPD accreditation',async({page})=>{
  await page.goto('/beauty-aesthetics');
  await expect(page.getByRole('heading',{name:/Professional beauty skills/i})).toBeVisible();
  await expect(page.getByText(/Application preparation — approval pending/i).first()).toBeVisible();
  await expect(page.getByRole('heading',{name:/Planned certificates, awards and diplomas/i})).toBeVisible();
  const count=page.getByRole('status').filter({hasText:'proposed qualification options'}).first();
  await expect(count).toBeVisible();
  await page.getByRole('button',{name:'Nails',exact:true}).click();
  await expect(count).toContainText('2 proposed qualification options');
  await page.getByLabel('Level').selectOption('3');
  await expect(count).toContainText('1 proposed qualification options');
});
test('unverified centre users cannot open staff Beauty Accreditation dashboard anonymously',async({page})=>{
  await page.goto('/director/beauty-accreditation');
  await expect(page).toHaveURL(/\/login(?:[/?#]|$)/);
});

test('Tech and Finance academies contain actual modules and exam-preparation boundaries',async({page})=>{
  await page.goto('/tech-academy');
  await expect(page.getByRole('heading',{name:/Build the skills to create/i})).toBeVisible();
  await expect(page.getByRole('heading',{name:/Python Programming/i})).toBeVisible();
  await expect(page.getByRole('heading',{name:/Cyber Security & Cyber Essentials Awareness/i})).toBeVisible();
  await page.goto('/finance-academy');
  await expect(page.getByRole('heading',{name:/Understand the numbers/i})).toBeVisible();
  await expect(page.getByRole('heading',{name:/IFA Professional Exam Preparation/i})).toBeVisible();
  await expect(page.getByRole('heading',{name:/ACCA Foundation and Qualification Exam Preparation/i})).toBeVisible();
});
test('six study destinations, Pakistan vocational and About pages render trustworthy routes',async({page})=>{
  for(const route of ['/usa','/canada','/australia','/pakistan','/uk','/germany']){
    await page.goto(route);
    await expect(page.locator('main h1').first()).toBeVisible();
    await expect(page.getByRole('heading',{name:/Language requirements and preparation/i}).first()).toBeVisible();
  }
  await page.goto('/funded-courses');
  await expect(page.getByRole('heading',{name:/Explore vocational and employability subjects/i})).toBeVisible();
  await page.goto('/about');
  await expect(page.getByRole('heading',{name:/Learn here.*Go further/i})).toBeVisible();
  await expect(page.getByText('342+', {exact:true})).toHaveCount(0);
});
test('employer partnership management and student vacancies remain private when unauthenticated',async({page})=>{
  for(const route of ['/director/employers','/admissions/employers','/landlord/employers','/student/opportunities']){
    await page.goto(route);
    await expect(page).toHaveURL(/\/login(?:[/?#]|$)/);
  }
});

test('UniPathway tenant homepage uses approved brand instead of legacy unverified claims', async ({ page }) => {
  await page.goto('/tenant/unipathway');
  await expect(page.locator('main h1').first()).toContainText('Learn here.');
  await expect(page.getByText('342+', { exact: true })).toHaveCount(0);
  await expect(page.getByText('95% Pass Rate', { exact: false })).toHaveCount(0);
  await expect(page.getByText('50–70%', { exact: false })).toHaveCount(0);
});

test('Study Abroad excludes Pakistan and offers the local Pakistan guide separately', async ({ page }) => {
  await page.goto('/pathways?destination=Pakistan');
  await expect(page).toHaveURL(/\/pakistan(?:[/?#]|$)/);
  await page.goto('/pathways');
  await expect(page.getByRole('heading', { name: 'Find your next university pathway' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Pakistan/ })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /Study in Pakistan/ }).first()).toBeVisible();
  await page.getByRole('button', { name: /United States/ }).click();
  await expect(page).toHaveURL(/destination=USA/);
  await expect(page.getByRole('heading', { name: 'Explore United States' })).toBeVisible();
});

test('Explore options leads to selected OTHM/Qualifi qualifications and the internal university directory', async ({page}) => {
  await page.goto('/study');
  const chosen = page.getByRole('article').filter({hasText:'UK business and professional diplomas'});
  await chosen.getByRole('link', {name:'Explore options'}).click();
  await expect(page).toHaveURL(/\/qualifications\?body=OTHM/);
  await expect(page.getByRole('button', {name:'OTHM',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.getByRole('link', {name:/Explore listed progression universities/}).click();
  await expect(page).toHaveURL(/\/university-progression/);
  await expect(page.getByRole('heading', {name:/published OTHM or Qualifi progression routes/})).toBeVisible();
});

test('University directory stays on-site and filters USA, Australia and Canada truthfully',async({page})=>{
  await page.goto('/university-progression');
  const country=page.getByRole('group',{name:'Filter universities by country'});
  await country.getByRole('button',{name:'United States'}).click();
  await expect(page.getByRole('status').first()).toContainText('8 listed universities');
  await expect(page.getByRole('heading',{name:'Thomas Edison State University'})).toBeVisible();
  await country.getByRole('button',{name:'Australia'}).click();
  await expect(page.getByRole('heading',{name:'Curtin University'})).toBeVisible();
  await country.getByRole('button',{name:'Canada'}).click();
  await expect(page.getByRole('heading',{name:'Canadian qualification review remains available'})).toBeVisible();
  await expect(page.getByRole('status').first()).toContainText('0 listed universities');
  await country.getByRole('button',{name:'United States'}).click();
  await page.getByRole('link',{name:/Discuss this university/}).first().click();
  await expect(page).toHaveURL(/\/tenant\/unipathway\/pathways\?destination=USA&university=/);
  await expect(page.getByText('University to discuss:',{exact:false})).toBeVisible();
});
