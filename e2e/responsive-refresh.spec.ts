import {test,expect} from '@playwright/test';
for(const width of [360,768,1440])test(`public learning routes fit ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});
 for(const route of ['/','/tech-academy','/finance-academy','/german-preparation','/beauty-aesthetics','/login']){
  await page.goto(route);await expect(page.locator('main').first()).toBeAttached();
  const consent=page.getByRole('button',{name:'Reject all',exact:true});if(await consent.isVisible())await consent.click();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  if(route==='/'){await page.getByRole('button',{name:'Languages',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'2 matching learning areas'})).toBeVisible();}
 }
});
test('mobile menu has no competing bottom tabs and closes with Escape',async({page})=>{
 await page.setViewportSize({width:360,height:900});await page.goto('/');
 const consent=page.getByRole('button',{name:'Reject all',exact:true});if(await consent.isVisible())await consent.click();
 await page.getByRole('button',{name:'Open menu'}).click();await expect(page.getByRole('navigation',{name:'Quick navigation'})).toHaveCount(0);
 await page.getByLabel('Find a course or service').fill('Python');await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Open menu'})).toBeVisible();
});
