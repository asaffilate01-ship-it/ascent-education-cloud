import {test, expect, type Locator, type Page, type TestInfo} from '@playwright/test';
import {academicRecords, tenant, user, type Row} from './support/syntheticAcademicRecords';
import {dismissConsent, inspectLayouts} from './support/layoutEvidence';

// Missing controls should fail promptly enough to retain traces before the CI job's deadline.
test.use({actionTimeout: 15_000, navigationTimeout: 30_000});

const otherCentre = '00000000-0000-4000-8000-000000000011';
const invoiceA = '00000000-0000-4000-8000-000000000601';
const invoiceB = '00000000-0000-4000-8000-000000000602';
const staffA = '00000000-0000-4000-8000-000000000701';
const staffB = '00000000-0000-4000-8000-000000000702';

function invoice(id: string, studentName = 'Synthetic learner', extra: Row = {}): Row {
  return {id, tenant_id: tenant, student_id: user.id, student_name: studentName, type: 'tuition',
    amount: 1200.5, paid: 200.25, sponsor_amount: 300, sponsor_paid: 100, status: 'partial',
    due_date: '2026-11-20', instalments: 1, created_at: '2026-11-08T08:00:00Z', ...extra};
}

async function restoreText(page: Page) {
  await page.evaluate(() => {document.documentElement.style.fontSize = ''; document.documentElement.classList.remove('dark');});
  await page.setViewportSize({width: 390, height: 1000});
}

/** Enlarged finance columns keep readable widths; the final column remains reachable. */
async function inspectEnlargedInvoiceTable(page: Page, info: TestInfo, name: string) {
  const region = page.getByRole('region', {name: 'Invoice table', exact: true});
  const columns = await region.locator('thead th').evaluateAll(headers => headers.map(header => ({
    width: header.getBoundingClientRect().width,
    fontSize: parseFloat(getComputedStyle(header).fontSize),
  })));
  expect(columns).toHaveLength(6);
  for (const column of columns) expect(column.width).toBeGreaterThanOrEqual(column.fontSize * 5);
  await region.evaluate(element => {element.scrollLeft = element.scrollWidth;});
  const lastAction = region.locator('tbody tr').last().locator('td').last();
  await lastAction.scrollIntoViewIfNeeded();
  await expect(lastAction).toBeInViewport();
  await page.screenshot({path: info.outputPath(`${name}-dark-200-percent-text-1440-actions.png`), animations: 'disabled'});
}

/** Dialogs must remain inside the viewport, with their final action reachable by scrolling. */
async function inspectDialog(page: Page, dialog: Locator, finalAction: string, info: TestInfo, name: string) {
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
          width: element.clientWidth, scrollWidth: element.scrollWidth,
          overflowing: Array.from(element.querySelectorAll('*')).filter(child => {
            const childBox = child.getBoundingClientRect();
            return childBox.width > 0 && childBox.right > box.right + 1;
          }).slice(0, 12).map(child => ({tag: child.tagName, text: child.textContent?.slice(0, 90),
            width: Math.round(child.getBoundingClientRect().width)}))};
      });
      await page.screenshot({path: info.outputPath(`${name}-${enlarged ? 'dark-200-percent-text-' : ''}${width}.png`), animations: 'disabled'});
      expect(bounds.inside, 'The complete dialog must fit within the viewport').toBe(true);
      expect(bounds.contains, JSON.stringify(bounds)).toBe(true);
      const close = dialog.getByRole('button', {name: 'Close', exact: true});
      if (await close.count()) {
        const target = await close.boundingBox();
        expect(target?.width).toBeGreaterThanOrEqual(44);
        expect(target?.height).toBeGreaterThanOrEqual(44);
      }
      const action = dialog.getByRole('button', {name: finalAction, exact: true});
      await action.scrollIntoViewIfNeeded();
      await expect(action).toBeInViewport();
      if (width === 360) await page.screenshot({path: info.outputPath(`${name}-actions-${enlarged ? 'dark-200-percent-text-' : ''}${width}.png`), animations: 'disabled'});
    }
  }
  await restoreText(page);
}

