import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/tmp/uni-chromium',headless:true,args:['--no-sandbox']});
try{
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});const page=await context.newPage();let progress=[];
 page.on('pageerror',e=>console.log('Page error:',e.message));
 const user={id:'00000000-0000-4000-8000-000000000001',aud:'authenticated',role:'authenticated',email:'synthetic@unipathway.pk',app_metadata:{provider:'email'},user_metadata:{},created_at:'2026-01-01T00:00:00Z'};
 const tenant='00000000-0000-4000-8000-000000000002',module='00000000-0000-4000-8000-000000000003';
 const lessons=Array.from({length:12},(_,i)=>({id:'lesson-'+i,module_id:module,tenant_id:tenant,title:i===0?'Introduction to academic writing':`Practice activity ${i+1}`,body:'Start with a clear topic sentence. Read the example, identify its main point, then write a short paragraph in your own words.\n\nCheck your paragraph for a clear idea, supporting evidence and a concluding sentence.',position:i+1,video_url:null,resource_url:null,transcript:'In this lesson, we explain how to structure a paragraph and support it with evidence.',status:'published',revision:1}));
 await context.addInitScript(({user})=>{
  const token=btoa(JSON.stringify({alg:'HS256',typ:'JWT'}))+'.'+btoa(JSON.stringify({sub:user.id,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600}))+'.synthetic';
  localStorage.setItem('sb-unipathway-browser-ci-auth-token',JSON.stringify({access_token:token,refresh_token:'synthetic',token_type:'bearer',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,user}));
 },{user});
 await context.route('https://unipathway-browser-ci.invalid/**',async route=>{
  const r=route.request(),url=new URL(r.url());let data=[];
  if(url.pathname.includes('/profiles'))data={full_name:'Synthetic learner',tenant_id:tenant};
  else if(url.pathname.includes('/user_roles'))data=[{role:'student'}];
  else if(url.pathname.endsWith('/unipathway_lessons'))data=lessons;
  else if(url.pathname.endsWith('/unipathway_lesson_progress')){
   if(['POST','PATCH'].includes(r.method())){const row=r.postDataJSON();progress=[row];data=[{lesson_id:row.lesson_id}];}
   else data=url.searchParams.has('lesson_id')&&!url.searchParams.get('lesson_id').startsWith('in.')?progress[0]||null:progress;
  }
  else if(url.pathname.endsWith('/auth/v1/user'))data=user;
  else if(url.pathname.includes('/rpc/'))data=null;
  await route.fulfill({status:200,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','content-type':'application/json'},body:JSON.stringify(data)});
 });
 for(let i=0;i<30;i++){try{await page.goto(`http://127.0.0.1:8080/student/lessons?module=${module}`);break;}catch(e){if(i===29)throw e;await new Promise(r=>setTimeout(r,250));}}
 await page.getByRole('heading',{name:'Introduction to academic writing'}).waitFor({timeout:15000}).catch(async e=>{console.log('Visible state:',page.url(),(await page.locator('body').innerText()).slice(0,1400));throw e;});
 await page.getByRole('button',{name:'Reject all',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('aside[aria-label="Dashboard navigation"]')?.getBoundingClientRect().right<=1);
 assert.equal(await page.getByLabel('Choose lesson').isVisible(),true);
 assert.equal(await page.getByRole('navigation',{name:'Lesson sequence'}).isVisible(),false);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
 await page.screenshot({path:'/tmp/learning-mobile.png',fullPage:true});
 await page.locator('summary').filter({hasText:'Study without internet'}).click();
 await page.getByRole('button',{name:'Save text pack on this device'}).click();
 await page.getByText('Text pack saved for 24 hours.',{exact:false}).waitFor();
 await context.setOffline(true);
 await page.getByText('Offline · saved text only',{exact:false}).waitFor();
 await page.getByRole('button',{name:'Mark as completed',exact:true}).click();
 await page.getByText('Saved on this device · waiting to sync',{exact:true}).waitFor();
 await context.setOffline(false);
 await page.getByText('1 saved progress update synced.',{exact:true}).waitFor();
 assert.equal(progress[0]?.completed,true);
 await page.setViewportSize({width:1440,height:1000});
 assert.equal(await page.getByRole('navigation',{name:'Lesson sequence'}).isVisible(),true);
 assert.equal(await page.getByLabel('Choose lesson').isVisible(),false);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
 await page.locator('summary').filter({hasText:'Study without internet'}).click();
 await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
 await page.waitForFunction(()=>document.querySelector('aside[aria-label="Dashboard navigation"]')?.getBoundingClientRect().left===0);
 await page.screenshot({path:'/tmp/learning-desktop.png',fullPage:true});
 console.log('Mobile 390px and desktop 1440px: no horizontal overflow; focused lesson navigation; save text → offline completion → reconnect → server sync verified with synthetic backend');
}finally{await browser.close();}
