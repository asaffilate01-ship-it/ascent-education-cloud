import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/tmp/uni-chromium',headless:true,args:['--no-sandbox']});
try {
 const page=await browser.newPage();
 for(let i=0;i<30;i++){try{await page.goto(process.env.TEST_BASE_URL||'http://127.0.0.1:8080');break;}catch(e){if(i===29)throw e;await new Promise(r=>setTimeout(r,250));}}
 const result=await page.evaluate(async()=>{
  const lib=await import('/src/lib/learning/offlineLessons.ts');let checks=0;
  function check(value,message){if(!value)throw Error(message);checks++;}
  const a={id:'student-a',tenantId:'centre-a'},b={id:'student-b',tenantId:'centre-a'};
  const lesson={id:'lesson-a',module_id:'module-a',tenant_id:a.tenantId,title:'Study algebra',body:'Read the worked example then solve the practice questions.',transcript:'Teacher explanation.',video_url:'https://example.com/private?token=secret',resource_url:'https://example.com/private.pdf',position:1,status:'published',revision:1};
  await lib.setLearningAccount(a);
  await lib.saveLessonPack(a,'module-a',[lesson],[]);
  let pack=await lib.getLessonPack(a,'module-a');
  check(pack.lessons[0].body===lesson.body,'text saved');
  check(pack.lessons[0].video_url===null&&pack.lessons[0].resource_url===null,'no media or signed urls stored');
  try{await lib.getLessonPack(b,'module-a');throw Error('wrong account accepted');}catch(e){check(e.message.includes('account changed'),'different user denied');}
  const p={lesson_id:lesson.id,revision:1,position_seconds:40,completed:true,updated_at:'2026-10-26T12:00:00Z'};
  const first=await lib.queueLessonProgress(a,'module-a',p);
  const next=await lib.queueLessonProgress(a,'module-a',{...p,position_seconds:50,completed:false,updated_at:'2026-10-26T12:01:00Z'});
  await lib.acknowledgeProgress(a,'module-a',first.mutation);
  pack=await lib.getLessonPack(a,'module-a');check(pack.pending.length===1&&pack.pending[0].mutation===next.mutation,'old ACK cannot erase newer work');
  check(pack.progress[0].completed&&pack.progress[0].position_seconds===50,'completion monotonic');
  const discarded=await lib.reconcileLessonPack(a,'module-a',[{...lesson,revision:2}]);
  check(discarded===1&&!await lib.getLessonPack(a,'module-a'),'revised content removed with obsolete queue');
  await lib.saveLessonPack(a,'module-a',[lesson],[]);
  await lib.reconcileLessonPack(a,'module-a',[]);
  check(!await lib.getLessonPack(a,'module-a'),'withdrawn access removed');
  await lib.saveLessonPack(a,'module-a',[lesson],[]);
  const now=Date.now;Date.now=()=>now()+lib.PACK_TTL+1;
  check(!await lib.getLessonPack(a,'module-a'),'expired text unavailable');
  try{await lib.queueLessonProgress(a,'module-a',p);throw Error('expired queue accepted');}catch(e){check(!e.message.includes('accepted'),'expired queue denied');}
  Date.now=now;
  await lib.setLearningAccount(b);check((await lib.listLessonPacks(b)).length===0,'no previous account packs');
  await lib.setLearningAccount(a);check((await lib.listLessonPacks(a)).length===0,'previous account erased on switch');
  await lib.saveLessonPack(a,'module-a',[lesson],[]);await lib.setLearningAccount(null);await lib.setLearningAccount(a);
  check((await lib.listLessonPacks(a)).length===0,'signout erased content');
  try{await lib.saveLessonPack(a,'module-a',[{...lesson,tenant_id:'other'}],[]);throw Error('foreign centre accepted');}catch(e){check(e.message.includes('published module'),'foreign centre rejected');}
  for(let i=0;i<lib.PACK_LIMIT;i++)await lib.saveLessonPack(a,'m'+i,[{...lesson,module_id:'m'+i}],[]);
  try{await lib.saveLessonPack(a,'module-a',[lesson],[]);throw Error('limit accepted');}catch(e){check(!e.message.includes('accepted'),'pack limit enforced');}
  return checks;
 });
 const materials=await page.evaluate(async()=>{
  const packs=await import('/src/lib/learning/offlineLessons.ts'),files=await import('/src/lib/learning/offlineMaterials.ts');let checks=0;const check=(v,m)=>{if(!v)throw Error(m);checks++;};
  const account={id:'file-learner',tenantId:'centre-a'},other={id:'other-learner',tenantId:'centre-a'};
  await packs.setLearningAccount(account);const item={id:'file',module_id:'module',title:'Private notes',object_path:'centre-a/module/file.pdf'};
  await files.saveOfflineMaterial(account,item,new Blob(['%PDF-fixture'],{type:'application/pdf'}));
  let saved=(await files.listOfflineMaterials(account))[0];check(await saved.blob.text()==='%PDF-fixture','private blob persists');check(!JSON.stringify({...saved,blob:null}).includes('token='),'no credentials in metadata');
  check((await packs.restoreOfflineReader()).id===account.id,'reader can restore explicit saved context');
  await files.saveMaterialPosition(account,item.id,72);const resumed=(await files.listOfflineMaterials(account))[0];check(resumed.position_seconds===72&&resumed.expiresAt===saved.expiresAt,'playback position persists without extending expiry');
  const now=Date.now;Date.now=()=>now()+packs.PACK_TTL+1;check(!files.materialCurrent(saved),'expired file unavailable');check(await packs.restoreOfflineReader()===null,'expired reader denied');Date.now=()=>now()-10000;check(!files.materialCurrent(saved),'clock rollback denied');Date.now=now;
  try{await files.saveOfflineMaterial(account,item,new Blob(['<html>'],{type:'text/html'}));throw Error('accepted');}catch(e){check(e.message!=='accepted','HTML rejected');}
  try{await files.saveOfflineMaterial(account,item,new Blob([new Uint8Array(files.MATERIAL_BYTES+1)],{type:'application/pdf'}));throw Error('accepted');}catch(e){check(e.message!=='accepted','oversized file rejected');}
  await packs.setLearningAccount(other);check((await files.listOfflineMaterials(other)).length===0,'account switch clears files');check(await packs.restoreOfflineReader()===null,'old reader cannot reopen after switch');
  await packs.setLearningAccount(account);await files.saveOfflineMaterial(account,item,new Blob(['%PDF-fixture'],{type:'application/pdf'}));await packs.setLearningAccount(null);await packs.setLearningAccount(account);check((await files.listOfflineMaterials(account)).length===0,'logout erases private files');check(await packs.restoreOfflineReader()===null,'logout erases reader access');return checks;
 });
 assert.equal(materials,13);console.log(`${materials} private offline file persistence, expiry, type/size, account and logout checks passed`);
 let offset=0,posts=0,patches=0,retried=false;const requests=[];
 await page.route('https://unipathway-browser-ci.invalid/storage/v1/upload/resumable**',async route=>{
  const request=route.request(),headers=request.headers(),method=request.method();
  const cors={'access-control-allow-origin':'*','access-control-allow-methods':'POST,PATCH,HEAD,OPTIONS','access-control-allow-headers':'*','access-control-expose-headers':'Location,Upload-Offset,Upload-Length,Tus-Resumable','tus-resumable':'1.0.0'};
  if(method==='OPTIONS')return route.fulfill({status:204,headers:cors});
  requests.push({method,headers});
  if(method==='POST'){posts++;offset=request.postDataBuffer()?.length||0;return route.fulfill({status:201,headers:{...cors,location:'https://unipathway-browser-ci.invalid/storage/v1/upload/resumable/synthetic','upload-offset':String(offset)}});}
  if(method==='HEAD')return route.fulfill({status:200,headers:{...cors,'upload-offset':String(offset),'upload-length':String(13*1024*1024)}});
  if(method==='PATCH'){patches++;if(!retried){retried=true;return route.fulfill({status:503,headers:cors});}assert.equal(Number(headers['upload-offset']),offset);offset+=request.postDataBuffer()?.length||0;return route.fulfill({status:204,headers:{...cors,'upload-offset':String(offset)}});}
  throw Error('Unexpected upload method');
 });
 const transfer=await page.evaluate(async()=>{
  const {supabase}=await import('/src/integrations/supabase/client.ts');
  supabase.auth.getSession=async()=>({data:{session:{user:{id:'student-a'},access_token:'synthetic-test-token'}},error:null});
  const lib=await import('/src/lib/learning/resumableCoursework.ts');
  const file=new File([new Uint8Array(13*1024*1024)],'work.pdf',{type:'application/pdf'});
  let percent=0;
  await lib.uploadCourseworkResumable(file,{id:'file',file_name:'work.pdf',storage_path:'centre/student-a/file',mime_type:file.type,byte_size:file.size,attempt_id:null},'student-a',new AbortController().signal,p=>percent=p);
  return {percent,foreign:lib.trustedUploadUrl('https://attacker.invalid/storage/v1/upload/resumable/token','https://unipathway-browser-ci.invalid/storage/v1/upload/resumable'),hints:Object.keys(localStorage).filter(k=>k.startsWith('tus::unipathway-coursework:')).length};
 });
 assert.equal(offset,13*1024*1024);assert.equal(posts,1);assert.ok(patches>=3);assert.equal(transfer.percent,100);assert.equal(transfer.foreign,false);assert.equal(transfer.hints,0);
 assert.ok(requests.every(r=>r.headers.authorization==='Bearer synthetic-test-token'&&r.headers['x-upsert']==='false'));
 console.log('Real Chromium TUS client: 13 MB upload recovers after interrupted chunk without restarting; token scope, destination, progress and non-overwrite verified');
 assert.equal(result,14);console.log(`Real Chromium IndexedDB: ${result} offline text, queue, account isolation, expiry and revocation checks passed`);
}finally{await browser.close();}