test('a verified student invoice recovers its original reference and appears in the learner fees journey', async ({context, page, browser}, info) => {
  test.setTimeout(150_000);
  const tables: Record<string, Row[]> = {invoices: []};
  const fixture = await academicRecords(context, 'finance_officer', tables);
  const account = {user_id: user.id, full_name: 'Synthetic learner', tenant_id: tenant};
  let failDirectory = true;
  fixture.overrides.set('profiles', request => {
    if (request.params.get('select') !== 'user_id,full_name,tenant_id') return;
    if (!request.params.has('user_id')) return failDirectory
      ? {status: 503, body: {message: 'Synthetic directory interruption'}} : {body: [account]};
    return {body: account};
  });
  fixture.rpc.set('has_role', request => ({body: request.body?._user_id === user.id && request.body?._role === 'student'}));
  fixture.overrides.set('invoices', request => {
    if (request.method !== 'POST') return;
    const reviewed = request.body!;
    tables.invoices.push(invoice(String(reviewed.id), String(reviewed.student_name), {...reviewed, paid: 0,
      sponsor_amount: 0, sponsor_paid: 0, status: 'pending'}));
    return {body: null}; // The write persisted, but the client did not receive its receipt.
  });
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.setViewportSize({width: 390, height: 1000});
  await page.goto('/finance');
  await dismissConsent(page);
  await page.getByRole('button', {name: 'New student invoice', exact: true}).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('alert')).toContainText('Centre accounts could not be loaded');
  failDirectory = false;
  await dialog.getByRole('button', {name: 'Retry account lookup', exact: true}).click();
  await expect(dialog.getByLabel('Student account', {exact: true})).toBeEnabled();
  await dialog.getByLabel('Student account', {exact: true}).selectOption(user.id);
  await expect(dialog.getByRole('status')).toContainText('Student account verified');
  await dialog.getByLabel('Amount (PKR)', {exact: true}).fill('1234.50');
  await dialog.getByLabel('Due date (optional)', {exact: true}).fill('2026-11-20');
  await inspectDialog(page, dialog, 'Review invoice', info, 'student-invoice-details');
  await dialog.getByRole('button', {name: 'Review invoice', exact: true}).click();
  await expect(dialog.getByRole('heading', {name: 'Review student invoice', exact: true})).toBeVisible();
  await dialog.getByRole('button', {name: 'Create reviewed invoice', exact: true}).click();
  await expect(dialog.getByRole('alert')).toContainText('no matching receipt');
  const writes = () => fixture.requests.filter(request => request.name === 'invoices' && request.method === 'POST');
  expect(writes()).toHaveLength(1);
  const reference = String(writes()[0].body!.id);
  expect(writes()[0].body).toMatchObject({tenant_id: tenant, student_id: user.id, amount: 1234.5, type: 'tuition'});
  await dialog.getByRole('button', {name: 'Close and keep recovery', exact: true}).click();
  await page.getByRole('button', {name: 'New student invoice', exact: true}).click();
  await expect(dialog).toContainText(reference);
  await expect(dialog.getByLabel('Amount (PKR)', {exact: true})).toHaveCount(0);
  await dialog.getByRole('button', {name: 'Check invoice status', exact: true}).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText(`Invoice reference: ${reference}`, {exact: true})).toBeVisible();
  expect(writes()).toHaveLength(1);
  expect(fixture.requests.some(request => request.name === 'invoices' && request.params.get('id') === `eq.${reference}`
    && request.params.get('student_id') === `eq.${user.id}` && request.params.get('tenant_id') === `eq.${tenant}`)).toBe(true);

  const learnerContext = await browser.newContext({viewport: {width: 390, height: 1000}, reducedMotion: 'reduce'});
  try {
    const learner = await academicRecords(learnerContext, 'student', tables);
    learner.rpc.set('get_unipathway_my_fee_invoices', () => ({body: tables.invoices.filter(row => row.student_id === user.id).map(row => ({
      id: row.id, type: row.type, amount: row.amount, paid: row.paid, status: row.status, due_date: row.due_date,
      created_at: row.created_at, sponsor_amount: row.sponsor_amount, sponsor_paid: row.sponsor_paid, sponsor_name: null,
    }))}));
    const learnerPage = await learnerContext.newPage();
    await learnerPage.goto(new URL('/student/finance', page.url()).href);
    await dismissConsent(learnerPage);
    await expect(learnerPage.getByText(`Invoice reference: ${reference}`, {exact: true})).toBeVisible();
    await expect(learnerPage.getByText(/1,234\.50/).first()).toBeVisible();
    await learnerPage.getByLabel('Invoice status', {exact: true}).selectOption('paid');
    await expect(learnerPage.getByText('No invoices match this status.', {exact: true})).toBeVisible();
    await learnerPage.getByRole('button', {name: 'Show all invoices', exact: true}).click();
    await inspectLayouts(learnerPage, info, 'learner-linked-fees');
    expect(learner.requests.some(request => request.name === 'invoices')).toBe(false);
  } finally {await learnerContext.close();}
});

