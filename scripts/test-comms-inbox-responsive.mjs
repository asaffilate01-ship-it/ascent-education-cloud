import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox']});
try{
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 const user={id:'00000000-0000-4000-8000-000000000001',aud:'authenticated',role:'authenticated',email:'synthetic@unipathway.pk',app_metadata:{provider:'email'},user_metadata:{},created_at:'2026-01-01T00:00:00Z'},tenant='00000000-0000-4000-8000-000000000002';
 await context.addInitScript(({user})=>{const token=btoa(JSON.stringify({alg:'HS256',typ:'JWT'}))+'.'+btoa(JSON.stringify({sub:user.id,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600}))+'.synthetic';localStorage.setItem('sb-unipathway-browser-ci-auth-token',JSON.stringify({access_token:token,refresh_token:'synthetic',token_type:'bearer',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,user}));},{user});
 const tables={uni_mailboxes:[{id:'box',tenant_id:tenant,address:'admissions@unipathway.pk',enabled:false,provider:'imap'}],uni_mail_threads:Array.from({length:301},(_,i)=>({id:`thread-${String(i).padStart(3,'0')}`,mailbox_id:'box',subject:`Correspondence ${i}`,status:'todo',priority:'normal',assigned_to:i===300?user.id:null,updated_at:'2026-01-01',created_at:'2026-01-01',due_at:i===300?'2020-01-01':null})),uni_mail_messages:[{id:'message',thread_id:'thread-300',from_address:'learner@unipathway.pk',to_addresses:['admissions@unipathway.pk'],body_text:'Synthetic learner requests a timetable update.',state:'imported',direction:'inbound',created_at:'2026-01-01'}]};
 const writes=[];
 await context.route('https://unipathway-browser-ci.invalid/**',async route=>{
  const request=route.request(),url=new URL(request.url()),name=url.pathname.split('/').at(-1);let data=tables[name]||[];
  if(!['GET','HEAD','OPTIONS'].includes(request.method()))writes.push(url.pathname);
  if(name==='profiles')data={full_name:'Synthetic mailbox member',tenant_id:tenant};else if(name==='user_roles')data=[{role:'student'}];else if(url.pathname.endsWith('/auth/v1/user'))data=user;
  else if(name==='uni_mail_member_directory')data=[{mailbox_id:'box',user_id:user.id,can_send:true,full_name:'Synthetic member'}];
  else if(tables[name]){
   for(const [key,value] of url.searchParams){if(value.startsWith('eq.'))data=data.filter(r=>String(r[key])===value.slice(3));if(value.startsWith('in.('))data=data.filter(r=>value.slice(4,-1).split(',').includes(String(r[key])));}
   const offset=Number(url.searchParams.get('offset')||0),limit=Number(url.searchParams.get('limit')||1000);data=data.slice(offset,offset+limit);
  }
  await route.fulfill({status:200,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','content-type':'application/json'},body:JSON.stringify(data)});
 });
 await page.goto('http://127.0.0.1:8080/communications');await page.getByText('301 matching conversations',{exact:true}).waitFor();
 if(await page.getByRole('button',{name:'Reject all',exact:true}).count())await page.getByRole('button',{name:'Reject all',exact:true}).click();
 await page.getByLabel('Search correspondence').fill('Correspondence 300');await page.getByRole('button',{name:/Correspondence 300/}).click();
 await page.getByText('Synthetic learner requests a timetable update.',{exact:true}).waitFor();
 for(const width of [390,1440]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:`/tmp/comms-inbox-${width}.png`,fullPage:true});}
 await page.setViewportSize({width:390,height:900});await page.getByText('Write a new email',{exact:true}).click();await page.getByLabel('Email body',{exact:true}).fill('Keep this unsaved draft.');
 let discard=false;page.on('dialog',dialog=>discard?dialog.accept():dialog.dismiss());await page.getByRole('button',{name:'Back to inbox',exact:true}).click();assert.equal(await page.getByLabel('Email body',{exact:true}).inputValue(),'Keep this unsaved draft.');
 discard=true;await page.getByRole('button',{name:'Back to inbox',exact:true}).click();await page.getByLabel('Search correspondence').waitFor();assert.equal(await page.getByLabel('Email body',{exact:true}).inputValue(),'');
 await page.getByLabel('Search correspondence').fill('');await page.getByLabel('Conversation ownership').selectOption('mine');await page.getByText('1 matching conversations',{exact:true}).waitFor();
 assert.deepEqual(writes.filter(path=>!['/rest/v1/rpc/ensure_my_account','/rest/v1/consent_records','/rest/v1/rpc/uni_mail_member_directory'].includes(path)),[],JSON.stringify(writes));assert.equal(errors.length,0,errors.join('\n'));console.log('Communications mobile/desktop: full inbox search, selected history, discard confirmation, assignment filter, no overflow/browser errors or email sending.');
}finally{await browser.close();}
