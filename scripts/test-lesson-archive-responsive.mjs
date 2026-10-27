import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const fixture=mkdtempSync(join(tmpdir(),'uni-archive-'));
execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','lavfi','-i','color=c=navy:s=320x180:r=10','-t','3','-c:v','libvpx','-pix_fmt','yuv420p','-an',join(fixture,'recording.webm')]);
const media=readFileSync(join(fixture,'recording.webm'));

const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox']});
try{
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 const user={id:'00000000-0000-4000-8000-000000000001',aud:'authenticated',role:'authenticated',email:'synthetic@unipathway.pk',app_metadata:{provider:'email'},user_metadata:{},created_at:'2026-01-01T00:00:00Z'},tenant='00000000-0000-4000-8000-000000000002';
 await context.addInitScript(({user})=>{const token=btoa(JSON.stringify({alg:'HS256',typ:'JWT'}))+'.'+btoa(JSON.stringify({sub:user.id,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600}))+'.synthetic';localStorage.setItem('sb-unipathway-browser-ci-auth-token',JSON.stringify({access_token:token,refresh_token:'synthetic',token_type:'bearer',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,user}));},{user});
 const tables={live_class_sessions:Array.from({length:301},(_,i)=>({id:`session-${i}`,title:`Class ${i}`,tenant_id:tenant,module_id:'math',starts_at:'2026-01-01T10:00:00Z'})),live_class_artifacts:[{id:'recording',tenant_id:tenant,session_id:'session-300',artifact_type:'recording',publication_status:'published',storage_reference:'private/recording',available_at:'2020-01-01'}],lesson_ai_packs:[{id:'pack',tenant_id:tenant,session_id:'session-300',status:'published',summary:'Approved synthetic revision notes.'}]};
 const writes=[];
 await context.route('https://unipathway-browser-ci.invalid/**',async route=>{
  const request=route.request(),url=new URL(request.url()),name=url.pathname.split('/').at(-1);let data=tables[name]||[];
  if(!['GET','HEAD','OPTIONS'].includes(request.method()))writes.push(url.pathname);
  if(url.pathname.startsWith('/storage/v1/object/sign/unipathway-class-media/')){
   if(request.method()==='POST')return route.fulfill({status:200,headers:{'access-control-allow-origin':'*','content-type':'application/json'},body:JSON.stringify({signedURL:'/object/sign/unipathway-class-media/private/recording?token=synthetic'})});
   return route.fulfill({status:200,headers:{'access-control-allow-origin':'*','content-type':'video/webm'},body:media});
  }
  if(name==='profiles')data={full_name:'Synthetic mailbox member',tenant_id:tenant};else if(name==='user_roles')data=[{role:'student'}];else if(url.pathname.endsWith('/auth/v1/user'))data=user;
  else if(name==='uni_mail_member_directory')data=[{mailbox_id:'box',user_id:user.id,can_send:true,full_name:'Synthetic member'}];
  else if(tables[name]){
   for(const [key,value] of url.searchParams){if(value.startsWith('eq.'))data=data.filter(r=>String(r[key])===value.slice(3));if(value.startsWith('in.('))data=data.filter(r=>value.slice(4,-1).split(',').includes(String(r[key])));}
   const offset=Number(url.searchParams.get('offset')||0),limit=Number(url.searchParams.get('limit')||1000);data=data.slice(offset,offset+limit);
  }
  await route.fulfill({status:200,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','content-type':'application/json'},body:JSON.stringify(data)});
 });
 await page.goto('http://127.0.0.1:8080/student/lesson-archive?module=math');await page.getByText('Page 1 of 31',{exact:true}).waitFor();
 if(await page.getByRole('button',{name:'Reject all',exact:true}).count())await page.getByRole('button',{name:'Reject all',exact:true}).click();
 await page.getByLabel('Search classes',{exact:true}).fill('Class 300');await page.getByRole('button',{name:'Watch recording',exact:true}).click();
 const video=page.getByLabel('Recording: Class 300',{exact:true});await video.waitFor();await page.waitForFunction(()=>{const v=document.querySelector('video');return v&&Number.isFinite(v.duration)&&v.duration>0;});
 await video.evaluate(async v=>{v.muted=true;await v.play();});
 await page.waitForFunction(()=>document.querySelector('video')?.currentTime>=1.25);
 await video.evaluate(v=>v.pause());
 await page.getByRole('button',{name:'Refresh playback access',exact:true}).click();
 await page.waitForFunction(()=>{const v=document.querySelector('video');return v&&v.readyState>=1&&v.currentTime>=1.2;},{},{timeout:5000});
 for(const width of [390,1440]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:`/tmp/lesson-archive-${width}.png`,fullPage:true});}
 await page.getByText('Approved revision pack',{exact:true}).click();await page.getByText('Approved synthetic revision notes.',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Close recording',exact:true}).click();assert.equal(await page.locator('video').count(),0);
 assert.deepEqual(writes.filter(path=>!['/rest/v1/rpc/ensure_my_account','/rest/v1/consent_records'].includes(path)&&!path.startsWith('/storage/v1/object/sign/unipathway-class-media/')),[],JSON.stringify(writes));assert.equal(errors.length,0,errors.join('\n'));console.log('Archive browser: 301-class search, real synthetic video playback, refreshed access with position retained, private revision pack, 390px/1440px no overflow or browser errors.');
}finally{await browser.close();rmSync(fixture,{recursive:true,force:true});}
