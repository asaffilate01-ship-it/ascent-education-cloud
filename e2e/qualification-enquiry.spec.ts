import {test,expect} from '@playwright/test';

test('a catalogue qualification stays selected through the guided enquiry',async({context,page})=>{
 await context.addInitScript(()=>{
  localStorage.setItem('cookie_consent_v2',JSON.stringify({
   essential:true,analytics:false,marketing:false,timestamp:'2026-11-10T00:00:00.000Z',
  }));
 });
 await context.route('https://unipathway-browser-ci.invalid/**',route=>route.fulfill({
  status:200,headers:{'access-control-allow-origin':'*','content-type':'application/json'},body:'[]'
 }));
 await page.setViewportSize({width:390,height:844});
 await page.goto('/qualifications?body=ATHE&level=4');
 const cards=page.getByRole('region',{name:'Proposed qualifications'}).getByRole('article');
 const title=await cards.first().locator('h2').innerText();
 await cards.first().getByRole('link',{name:'Review study options & enquire'}).click();
 await expect(page).toHaveURL(/\/apply\?area=qualifications/);
 await expect(page.getByText(`ATHE ${title}`,{exact:true})).toBeVisible();
 await expect(page.getByRole('combobox',{name:'Preferred level'})).toHaveValue('level-4');
 await expect(page.getByRole('combobox',{name:'Preferred level'})).toBeDisabled();
 await page.getByRole('combobox',{name:'Preferred study format'}).selectOption('online');
 await page.getByRole('button',{name:'Continue to course enquiry'}).click();
 await expect(page).toHaveURL(/\/tenant\/unipathway\/contact\?/);
 await expect(page.getByText('Your selected study interest')).toBeVisible();
 await expect(page.locator('#contact-message')).toHaveValue(/My preferred study format is Online across Pakistan/);
 expect(new URL(page.url()).searchParams.get('course')).toBe(`ATHE ${title}`);
});
