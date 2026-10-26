import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox']});
try{
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const user={id:'00000000-0000-4000-8000-000000000001',aud:'authenticated',role:'authenticated',email:'synthetic@unipathway.pk',app_metadata:{provider:'email'},user_metadata:{},created_at:'2026-01-01T00:00:00Z'};
 const tenant='00000000-0000-4000-8000-000000000002';
 await context.addInitScript(({user})=>{const token=btoa(JSON.stringify({alg:'HS256',typ:'JWT'}))+'.'+btoa(JSON.stringify({sub:user.id,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600}))+'.synthetic';localStorage.setItem('sb-unipathway-browser-ci-auth-token',JSON.stringify({access_token:token,refresh_token:'synthetic',token_type:'bearer',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,user}));},{user});

 const tables={applications:[{id:'app',student_name:'Synthetic applicant',email:'applicant@example.invalid',stage:'unconditional_offer',programme_name:'Approved programme',updated_at:new Date().toISOString(),source:'website'}]};
 await context.route('https://unipathway-browser-ci.invalid/**',async route=>{const url=new URL(route.request().url()),name=url.pathname.split('/').at(-1);let data=tables[name]||[];
 if(name==='profiles')data={full_name:'Synthetic director',tenant_id:tenant};else if(name==='user_roles')data=[{role:'centre_director'}];else if(url.pathname.endsWith('/auth/v1/user'))data=user;else if(url.pathname.includes('/rpc/'))data=null;
 await route.fulfill({status:200,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','content-type':'application/json'},body:JSON.stringify(data)});});
 await page.goto('http://127.0.0.1:8080/director/admissions');await page.getByRole('region',{name:'Application task cards'}).waitFor({timeout:20000});
 if(await page.getByRole('button',{name:'Reject all',exact:true}).count())await page.getByRole('button',{name:'Reject all',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('aside[aria-label="Dashboard navigation"]')?.getBoundingClientRect().right<=1);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.getByLabel('Search applications').fill('no match');await page.getByRole('region',{name:'Application task cards'}).getByText('No applications match your filters.').waitFor();
 await page.getByLabel('Search applications').fill('Synthetic');await page.getByRole('region',{name:'Application task cards'}).getByRole('heading',{name:'Synthetic applicant'}).waitFor();await page.screenshot({path:'/tmp/admissions-mobile.png',fullPage:true});
 await page.setViewportSize({width:1440,height:1000});await page.waitForFunction(()=>document.querySelector('aside[aria-label="Dashboard navigation"]')?.getBoundingClientRect().left===0);await page.getByRole('table').waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.goto('http://127.0.0.1:8080/director/readiness');await page.getByText(/Missing baseline checks:/).waitFor();await page.getByText('Implementation and connection guide · 14 areas',{exact:true}).click();await page.getByRole('heading',{name:'NADRA and CCTV',exact:true}).waitFor();await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>document.querySelector('aside[aria-label="Dashboard navigation"]')?.getBoundingClientRect().right<=1);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.equal(errors.length,0,errors.join('\n'));
 console.log('Admissions/readiness mobile and desktop passed: no overflow, application search works, empty readiness fails closed; synthetic backend only.');
}finally{await browser.close();}
