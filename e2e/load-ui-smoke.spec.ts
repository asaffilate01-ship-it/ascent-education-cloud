import {test,expect} from '@playwright/test';
test.describe('browser resilience smoke',()=>{test('public app survives repeated navigation',async({page})=>{for(let i=0;i<20;i++){await page.goto(i%2===0?'/':'/courses');await expect(page.locator('body')).toBeVisible()}})});