test('manual payment recovery stays with its invoice and records evidence without settling the balance', async ({context, page}, info) => {
  test.setTimeout(150_000);
  const tables: Record<string, Row[]> = {invoices: [invoice(invoiceA, 'Synthetic learner A'), invoice(invoiceB, 'Synthetic learner B')], payments: []};
  const fixture = await academicRecords(context, 'finance_officer', tables);
  let writes = 0;
  fixture.overrides.set('payments', request => {
    if (request.method !== 'POST') return;
    writes++;
    if (writes === 1) return {body: null}; // No confirmed record; retry must reuse the UUID and reviewed payload.
    tables.payments.push(request.body!);
    return {body: request.body};
  });
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.setViewportSize({width: 390, height: 1000});
  await page.goto('/finance');
  await dismissConsent(page);
  const openA = page.getByRole('button', {name: `Record student payment for Synthetic learner A, invoice ${invoiceA}`, exact: true});
  const openB = page.getByRole('button', {name: `Record student payment for Synthetic learner B, invoice ${invoiceB}`, exact: true});
  await openA.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', {name: 'Record student payment', exact: true})).toBeVisible();
  await dialog.getByLabel('Transaction reference', {exact: true}).fill('TRANSFER-A-001');
  await dialog.getByLabel('Amount (PKR)', {exact: true}).fill('0');
  await dialog.getByRole('button', {name: 'Review pending payment', exact: true}).click();
  await expect(dialog.getByRole('alert')).toContainText('greater than zero');
  await dialog.getByLabel('Amount (PKR)', {exact: true}).fill('800');
  await dialog.getByRole('button', {name: 'Review pending payment', exact: true}).click();
  await expect(dialog.getByRole('alert')).toContainText('cannot exceed the student balance');
  expect(writes).toBe(0);
  await dialog.getByLabel('Amount (PKR)', {exact: true}).fill('200.25');
  await dialog.getByRole('button', {name: 'Review pending payment', exact: true}).click();
  await inspectDialog(page, dialog, 'Record pending payment', info, 'reviewed-student-payment');
  await dialog.getByRole('button', {name: 'Record pending payment', exact: true}).click();
  await expect(dialog.getByRole('button', {name: 'Check payment record', exact: true})).toBeVisible();
  // Recovery is reserved before sending; an enabled action establishes that the response finished.
  await expect(dialog.getByRole('button', {name: 'Check payment record', exact: true})).toBeEnabled();
  await expect(dialog.getByRole('alert')).toContainText('The payment record was not confirmed.');
  const paymentWrites = () => fixture.requests.filter(request => request.name === 'payments' && request.method === 'POST');
  expect(paymentWrites()).toHaveLength(1);
  const original = paymentWrites()[0].body!;
  await dialog.getByRole('button', {name: 'Close', exact: true}).click();
  await openB.click();
  await expect(dialog.getByLabel('Transaction reference', {exact: true})).toHaveValue('');
  await dialog.getByLabel('Transaction reference', {exact: true}).fill('TRANSFER-B-DRAFT');
  await dialog.getByLabel('Amount (PKR)', {exact: true}).fill('25');
  await dialog.getByRole('button', {name: 'Close', exact: true}).click();
  await openA.click();
  await expect(dialog).toContainText('TRANSFER-A-001');
  await expect(dialog).not.toContainText('TRANSFER-B-DRAFT');
  await expect(dialog).toContainText(String(original.id));
  await dialog.getByRole('button', {name: 'Retry same payment', exact: true}).click();
  await expect(dialog.getByRole('heading', {name: 'Pending payment recorded', exact: true})).toBeVisible();
  await expect(dialog).toContainText('invoice balance is unchanged');
  await dialog.getByRole('button', {name: 'Done', exact: true}).click();
  await expect(dialog).toBeHidden();
  expect(paymentWrites()).toHaveLength(2);
  expect(paymentWrites()[1].body).toEqual(original);
  expect(original).toMatchObject({invoice_id: invoiceA, tenant_id: tenant, amount: 200.25,
    reference_number: 'TRANSFER-A-001', method: 'bank_transfer', status: 'pending'});
  expect(tables.invoices[0].paid).toBe(200.25);
  expect(tables.payments).toHaveLength(1);
  expect(fixture.requests.some(request => request.name === 'invoices' && !['GET', 'HEAD'].includes(request.method))).toBe(false);
  expect(fixture.requests.some(request => request.name === 'create-checkout')).toBe(false);
});

