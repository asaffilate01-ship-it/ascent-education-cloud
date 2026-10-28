import {chromium} from '@playwright/test';import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox']});
try{
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});let page=await context.newPage();const errors=[];context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));page.on('pageerror',e=>errors.push(e.message));
 const user={id:'00000000-0000-4000-8000-000000000001',aud:'authenticated',role:'authenticated',email:'synthetic@unipathway.pk',app_metadata:{provider:'email'},user_metadata:{},created_at:'2026-01-01T00:00:00Z'};
 const tenant='00000000-0000-4000-8000-000000000002',module='00000000-0000-4000-8000-000000000003';
 const lessons=[{id:'lesson',module_id:module,tenant_id:tenant,title:'Offline academic writing',body:'Start with a clear topic sentence. Use supporting evidence and explain the conclusion.',position:1,video_url:null,resource_url:null,transcript:'A synthetic teacher transcript.',status:'published',revision:1}];let progress=[];let requests=0;
 const material={id:'material',tenant_id:tenant,module_id:module,title:'Offline worksheet',kind:'reading',object_path:`${tenant}/${module}/worksheet.pdf`,publication_status:'published',available_at:null,created_at:'2026-10-26T00:00:00Z'};
 await context.addInitScript(({user})=>{if(window.top!==window.self||location.origin!=='http://127.0.0.1:8080')return;if(!localStorage.getItem('sb-unipathway-browser-ci-auth-token')){const token=btoa(JSON.stringify({alg:'HS256',typ:'JWT'}))+'.'+btoa(JSON.stringify({sub:user.id,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600}))+'.synthetic';localStorage.setItem('sb-unipathway-browser-ci-auth-token',JSON.stringify({access_token:token,refresh_token:'synthetic',token_type:'bearer',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,user}));}},{user});
 await context.route('https://unipathway-browser-ci.invalid/**',async route=>{requests++;const r=route.request(),url=new URL(r.url()),name=url.pathname.split('/').at(-1);let data=[];
  if(name==='profiles')data={full_name:'Synthetic learner',tenant_id:tenant};else if(name==='user_roles')data=[{role:'student'}];else if(name==='modules')data=[{id:module,tenant_id:tenant,title:'Academic writing',programme_id:'programme',lecturer_id:'teacher'}];else if(name==='student_enrolments')data=[{id:'enrolment',tenant_id:tenant,student_id:user.id,status:'active',programme_id:'programme'}];
  else if(name==='unipathway_module_materials')data=url.searchParams.has('id')?material:[material];
  else if(url.pathname.includes('/storage/v1/object/sign/')){if(r.method()==='POST')data={signedURL:'/object/sign/unipathway-module-materials/'+material.object_path+'?token=synthetic'};else return route.fulfill({status:200,contentType:'application/pdf',body:'%PDF-1.4\nSynthetic worksheet'});}
  else if(name==='unipathway_lessons')data=lessons;
  else if(name==='unipathway_lesson_progress'){if(['POST','PATCH'].includes(r.method())){progress=[r.postDataJSON()];data=[{lesson_id:'lesson'}];}else data=url.searchParams.get('lesson_id')?.startsWith('eq.')?progress[0]||null:progress;}
  else if(url.pathname.endsWith('/auth/v1/user'))data=user;else if(url.pathname.includes('/rpc/'))data=null;
  await route.fulfill({status:200,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','content-type':'application/json'},body:JSON.stringify(data)});
 });
 const base='http://127.0.0.1:8080';
 for(let i=0;i<30;i++){try{await page.goto(`${base}/student/lessons?module=${module}`);break;}catch(e){if(i===29)throw e;await new Promise(r=>setTimeout(r,250));}}
 await page.getByRole('heading',{name:'Offline academic writing',exact:true}).waitFor({timeout:30000});
 if(await page.getByRole('button',{name:'Reject all',exact:true}).count())await page.getByRole('button',{name:'Reject all',exact:true}).click();
 await page.getByText(/Study without internet ·/).click();await page.getByRole('button',{name:'Save text pack on this device',exact:true}).click();await page.getByText('Text pack saved for 24 hours. Use your own device; remove it when finished.',{exact:true}).waitFor();
 await page.waitForFunction(()=>document.querySelector('aside[aria-label="Dashboard navigation"]')?.getBoundingClientRect().right<=1);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
 await page.goto(`${base}/student/materials?module=${module}`);await page.getByRole('heading',{name:'Offline worksheet'}).waitFor();page.on('dialog',d=>d.accept());await page.getByRole('button',{name:'Save offline',exact:true}).click();await page.getByText('File saved for 24 hours. Open Saved learning to use it offline.',{exact:true}).waitFor();
 await page.close();await context.setOffline(true);page=await context.newPage();const before=requests;
 await page.goto(`${base}/student/never-visited-before`);await page.getByRole('heading',{name:'Saved learning',exact:true}).waitFor({timeout:30000});await page.getByRole('heading',{name:'Offline academic writing',exact:true}).waitFor();assert.equal(requests,before,'cold offline reader must not call backend');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.getByRole('button',{name:'Mark as completed',exact:true}).click();await page.getByText('Completed on this device. Sign in online and sync to update your course.',{exact:true}).waitFor();
 await page.getByRole('button',{name:'View saved file',exact:true}).click();await page.getByRole('link',{name:'Download saved file to device'}).waitFor();await page.screenshot({path:'/tmp/offline-restart-mobile.png',fullPage:true});
 await page.reload();await page.getByRole('button',{name:'Completed on this device',exact:true}).waitFor();
 await page.getByLabel('Search saved learning',{exact:true}).fill('no matching title');await page.getByText(/No saved learning matches/).waitFor();
 await page.getByRole('button',{name:'Clear filters',exact:true}).click();await page.getByRole('heading',{name:'Offline academic writing',exact:true}).waitFor();
 await page.getByLabel('Availability',{exact:true}).selectOption('available');await page.getByRole('button',{name:'View saved file',exact:true}).waitFor();
 await page.getByRole('button',{name:'Clear filters',exact:true}).click();
 // Expire just the file in real IndexedDB; the pending lesson completion must survive cleanup.
 await page.evaluate(()=>new Promise((resolve,reject)=>{const r=indexedDB.open('unipathway-lesson-packs',2);r.onsuccess=()=>{const db=r.result,tx=db.transaction('materials','readwrite'),store=tx.objectStore('materials'),q=store.openCursor();q.onsuccess=()=>{const c=q.result;if(c){c.update({...c.value,expiresAt:Date.now()-1});c.continue();}};tx.oncomplete=()=>{db.close();resolve(true);};tx.onerror=()=>reject(tx.error);};r.onerror=()=>reject(r.error);}));
 await page.reload();page.on('dialog',d=>d.accept());await page.getByRole('button',{name:'Remove expired copies',exact:true}).click();
 await page.getByText(/1 expired copies removed/).waitFor();assert.equal(await page.getByRole('button',{name:'View saved file',exact:true}).count(),0);
 await page.getByRole('button',{name:'Completed on this device',exact:true}).waitFor();

 await page.setViewportSize({width:1440,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await context.setOffline(false);await page.getByRole('link',{name:'Sign in online to sync',exact:true}).click();await page.getByRole('button',{name:'Sync and check all saved learning',exact:true}).waitFor();await page.getByText('1 updates synced. 0 obsolete updates and 0 unavailable files removed.',{exact:true}).waitFor();assert.equal(progress[0].completed,true);
 await page.goto(`${base}/offline.html`);await page.getByRole('heading',{name:'Offline academic writing',exact:true}).waitFor();const other=await context.newPage();await other.goto(`${base}/offline.html`);await other.evaluate(()=>localStorage.removeItem('unipathway-learning-owner'));await page.getByText(/No current offline access is saved/).waitFor();assert.equal(await page.getByRole('heading',{name:'Offline academic writing',exact:true}).count(),0);
 assert.equal(errors.length,0,errors.join('\n'));console.log('Production service worker: cold offline navigation, reload, saved private PDF, queued completion, authenticated reconnect sync, cross-tab account removal, search/filters, expired-file cleanup preserving queued work and mobile/desktop layout passed. Synthetic API only.');
}finally{await browser.close();}
