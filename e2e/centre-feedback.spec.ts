import {test,expect,type BrowserContext} from '@playwright/test';
test.describe.configure({retries:0});
test('centre wording requires independent approval and is rechecked before insertion after withdrawal',async({browser})=>{
 test.setTimeout(60_000);
 const tenant='00000000-0000-4000-8000-000000000010';const contexts:BrowserContext[]=[],rows:any[]=[],writes:any[]=[],marks:any[]=[],errors:string[]=[];
 async function workspace(role:'assessor'|'iqa_officer',number:number){
  const context=await browser.newContext({viewport:{width:375,height:812},reducedMotion:'reduce'});contexts.push(context);
  const user={id:`00000000-0000-4000-8000-${String(number).padStart(12,'0')}`,aud:'authenticated',role:'authenticated',email:`synthetic-${number}@unipathway.pk`,app_metadata:{provider:'email'},user_metadata:{},created_at:'2026-01-01T00:00:00Z'};
  await context.addInitScript(({user})=>{const token=btoa(JSON.stringify({alg:'HS256',typ:'JWT'}))+'.'+btoa(JSON.stringify({sub:user.id,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600}))+'.synthetic';localStorage.setItem('sb-unipathway-browser-ci-auth-token',JSON.stringify({access_token:token,refresh_token:'synthetic',token_type:'bearer',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,user}));},{user});
  const tables:Record<string,any>={unipathway_assessment_allocations:role==='assessor'?[{attempt_id:'attempt',marker_id:user.id}]:[],unipathway_assessment_attempts:[{id:'attempt',brief_id:'brief',student_id:'student',attempt_no:1,evidence_text:'Synthetic learner evidence for browser checks.',status:'submitted',submitted_at:'2026-10-26T09:00:00Z'}],unipathway_assessment_briefs:[{id:'brief',title:'Synthetic written assessment',max_attempts:1}],unipathway_assessment_criteria:['A','B'].map(code=>({id:code,brief_id:'brief',criterion_code:code,learning_outcome:'Explain reasoning',criterion_description:'Explain with evidence',max_points:50}))};
  await context.route('https://unipathway-browser-ci.invalid/**',async route=>{
   const request=route.request(),url=new URL(request.url()),name=url.pathname.split('/').at(-1);let data:any=tables[name]||[];
   if(name==='profiles')data={full_name:'Synthetic staff',tenant_id:tenant};else if(name==='user_roles')data=[{role}];else if(url.pathname.endsWith('/auth/v1/user'))data=user;
   else if(name==='propose_uni_centre_feedback'){
    const p=request.postDataJSON();writes.push({name,...p});const row={id:p.p_request,tenant_id:tenant,proposed_by:user.id,title:p.p_title,body:p.p_body,status:'proposed',revision:1,created_at:'2026-10-28T10:00:00Z',reviewed_by:null,review_reference:''};rows.push(row);data=row;
   }else if(name==='review_uni_centre_feedback'){
    const p=request.postDataJSON();writes.push({name,...p});const row=rows.find(x=>x.id===p.p_feedback);Object.assign(row,{status:p.p_action==='approve'?'approved':'withdrawn',revision:row.revision+1,reviewed_by:user.id,review_reference:p.p_reference});data={...row};
   }else if(name==='uni_centre_feedback'){
    data=rows.filter(x=>role==='iqa_officer'||x.status==='approved'||x.proposed_by===user.id);
    for(const key of ['id','status','tenant_id']){const value=url.searchParams.get(key);if(value)data=data.filter((x:any)=>x[key]===value.replace('eq.',''));}
    const offset=Number(url.searchParams.get('offset')||0),limit=Number(url.searchParams.get('limit')||250);data=data.slice(offset,offset+limit);
    if(request.headers().accept?.includes('application/vnd.pgrst.object+json'))data=data[0]||null;
   }else if(name==='record_unipathway_human_mark'){marks.push(request.postDataJSON());data=null;}
   await route.fulfill({status:200,headers:{'access-control-allow-origin':'*','content-type':'application/json'},body:JSON.stringify(data)});
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(role==='assessor'?'/assessor/queue?attempt=attempt':'/qa/assessment-approval');
  const consent=page.getByRole('dialog',{name:'Cookie preferences'});if(await consent.isVisible())await consent.getByRole('button',{name:'Reject all'}).click();
  await page.getByText('Centre feedback catalogue',{exact:true}).click();await expect(page.getByText(/matching centre phrases/)).toBeVisible();return page;
 }
 try{
  const author=await workspace('assessor',1);await author.getByLabel('Centre phrase title',{exact:true}).fill('Compare the alternatives');await author.getByLabel('Proposed centre wording',{exact:true}).fill('Compare the alternatives and explain why the evidence supports your chosen method.');
  await author.getByRole('button',{name:'Submit phrase for IQA review',exact:true}).click();await expect(author.getByText(/Proposal submitted for independent IQA review/)).toBeVisible();
  await expect(author.getByRole('button',{name:'Insert approved wording',exact:true})).toHaveCount(0);
  const reviewer=await workspace('iqa_officer',2);await reviewer.getByLabel('Internal review reference for Compare the alternatives',{exact:true}).fill('Centre approval record 2026-10');reviewer.once('dialog',d=>d.accept());await reviewer.getByRole('button',{name:'Approve centre wording',exact:true}).click();await expect(reviewer.getByText(/Centre wording approved/)).toBeVisible();
  const borrower=await workspace('assessor',3);await borrower.getByRole('button',{name:'Insert approved wording',exact:true}).click();await expect(borrower.getByLabel('Individual written feedback')).toHaveValue(rows[0].body);await expect(borrower.getByText(/Approved wording inserted as an unsaved draft edit/)).toBeVisible();
  await reviewer.getByLabel('Centre feedback status',{exact:true}).selectOption('approved');await reviewer.getByLabel('Internal review reference for Compare the alternatives',{exact:true}).fill('Centre withdrawal record 2026-10');reviewer.once('dialog',d=>d.accept());await reviewer.getByRole('button',{name:'Withdraw centre wording',exact:true}).click();await expect(reviewer.getByText(/Centre wording withdrawn/)).toBeVisible();
  await borrower.getByRole('button',{name:'Insert approved wording',exact:true}).click();await expect(borrower.getByText(/Approval could not be rechecked/)).toBeVisible();await expect(borrower.getByLabel('Individual written feedback')).toHaveValue(rows[0].body);
  await borrower.evaluate(()=>{document.documentElement.classList.add('dark');document.documentElement.style.fontSize='24px';});
  for(const viewport of [{width:375,height:812},{width:812,height:375},{width:1440,height:1000}]){await borrower.setViewportSize(viewport);await expect.poll(()=>borrower.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
  expect(rows[0].status).toBe('withdrawn');expect(rows[0].revision).toBe(3);expect(writes.map(x=>x.name)).toEqual(['propose_uni_centre_feedback','review_uni_centre_feedback','review_uni_centre_feedback']);expect(marks).toEqual([]);expect(errors).toEqual([]);
 }finally{await Promise.all(contexts.map(c=>c.close()));}
});