test('finance filtering and recovery preserve all loaded invoices and distinguish missing account links', async ({context, page}, info) => {
  test.setTimeout(120_000);
  const tables: Record<string, Row[]> = {invoices: Array.from({length: 26}, (_, index) => invoice(
    `00000000-0000-4000-8000-${String(800 + index).padStart(12, '0')}`, `Synthetic learner ${index + 1}`,
    {type: index < 3 ? 'exam' : 'tuition', student_id: index === 1 ? null : user.id}))};
  const fixture = await academicRecords(context, 'finance_officer', tables);
  fixture.failures.add('invoices');
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.setViewportSize({width: 390, height: 1000});
  await page.goto('/finance');
  await dismissConsent(page);
  await expect(page.getByRole('alert')).toContainText('Invoice data could not be loaded');
  await expect(page.getByRole('region', {name: 'Recorded invoice summary', exact: true})).toHaveCount(0);
  fixture.failures.clear();
  await page.getByRole('button', {name: 'Retry invoices', exact: true}).click();
  await expect(page.getByText('Page 1 of 2 · 26 matching invoices', {exact: true})).toBeVisible();
  await page.getByRole('button', {name: 'Next invoices', exact: true}).click();
  await expect(page.getByText('Page 2 of 2 · 26 matching invoices', {exact: true})).toBeVisible();
  await page.getByLabel('Search by learner or invoice reference', {exact: true}).fill('26 learner');
  await expect(page.getByRole('heading', {name: 'Invoices (1)', exact: true})).toBeVisible();
  await expect(page.getByRole('heading', {name: 'Synthetic learner 26', exact: true})).toBeVisible();
  await page.getByLabel('Search by learner or invoice reference', {exact: true}).fill('no matching learner');
  await expect(page.getByRole('heading', {name: 'No invoices match these filters', exact: true})).toBeVisible();
  await page.getByRole('button', {name: 'Show all invoices', exact: true}).click();
  await expect(page.getByLabel('Search by learner or invoice reference', {exact: true})).toBeFocused();
  await page.getByLabel('Invoice type', {exact: true}).selectOption('exam');
  await expect(page.getByRole('heading', {name: 'Invoices (3)', exact: true})).toBeVisible();
  await expect(page.locator('ul:visible').getByText('Account link missing. Finance review required before recording a student payment.', {exact: true})).toBeVisible();
  await expect(page.getByRole('button', {name: /Record student payment for Synthetic learner 2,/})).toHaveCount(0);
  await inspectLayouts(page, info, 'finance-invoice-workspace');
  await inspectEnlargedInvoiceTable(page, info, 'finance-invoice-workspace');
  expect(fixture.requests.filter(request => request.name === 'invoices').every(request => request.params.get('tenant_id') === `eq.${tenant}`)).toBe(true);
});

test('a platform owner can review invoices without being offered legacy finance writes', async ({context, page}, info) => {
  test.setTimeout(90_000);
  const fixture = await academicRecords(context, 'superadmin', {invoices: [invoice(invoiceA)]});
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.setViewportSize({width: 390, height: 1000});
  await page.goto('/landlord/finance');
  await dismissConsent(page);
  await expect(page.getByRole('region', {name: 'Recorded invoice summary', exact: true})).toContainText('PKR 1,200.50');
  await expect(page.getByText(/Platform Owner access alone does not grant those writes/)).toBeVisible();
  await expect(page.getByRole('button', {name: 'New student invoice', exact: true})).toBeDisabled();
  await expect(page.getByRole('button', {name: /Record student payment for/})).toHaveCount(0);
  await inspectLayouts(page, info, 'platform-invoice-review');
  await inspectEnlargedInvoiceTable(page, info, 'platform-invoice-review');
  expect(fixture.requests.some(request => request.name === 'payments' ||
    (request.name === 'profiles' && request.params.get('select') === 'user_id,full_name,tenant_id'))).toBe(false);
  expect(fixture.requests.some(request => request.name === 'invoices' && request.method === 'POST')).toBe(false);
});

