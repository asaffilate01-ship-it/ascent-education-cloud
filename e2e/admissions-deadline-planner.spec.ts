import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';

test('scholarship deadline planner edits, filters and exports unfinished dates on mobile',async({context,page})=>{
 test.setTimeout(45_000);
 await context.addInitScript(()=>{localStorage.setItem('cookie_consent_v2',JSON.stringify({essential:true,analytics:false,marketing:false,timestamp:'2026-11-26T00:00:00.000Z'}));});
 await context.route('https://unipathway-browser-ci.invalid/**',route=>route.fulfill({status:200,headers:{'access-control-allow-origin':'*','content-type':'application/json'},body:'[]'}));
 await page.setViewportSize({width:390,height:844});
 await page.goto('/scholarships');
 const planner=page.getByRole('region',{name:'Application and scholarship deadline planner',exact:true});
 await expect(planner).toBeVisible();
 const form=planner.getByRole('form',{name:'Add planning entry'});
 const exportButton=planner.getByRole('button',{name:'Export unfinished dates (.ics)',exact:true});
 await expect(exportButton).toBeDisabled();
 await form.getByLabel('Application or award name').fill('Research deadline');
 await form.getByLabel('Your planning date').fill('2027-01-31');
 await form.getByLabel('Official source URL (optional)').fill('https://example.org/research');
 await form.getByRole('button',{name:'Add planning entry',exact:true}).click();
 const row=planner.getByRole('article').filter({hasText:'Research deadline'});
 await expect(row).toHaveCount(1);
 await row.getByRole('button',{name:'Edit',exact:true}).click();
 const edit=planner.getByRole('form',{name:'Edit planning entry'});
 await edit.getByLabel('Application or award name').fill('Updated deadline');
 await edit.getByRole('button',{name:'Save changes',exact:true}).click();
 const updated=planner.getByRole('article').filter({hasText:'Updated deadline'});
 await expect(updated).toHaveCount(1);
 const downloadPromise=page.waitForEvent('download');
 await exportButton.click();
 const download=await downloadPromise;
 expect(download.suggestedFilename()).toBe('unipathway-planning-dates.ics');
 const calendar=await readFile((await download.path())!,'utf8');
 expect(calendar).toContain('SUMMARY:Updated deadline');
 expect(calendar).toContain('DTSTART;VALUE=DATE:20270131');
 expect(calendar).not.toContain('example.org/research');
 await updated.getByRole('button',{name:'Mark completed',exact:true}).click();
 await expect(exportButton).toBeDisabled();
 await planner.getByLabel('Show planning entries').selectOption('unfinished');
 await expect(planner.getByText('No entries match the selected filter.')).toBeVisible();
 await planner.getByLabel('Show planning entries').selectOption('completed');
 await expect(updated).toBeVisible();
 await updated.getByRole('button',{name:'Reopen',exact:true}).click();
 await expect(exportButton).toBeEnabled();
 await planner.getByLabel('Show planning entries').selectOption('all');
 await expect(updated).toBeVisible();
 for(const width of [360,390,768,1440]){
  await page.setViewportSize({width,height:900});
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
});
