import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
for (const width of [375,1440]) test(`qualification stages and filters are accessible at ${width}px`,async({context,page})=>{
 await context.route('https://unipathway-browser-ci.invalid/**',route=>route.fulfill({status:200,headers:{'access-control-allow-origin':'*','content-type':'application/json'},body:'[]'}));
 await page.setViewportSize({width,height:900});await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/qualifications?level=3');
 await expect(page.getByRole('heading',{name:'From Level 3 to postgraduate study'})).toBeVisible();
 const consent=page.getByRole('dialog',{name:'Cookie preferences'});if(await consent.isVisible())await consent.getByRole('button',{name:'Reject all'}).click();
 await expect(page.getByRole('combobox',{name:'Qualification level'})).toHaveValue('3');
 await page.getByRole('combobox',{name:'Qualification level'}).selectOption('5');
 await expect(page).toHaveURL(/level=5/);
 const results=await new AxeBuilder({page}).include('main').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
 expect(results.violations).toEqual([]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('ATHE planned titles preserve programme filters and registration context on narrow screens',async({context,page})=>{
 // This test covers catalogue reflow, not the separately tested cookie dialogue.
 // Set an explicit essential-only preference before first app hydration so the
 // consent banner cannot appear after a one-time visibility check and obscure layout.
 await context.addInitScript(()=>{
  localStorage.setItem('cookie_consent_v2',JSON.stringify({
    essential:true,analytics:false,marketing:false,timestamp:'2026-11-10T00:00:00.000Z',
  }));
 });
 await context.route('https://unipathway-browser-ci.invalid/**',route=>route.fulfill({status:200,headers:{'access-control-allow-origin':'*','content-type':'application/json'},body:'[]'}));
 await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/qualifications?level=4');
 const consent=page.getByRole('dialog',{name:'Cookie preferences'});
 if(await consent.isVisible())await consent.getByRole('button',{name:'Reject all'}).click();
 await page.getByRole('button',{name:'ATHE',exact:true}).click();
 await expect(page).toHaveURL(/body=ATHE/);
 await expect(page.getByRole('combobox',{name:'Qualification level'})).toHaveValue('4');
 const cards=page.getByRole('region',{name:'Proposed qualifications'}).getByRole('article');
 await expect(cards).toHaveCount(2);
 await expect(cards.first().getByText('Phase 2 · Future intake / register interest')).toBeVisible();
 const title=await cards.first().getByRole('heading',{level:2,name:/^Level 4 /}).innerText();
 const enquiry=cards.first().getByRole('link',{name:'Register interest for a future intake'});
 const url=new URL(await enquiry.getAttribute('href')||'',page.url());
 expect(url.pathname).toBe('/apply');
 expect(url.searchParams.get('area')).toBe('qualifications');
 expect(url.searchParams.get('course')).toBe(`ATHE ${title}`);
 await page.evaluate(()=>{document.documentElement.style.fontSize='32px';});
 for(const width of [360,390,768,1440]){
  await page.setViewportSize({width,height:1000});
  await expect.poll(()=>page.evaluate(()=>{
    const width=innerWidth,scroll=document.documentElement.scrollWidth;
    if(scroll<=width)return 'fits';
    const overflows=Array.from(document.querySelectorAll('main *')).filter(element=>{
      const rect=element.getBoundingClientRect();
      return rect.width>0&&(rect.right>width+1||rect.left< -1)&&getComputedStyle(element).visibility!=='hidden';
    }).slice(0,8).map(el=>({tag:el.tagName,css:el.className?.toString().slice(0,110),text:el.textContent?.trim().slice(0,70),right:Math.round(el.getBoundingClientRect().right)}));
    return JSON.stringify({width,scroll,overflows});
  })).toBe('fits');
 }
});

test('2027 launch and recruitment separate preparation from planned regulated qualifications',async({context,page})=>{
 await context.addInitScript(()=>localStorage.setItem('cookie_consent_v2',JSON.stringify({essential:true,analytics:false,marketing:false,timestamp:'2026-11-27T00:00:00.000Z'})));
 await context.route('https://unipathway-browser-ci.invalid/**',route=>route.fulfill({status:200,headers:{'access-control-allow-origin':'*','content-type':'application/json'},body:'[]'}));
 await page.setViewportSize({width:390,height:844});
 await page.goto('/');
 const launch=page.getByRole('region',{name:'Your January 2027 study options'});
 await expect(launch).toContainText('Classes 9–12 tuition');
 await expect(launch).toContainText('ACCA exam preparation');
 await expect(launch).toContainText('AI, coding, cloud computing and databases');
 await expect(launch.getByRole('heading',{name:'Build towards a university degree'})).toBeVisible();
 await page.goto('/teach-with-us');
 await expect(page.getByRole('heading',{name:'January 2027 and later intakes'})).toBeVisible();
 await expect(page.getByRole('region',{name:'January 2027 and later intakes'})).toContainText('All teaching is part-time');
 await expect(page.getByRole('link',{name:'jobs@unipathway.pk',exact:true}).first()).toHaveAttribute('href','mailto:jobs@unipathway.pk');
 for(const width of [360,390,768,1440]){
  await page.setViewportSize({width,height:900});
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 }
 await page.goto('/international-study');
 const visa=page.getByRole('region',{name:'Explore study, work and family routes worldwide'});
 await expect(visa).toBeVisible();
 await expect(visa.getByRole('heading',{name:'Marriage, spouse and family'})).toBeVisible();
 const family=visa.getByRole('article').filter({has:page.getByRole('heading',{name:'Marriage, spouse and family',exact:true})});
 await expect(family.getByRole('link',{name:'Request information'})).toHaveAttribute('href','/contact?advice=family-visa#contact-form');
});
