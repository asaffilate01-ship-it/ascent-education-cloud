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

test('ATHE titles have official sources and preserve programme filters on narrow screens',async({context,page})=>{
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
 await expect(cards.first().getByRole('link',{name:/Check official qualification listing/})).toHaveAttribute('href',/^https:\/\/athe\.co\.uk\/qualifications\/athe-/);
 await expect(cards.first().getByRole('link',{name:'Enquire about this pathway'})).toHaveAttribute('href',/course=ATHE/);
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
