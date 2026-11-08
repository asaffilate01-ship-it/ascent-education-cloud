import {test, expect} from '@playwright/test';
import {academicRecords, tenant} from './support/syntheticAcademicRecords';
import {dismissConsent, inspectLayouts} from './support/layoutEvidence';

test('office permissions remain an explicit activation gate with production flags off', async ({context, page}, info) => {
  test.setTimeout(90_000);
  const fixture = await academicRecords(context, 'superadmin', {tenants: [{id: tenant, name: 'Synthetic centre'}]});
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.setViewportSize({width: 360, height: 1000});
  await page.goto('/landlord/staff-access');
  await dismissConsent(page);
  await expect(page.getByRole('heading', {name: 'Office access activation pending', exact: true})).toBeVisible();
  await expect(page.getByRole('button', {name: 'Review permission changes', exact: true})).toHaveCount(0);
  await expect(page.getByLabel('Select an account and role', {exact: true})).toHaveCount(0);
  await inspectLayouts(page, info, 'office-activation-gate');
  expect(fixture.requests.filter(request => ['tenants', 'get_unipathway_staff_directory_for_manager',
    'get_unipathway_staff_access', 'set_unipathway_staff_access', 'invite-staff'].includes(request.name))).toEqual([]);
});
