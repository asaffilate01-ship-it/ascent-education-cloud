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