test('a late permission lookup cannot replace the newly selected centre and an uncertain save is rechecked', async ({context, page}, info) => {
  test.setTimeout(150_000);
  const fixture = await academicRecords(context, 'superadmin', {tenants: [
    {id: tenant, name: 'Synthetic centre A'}, {id: otherCentre, name: 'Synthetic centre B'},
  ]});
  let releaseA!: (value: {body: unknown}) => void;
  const lateA = new Promise<{body: unknown}>(resolve => {releaseA = resolve;});
  let accessB = {userId: staffB, centreId: otherCentre, role: 'secretary', revision: 7, overrides: {staff_directory: 'deny'}};
  fixture.rpc.set('get_unipathway_staff_directory_for_manager', request => ({body: request.body?.p_tenant === tenant
    ? [{id: staffA, name: 'Synthetic colleague A', email: null, role: 'office_admin'}]
    : [{id: staffB, name: 'Synthetic colleague B', email: null, role: 'secretary'}]}));
  fixture.rpc.set('get_unipathway_staff_access', request => request.body?.p_target === staffA ? lateA : {body: accessB});
  fixture.rpc.set('set_unipathway_staff_access', request => {
    accessB = {...accessB, revision: 8, overrides: request.body?.p_overrides as {staff_directory: string}};
    return {body: null}; // Persisted in this synthetic centre; a read must verify the lost receipt.
  });
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.setViewportSize({width: 390, height: 1000});
  await page.goto('/landlord/staff-access');
  await dismissConsent(page);
  await page.getByLabel('Select an account and role', {exact: true}).selectOption(`${staffA}:office_admin`);
  await expect.poll(() => fixture.requests.some(request => request.name === 'get_unipathway_staff_access' && request.body?.p_target === staffA)).toBe(true);
  await page.getByLabel('Centre', {exact: true}).selectOption(otherCentre);
  await page.getByLabel('Select an account and role', {exact: true}).selectOption(`${staffB}:secretary`);
  await expect(page.getByText(/Last verified revision 7/)).toBeVisible();
  const finishedA = page.waitForResponse(response => response.url().endsWith('/rpc/get_unipathway_staff_access') && response.request().postDataJSON()?.p_target === staffA);
  releaseA({body: {userId: staffA, centreId: tenant, role: 'office_admin', revision: 99, overrides: {staff_directory: 'allow'}}});
  await (await finishedA).finished();
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await expect(page.getByText(/Last verified revision 7/)).toBeVisible();
  await expect(page.getByText(/Last verified revision 99/)).toHaveCount(0);
  await page.getByLabel('Staff directory permission', {exact: true}).selectOption('allow');
  await page.getByRole('button', {name: 'Review permission changes', exact: true}).click();
  const review = page.getByRole('alertdialog', {name: 'Apply permissions for Synthetic colleague B?', exact: true});
  await expect(review).toContainText('Synthetic centre B');
  await inspectDialog(page, review, 'Apply and audit permissions', info, 'staff-permission-review');
  await review.getByRole('button', {name: 'Apply and audit permissions', exact: true}).click();
  await expect(review.getByRole('alert')).toContainText('could not be confirmed');
  await expect(review.getByRole('button', {name: 'Apply and audit permissions', exact: true})).toBeDisabled();
  await review.getByRole('button', {name: 'Recheck this staff member', exact: true}).click();
  await expect(review).toBeHidden();
  await expect(page.getByText(/Last verified revision 8/)).toBeVisible();
  await expect(page.getByRole('button', {name: 'Review permission changes', exact: true})).toBeDisabled();
  await inspectLayouts(page, info, 'verified-staff-permissions');
  const writes = fixture.requests.filter(request => request.name === 'set_unipathway_staff_access');
  expect(writes).toHaveLength(1);
  expect(writes[0].body).toEqual({p_target: staffB, p_role: 'secretary', p_expected_revision: 7, p_overrides: {staff_directory: 'allow'}});
  expect(fixture.requests.some(request => request.name === 'invite-staff')).toBe(false);
});
