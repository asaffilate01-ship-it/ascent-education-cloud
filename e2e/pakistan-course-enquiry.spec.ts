import {test,expect} from '@playwright/test';
import {dismissConsent,inspectLayouts} from './support/layoutEvidence';

test('Pakistan course selection retains study interest through mobile enquiry flow',async({context,page})=>{
 await context.route('https://unipathway-browser-ci.invalid/**',route=>route.fulfill({
  status:200,headers:{'access-control-allow-origin':'*','content-type':'application/json'},body:'[]',
 }));
 await page.setViewportSize({width:375,height:812});
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/apply');
 await dismissConsent(page);
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
 await dismissConsent(page);
 const link=page.getByRole('link',{name:'Review study options & enquire'}).first();
 await expect(link).toBeVisible();
 await link.click();
 await expect(page).toHaveURL(/\/apply\?/);
 await expect(page.getByText('Selected qualification',{exact:true})).toBeVisible();
 await page.getByLabel('Preferred study format').selectOption('online');
 await page.getByRole('button',{name:'Continue to course enquiry'}).click();
 await expect(page).toHaveURL(/\/tenant\/unipathway\/contact\?/);
 const parsed=new URL(page.url());
 expect(parsed.searchParams.get('course')).toContain('OTHM');
 expect(parsed.searchParams.get('course')).toContain('Business');
 await expect(page.getByLabel('Message *')).toHaveValue(/OTHM.*Business/);
 await expect(page.getByRole('heading',{name:'Review your course enquiry'})).toBeVisible();
 await page.getByRole('link',{name:'Change study choices'}).click();
 await expect(page.getByLabel('Preferred level')).toHaveValue('level-4');
 await expect(page.getByLabel('Preferred study format')).toHaveValue('online');
 await expect(page.getByLabel('Preferred level')).toBeDisabled();
 await expect(page.getByText(parsed.searchParams.get('course')!,{exact:true})).toBeVisible();
});

test('study and qualification search match terms in any order on mobile',async({context,page})=>{
 await context.route('https://unipathway-browser-ci.invalid/**',route=>route.fulfill({
  status:200,headers:{'access-control-allow-origin':'*','content-type':'application/json'},body:'[]',
 }));
 await page.setViewportSize({width:375,height:812});
 await page.goto('/study?q=Python%20machine');
 await dismissConsent(page);
 await expect(page.getByRole('heading',{name:'AI, coding and cyber skills'})).toBeVisible();
 await page.goto('/qualifications?body=OTHM&q=Management%20Business');
 const cards=page.getByRole('region',{name:'Proposed qualifications'}).getByRole('article');
 await expect(cards.first()).toBeVisible();
 await expect(cards.first()).toContainText('Business');
});

test('selected qualification review and edit keep context across responsive layouts',async({context,page},info)=>{
 test.setTimeout(90_000);
 await context.route('https://unipathway-browser-ci.invalid/**',route=>route.fulfill({
  status:200,headers:{'access-control-allow-origin':'*','content-type':'application/json'},body:'[]',
 }));
 await page.emulateMedia({reducedMotion:'reduce'});
 const title='OTHM Level 4 Diploma in Business Management';
 const selection=new URLSearchParams({area:'qualifications',course:title,level:'level-4',mode:'online'});
 await page.goto('/apply?'+selection);
 await dismissConsent(page);
 await expect(page.getByText(title,{exact:true})).toBeVisible();
 await expect(page.getByLabel('Preferred level')).toBeDisabled();
 await page.getByRole('button',{name:'Continue to course enquiry'}).click();
 await expect(page.getByRole('heading',{name:'Review your course enquiry'})).toBeVisible();
 await expect(page.getByLabel('Message *')).toHaveValue(/OTHM Level 4 Diploma in Business Management/);
 await inspectLayouts(page,info,'course-enquiry-review');
 // Enlarged mobile labels must wrap at words, not into vertical letter fragments.
 await page.setViewportSize({width:360,height:1000});
 const submitLabel=page.getByRole('button',{name:'Send Message'}).locator('span');
 await expect.poll(()=>submitLabel.evaluate(node=>{
  const style=getComputedStyle(node);
  return node.getBoundingClientRect().height/parseFloat(style.lineHeight);
 })).toBeLessThanOrEqual(2.1);
 const edit=page.getByRole('link',{name:'Change study choices'});
 await edit.focus();
 await expect(edit).toBeFocused();
 await page.keyboard.press('Enter');
 await expect(page.getByLabel('Preferred study format')).toHaveValue('online');
 await expect(page.getByLabel('Preferred level')).toHaveValue('level-4');
 await expect(page.getByText(title,{exact:true})).toBeVisible();
 await page.evaluate(()=>{document.documentElement.classList.remove('dark');document.documentElement.style.fontSize='';});
 await inspectLayouts(page,info,'course-enquiry-edit');
});
