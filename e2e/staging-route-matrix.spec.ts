import {test,expect} from '@playwright/test';
const publicRoutes=['/','/courses','/about','/contact','/login','/register','/privacy','/terms','/cookies','/disclaimer','/verify'];
for(const route of publicRoutes)test(`public route ${route} renders without fatal page`,async({page})=>{const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(route);await page.waitForLoadState('domcontentloaded');await expect(page.locator('body')).toBeVisible();expect(errors).toEqual([])});
const protectedRoutes=['/student','/lecturer','/director','/landlord','/finance','/qa','/admissions'];
for(const route of protectedRoutes)test(`anonymous cannot remain on ${route}`,async({page})=>{await page.goto(route);await page.waitForLoadState('domcontentloaded');expect(new URL(page.url()).pathname).not.toBe(route)});
