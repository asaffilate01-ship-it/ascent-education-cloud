import {expect,test} from '@playwright/test';

test('public page boots in a clean synthetic CI browser',async({page})=>{
 test.setTimeout(65_000);
 const errors:string[]=[];
 page.on('pageerror',error=>{errors.push(error.stack||error.message);console.error('[startup pageerror]',error.stack||error.message);});
 page.on('console',message=>{if(message.type()==='error'&&!message.text().includes('unipathway-browser-ci.invalid'))console.error('[startup console]',message.text().slice(0,1000));});
 page.on('response',response=>{if(response.status()>=500)console.error('[startup http]',response.status(),response.url());});
 const response=await page.goto('/',{waitUntil:'domcontentloaded',timeout:20_000});
 console.log('[startup http status]',response?.status()||'no response');
 await expect.poll(async()=>{const content=await page.locator('body').innerText().catch(()=>null);return content?.trim().length||0;},{timeout:45_000}).toBeGreaterThan(80);
 console.log('[startup page body]',(await page.locator('body').innerText()).slice(0,500));
 expect(errors,'An uncaught JavaScript startup error prevented app initialization').toEqual([]);
});
