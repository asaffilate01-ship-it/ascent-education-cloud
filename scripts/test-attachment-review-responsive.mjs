import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
// Two synthetic pages, generated locally; never use student documents in this fixture.
const objects=[
 '<< /Type /Catalog /Pages 2 0 R >>',
 '<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>',
 '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 6 0 R >>',
 '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 7 0 R >>',
 '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
 ...['one','two'].map(word=>{const stream=`BT /F1 16 Tf 50 740 Td (Synthetic assessment page ${word}) Tj ET`;return `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;})
];
let source='%PDF-1.4\n';const offsets=[0];
objects.forEach((object,i)=>{offsets.push(source.length);source+=`${i+1} 0 obj\n${object}\nendobj\n`;});
const xref=source.length;source+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`+offsets.slice(1).map(n=>`${String(n).padStart(10,'0')} 00000 n \n`).join('')+`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
const pdf=Buffer.from(source);


const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox']});
try{
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const user={id:'00000000-0000-4000-8000-000000000001',aud:'authenticated',role:'authenticated',email:'synthetic@unipathway.pk',app_metadata:{provider:'email'},user_metadata:{},created_at:'2026-01-01T00:00:00Z'};
 const tenant='00000000-0000-4000-8000-000000000002';
 await context.addInitScript(({user})=>{const token=btoa(JSON.stringify({alg:'HS256',typ:'JWT'}))+'.'+btoa(JSON.stringify({sub:user.id,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600}))+'.synthetic';localStorage.setItem('sb-unipathway-browser-ci-auth-token',JSON.stringify({access_token:token,refresh_token:'synthetic',token_type:'bearer',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,user}));},{user});

 const tables={unipathway_assessment_allocations:[{attempt_id:'attempt',qa_reviewer_id:user.id,marker_id:'marker'}],unipathway_assessment_attempts:[{id:'attempt',brief_id:'brief',status:'human_marked',attempt_no:1,evidence_text:'The learner explains the method.\nThe conclusion refers to the observed evidence.',submitted_at:'2026-10-26T09:00:00Z'}],unipathway_assessment_briefs:[{id:'brief',title:'Academic writing review',lecturer_id:'lecturer',policy_reference:'Assessment policy'}],unipathway_assessment_criteria:['LO1','LO2'].map(code=>({id:code,brief_id:'brief',criterion_code:code,max_points:50,learning_outcome:'Explain and evaluate the method',criterion_description:'Use examples to support the conclusion.',scoring_guidance:'Assess the relevance and clarity of supporting evidence.'})),unipathway_assessment_human_marks:[{attempt_id:'attempt',marker_id:'marker',revision:2,criteria_scores:['LO1','LO2'].map(code=>({code,points:40,reason:'The conclusion is supported by the examples.',evidence:'Submitted text, lines 1–2',missing:'No required evidence missing'})),raw_score:80,penalty_points:0,adjusted_score:80,feedback:'Your explanation supports a clear conclusion. Compare alternatives in your next assignment.'}],unipathway_assessment_quality_decisions:[],unipathway_assessment_released_results:[]};
 tables.unipathway_assessment_mark_history=[2,1].map(revision=>({id:'history-'+revision,revision,raw_score:revision===2?80:70,adjusted_score:revision===2?80:70,penalty_points:0,recorded_at:'2026-10-27T10:00:00Z',feedback:'Submitted feedback revision '+revision,criteria_scores:[{code:'LO1',points:40,reason:'Verified explanation',evidence:'Submitted text line 1',missing:'Fully met'}]}));
 tables.unipathway_coursework_uploads=[{id:'attachment',file_name:'synthetic.pdf',mime_type:'application/pdf',byte_size:pdf.length,storage_path:'centre/student/attachment',attempt_id:'attempt'}];
 const receipts=[];
 await context.route('https://unipathway-browser-ci.invalid/**',async route=>{const r=route.request(),url=new URL(r.url()),name=url.pathname.split('/').at(-1);let data=tables[name]||[];
 if(url.pathname.includes('/storage/v1/object/'))return route.fulfill({status:200,headers:{'access-control-allow-origin':'*','content-type':'application/pdf'},body:pdf});
 if(name==='profiles')data={full_name:'Synthetic reviewer',tenant_id:tenant};else if(name==='user_roles')data=[{role:'iqa_officer'}];else if(url.pathname.endsWith('/auth/v1/user'))data=user;
 else if(name==='review_uni_mark_revision'){const input=r.postDataJSON();receipts.push(input);if(input.p_action==='approve'){tables.unipathway_assessment_attempts[0].status='qa_approved';tables.unipathway_assessment_quality_decisions=[{attempt_id:'attempt',mark_revision:2,decision:'approved',rationale:input.p_rationale}];}else {tables.unipathway_assessment_attempts[0].status='released';tables.unipathway_assessment_released_results=[{attempt_id:'attempt',released_at:new Date().toISOString()}];}data=null;}
 else if(url.pathname.includes('/rpc/'))data=null;
 await route.fulfill({status:200,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','content-type':'application/json'},body:JSON.stringify(data)});});
 await page.goto('http://127.0.0.1:8080/qa/assessment-approval?attempt=attempt');await page.getByLabel('QA rationale and evidence').waitFor({timeout:20000});
 if(await page.getByRole('button',{name:'Reject all',exact:true}).count())await page.getByRole('button',{name:'Reject all',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('aside[aria-label="Dashboard navigation"]')?.getBoundingClientRect().right<=1);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:'/tmp/iqa-mobile.png',fullPage:true});
 await page.getByRole('button',{name:'Load submitted revisions'}).click();await page.getByText('Submitted feedback revision 2',{exact:true}).waitFor();await page.getByText('Submitted feedback revision 1',{exact:true}).waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);

 await page.getByRole('button',{name:'Review attachment',exact:true}).click();
 await page.getByText('of 2 pages',{exact:true}).waitFor();
 await page.getByRole('img',{name:'Document page 1',exact:true}).waitFor();
 await page.getByText('Read text from this page',{exact:true}).click();
 await page.getByText('Synthetic assessment page one',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Next page',exact:true}).click();
 await page.getByText('Synthetic assessment page two',{exact:true}).waitFor();
 await page.getByLabel('Document zoom').selectOption('200');
 await page.getByText('Synthetic assessment page two',{exact:true}).waitFor();
 for(const width of [390,1440]){
  await page.setViewportSize({width,height:1000});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.screenshot({path:`/tmp/attachment-review-${width}.png`,fullPage:true});
 }
 await page.getByRole('button',{name:'Close review',exact:true}).click();
 assert.equal(await page.getByRole('img',{name:'Document page 2',exact:true}).count(),0);
 assert.equal(errors.length,0,errors.join('\n')); console.log('Attachment PDF preview passed at mobile and desktop widths, page navigation and private preview cleanup.');
}finally{await browser.close();}
