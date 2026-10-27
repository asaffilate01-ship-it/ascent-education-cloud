import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox']});
try{
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 const user={id:'00000000-0000-4000-8000-000000000001',aud:'authenticated',role:'authenticated',email:'synthetic@unipathway.pk',app_metadata:{provider:'email'},user_metadata:{},created_at:'2026-01-01T00:00:00Z'},tenant='00000000-0000-4000-8000-000000000002';
 await context.addInitScript(({user})=>{const token=btoa(JSON.stringify({alg:'HS256',typ:'JWT'}))+'.'+btoa(JSON.stringify({sub:user.id,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600}))+'.synthetic';localStorage.setItem('sb-unipathway-browser-ci-auth-token',JSON.stringify({access_token:token,refresh_token:'synthetic',token_type:'bearer',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,user}));},{user});
 const tables={modules:[{id:'math',title:'Mathematics',code:'MATH01',tenant_id:tenant,programme_id:'programme',lecturer_id:'teacher'}],student_enrolments:[{id:'enrolment',student_id:user.id,tenant_id:tenant,programme_id:'programme',status:'active'}],unipathway_lessons:[{id:'lesson',module_id:'math',tenant_id:tenant,title:'Algebra equations',body:'Read the equation and explain each step in your own words.',status:'published',position:1,revision:1,transcript:'',video_url:null,resource_url:null}],unipathway_module_materials:[{id:'file',module_id:'math',tenant_id:tenant,title:'Algebra worksheet',publication_status:'published',available_at:null,kind:'worksheet',object_path:'private/file',created_at:'2026-01-01'},{id:'other',module_id:'math',tenant_id:tenant,title:'Reading guide',publication_status:'published',available_at:null,kind:'reading',object_path:'private/other',created_at:'2026-01-01'}]};
 const writes=[];
 await context.route('https://unipathway-browser-ci.invalid/**',async route=>{
  const request=route.request(),url=new URL(request.url()),name=url.pathname.split('/').at(-1);let data=tables[name]||[];
  if(!['GET','HEAD','OPTIONS'].includes(request.method()))writes.push(url.pathname);
  if(name==='profiles')data={full_name:'Synthetic student',tenant_id:tenant};else if(name==='user_roles')data=[{role:'student'}];else if(url.pathname.endsWith('/auth/v1/user'))data=user;
  else if(tables[name]){for(const [key,value] of url.searchParams){if(value.startsWith('eq.'))data=data.filter(r=>String(r[key])===value.slice(3));if(value.startsWith('ilike.'))data=data.filter(r=>String(r[key]).toLowerCase().includes(value.slice(6,-1).replace(/^%/, '').toLowerCase()));if(value.startsWith('in.('))data=data.filter(r=>value.slice(4,-1).split(',').includes(String(r[key])));}}
  await route.fulfill({status:200,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','content-type':'application/json'},body:JSON.stringify(data)});
 });
 await page.goto('http://127.0.0.1:8080/student/materials?module=math');await page.getByRole('heading',{name:'Algebra worksheet',exact:true}).waitFor();
 if(await page.getByRole('button',{name:'Reject all',exact:true}).count())await page.getByRole('button',{name:'Reject all',exact:true}).click();
 await page.keyboard.press('Control+k');await page.getByRole('combobox',{name:'Search your workspace'}).fill('algebra');
 await page.getByRole('option',{name:/Algebra worksheet/}).waitFor();await page.getByRole('option',{name:/Algebra equations/}).waitFor();
 for(const width of [390,1440]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:`/tmp/workspace-search-${width}.png`,fullPage:true});}
 await page.getByRole('option',{name:/Algebra worksheet/}).click();await page.waitForURL('**/student/materials?module=math&material=file');await page.getByRole('heading',{name:'Algebra worksheet',exact:true}).waitFor();assert.equal(await page.getByRole('heading',{name:'Reading guide',exact:true}).count(),0);
 await page.getByText('Show all module materials',{exact:true}).click();await page.getByRole('heading',{name:'Reading guide',exact:true}).waitFor();
 await page.keyboard.press('Control+k');await page.getByRole('combobox',{name:'Search your workspace'}).fill('equations');await page.getByRole('option',{name:/Algebra equations/}).waitFor();await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');await page.waitForURL('**/student/lessons?module=math&lesson=lesson');await page.getByText('Read the equation and explain each step in your own words.',{exact:true}).waitFor();
 assert.deepEqual(writes.filter(path=>!['/rest/v1/rpc/ensure_my_account','/rest/v1/consent_records'].includes(path)),[],JSON.stringify(writes));assert.equal(errors.length,0,errors.join('\n'));console.log('Workspace search: mobile/desktop, course-scoped material and lesson navigation, no search writes or browser errors.');
}finally{await browser.close();}
