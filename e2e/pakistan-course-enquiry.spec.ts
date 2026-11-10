import {test,expect} from '@playwright/test';

test('Pakistan course selection retains study interest through mobile enquiry flow',async({context,page})=>{
 await context.route('https://unipathway-browser-ci.invalid/**',route=>route.fulfill({
  status:200,headers:{'access-control-allow-origin':'*','content-type':'application/json'},body:'[]',
 }));
 await page.setViewportSize({width:375,height:812});
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/apply');
 const cookie=page.getByRole('dialog',{name:'Cookie preferences'});
 if(await cookie.isVisible())await cookie.getByRole('button',{name:'Reject all'}).click();
 await expect(page.getByRole('button',{name:'Continue to course enquiry'})).toBeDisabled();
 await page.getByLabel(/What would you like to study\?/).selectOption('vocational');
 await page.getByLabel('Preferred level').selectOption('short');
 await page.getByLabel('Preferred study format').selectOption('blended');
 await page.getByRole('button',{name:'Continue to course enquiry'}).click();
 await expect(page).toHaveURL(/\/tenant\/unipathway\/contact\?/);
 const url=new URL(page.url());
 expect(url.searchParams.get('area')).toBe('vocational');
 expect(url.searchParams.get('mode')).toBe('blended');
 expect(url.searchParams.get('level')).toBe('short');
 await expect(page.getByText('Your selected study interest')).toBeVisible();
 await expect(page.getByLabel('Message *')).toHaveValue(/Vocational, SIA and CPD enquiries/);
 await page.evaluate(()=>{document.documentElement.style.fontSize='24px';});
 for(const width of [360,390,768,1440]){
  await page.setViewportSize({width,height:860});
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 }
});

test('qualification cards preserve the chosen title during an enquiry',async({context,page})=>{
 await context.route('https://unipathway-browser-ci.invalid/**',route=>route.fulfill({
  status:200,headers:{'access-control-allow-origin':'*','content-type':'application/json'},body:'[]',
 }));
 await page.setViewportSize({width:390,height:844});
 await page.goto('/qualifications?body=OTHM&level=4&q=business');
 const cookie=page.getByRole('dialog',{name:'Cookie preferences'});
 if(await cookie.isVisible())await cookie.getByRole('button',{name:'Reject all'}).click();
 const link=page.getByRole('link',{name:'Enquire about this pathway'}).first();
 await expect(link).toBeVisible();
 await link.click();
 await expect(page).toHaveURL(/\/tenant\/unipathway\/contact\?/);
 const parsed=new URL(page.url());
 expect(parsed.searchParams.get('course')).toContain('OTHM');
 expect(parsed.searchParams.get('course')).toContain('Business');
 await expect(page.getByLabel('Message *')).toHaveValue(/OTHM.*Business/);
});

test('study and qualification search match terms in any order on mobile',async({context,page})=>{
 await context.route('https://unipathway-browser-ci.invalid/**',route=>route.fulfill({
  status:200,headers:{'access-control-allow-origin':'*','content-type':'application/json'},body:'[]',
 }));
 await page.setViewportSize({width:375,height:812});
 await page.goto('/study?q=Python%20machine');
 const cookie=page.getByRole('dialog',{name:'Cookie preferences'});
 if(await cookie.isVisible())await cookie.getByRole('button',{name:'Reject all'}).click();
 await expect(page.getByRole('heading',{name:'AI, coding and cyber skills'})).toBeVisible();
 await page.goto('/qualifications?body=OTHM&q=Management%20Business');
 const cards=page.getByRole('region',{name:'Proposed qualifications'}).getByRole('article');
 await expect(cards.first()).toBeVisible();
 await expect(cards.first()).toContainText('Business');
});
