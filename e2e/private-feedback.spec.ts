import {test,expect} from '@playwright/test';

test('assessors can find older private feedback and confirm phrase changes without submitting marks',async({context,page})=>{
 await page.setViewportSize({width:375,height:812});
 await page.emulateMedia({reducedMotion:'reduce'});
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 const user={id:'00000000-0000-4000-8000-000000000001',aud:'authenticated',role:'authenticated',email:'synthetic@unipathway.pk',app_metadata:{provider:'email'},user_metadata:{},created_at:'2026-01-01T00:00:00Z'};
 const tenant='00000000-0000-4000-8000-000000000002';
 await context.addInitScript(({user})=>{const token=btoa(JSON.stringify({alg:'HS256',typ:'JWT'}))+'.'+btoa(JSON.stringify({sub:user.id,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600}))+'.synthetic';localStorage.setItem('sb-unipathway-browser-ci-auth-token',JSON.stringify({access_token:token,refresh_token:'synthetic',token_type:'bearer',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,user}));},{user});
 const tables:Record<string,any>={unipathway_assessment_allocations:[{attempt_id:'attempt',marker_id:user.id}],unipathway_assessment_attempts:[{id:'attempt',brief_id:'brief',student_id:'student',attempt_no:1,evidence_text:'The writer makes a clear argument using examples.\nThe conclusion connects the examples to the main idea.\n'+('LongWord'.repeat(40)),status:'submitted',submitted_at:'2026-10-26T09:00:00Z'}],unipathway_assessment_briefs:[{id:'brief',title:'Academic writing: explanation and evidence',max_attempts:1,learning_outcomes:'Build an argument with evidence.'}],unipathway_assessment_criteria:['A','B'].map(code=>({id:code,brief_id:'brief',criterion_code:code,criterion_description:'Use evidence to explain your answer',learning_outcome:'Develop written reasoning',scoring_guidance:'Assess the clarity and relevance of each example.',max_points:50}))};
 let receipt:unknown,draft:any;const snapshots:any[]=[];
 let snippets=Array.from({length:301},(_,i)=>({id:String(i).padStart(4,'0'),owner_id:user.id,tenant_id:tenant,title:`Phrase ${i}`,body:`Generic feedback wording ${i}`,created_at:'2026-01-01T00:00:00Z'}));
 const mutations:Record<string,unknown>[]=[];const reads:Record<string,string|null>[]=[];
 await context.route('https://unipathway-browser-ci.invalid/**',async route=>{const r=route.request(),url=new URL(r.url()),name=url.pathname.split('/').at(-1);let data=tables[name]||[];
 if(name==='uni_marking_drafts')data=draft?[draft]:[];else if(name==='save_uni_marking_draft'){const input=r.postDataJSON();draft={attempt_id:input.p_attempt,marker_id:user.id,tenant_id:tenant,criteria:input.p_criteria,feedback:input.p_feedback,guidance:input.p_guidance,revision:(draft?.revision||0)+1,updated_at:new Date().toISOString()};snapshots.unshift({...draft,id:`snapshot-${draft.revision}`,created_at:draft.updated_at});data=draft;}else if(name==='uni_marking_draft_events'){const offset=Number(url.searchParams.get('offset')||0),limit=Number(url.searchParams.get('limit')||11);data=snapshots.slice(offset,offset+limit);}else if(name==='uni_feedback_snippets'){
  if(r.method()==='POST'){
   const input=r.postDataJSON();mutations.push(input);data={...input,id:'saved-phrase',created_at:new Date().toISOString()};snippets.push(data);
  }else if(r.method()==='DELETE'){
   const id=url.searchParams.get('id')?.replace('eq.','');const matched=snippets.filter(x=>x.id===id);snippets=snippets.filter(x=>x.id!==id);data=matched.map(x=>({id:x.id}));
  }else{
   reads.push({owner:url.searchParams.get('owner_id'),tenant:url.searchParams.get('tenant_id')});
   const offset=Number(url.searchParams.get('offset')||0),limit=Number(url.searchParams.get('limit')||250);data=snippets.slice().sort((a,b)=>a.id.localeCompare(b.id)).slice(offset,offset+limit);
  }
 }else if(name==='profiles')data={full_name:'Synthetic assessor',tenant_id:tenant};else if(name==='user_roles')data=[{role:'assessor'}];else if(url.pathname.endsWith('/auth/v1/user'))data=user;else if(name==='record_unipathway_human_mark'){receipt=r.postDataJSON();data=null;}else if(url.pathname.includes('/rpc/'))data=null;
 await route.fulfill({status:200,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','content-type':'application/json'},body:JSON.stringify(data)});});

 await page.goto('/assessor/queue?attempt=attempt');
 await page.getByLabel('Individual written feedback').waitFor();
 const consent=page.getByRole('dialog',{name:'Cookie preferences'});if(await consent.isVisible())await consent.getByRole('button',{name:'Reject all'}).click();
 await page.getByText('My reusable feedback',{exact:true}).click();
 await expect(page.getByText('301 matching phrases · 301 saved in your private library',{exact:true})).toBeVisible();
 expect(reads.every(r=>r.owner===`eq.${user.id}`&&r.tenant===`eq.${tenant}`)).toBe(true);
 await page.getByLabel('Find saved feedback').fill('Phrase 300');
 await expect(page.getByText('Phrase 300',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Insert phrase',exact:true}).click();
 await expect(page.getByLabel('Individual written feedback')).toHaveValue('Generic feedback wording 300');
 await page.getByLabel('Phrase title',{exact:true}).fill('New generic comparison');
 await page.getByLabel('Reusable wording').fill('Compare the alternatives and explain your choice.');
 await page.getByRole('button',{name:'Save phrase',exact:true}).click();
 await expect(page.getByText('Phrase saved to your private library.',{exact:true})).toBeVisible();
 expect(mutations).toEqual([{owner_id:user.id,tenant_id:tenant,title:'New generic comparison',body:'Compare the alternatives and explain your choice.'}]);
 await page.getByLabel('Find saved feedback').fill('New generic comparison');
 await expect(page.getByText('New generic comparison',{exact:true})).toBeVisible();
 page.once('dialog',dialog=>dialog.accept());
 await page.getByRole('button',{name:'Delete phrase',exact:true}).click();
 await expect(page.getByText(/Phrase deleted from your private library/)).toBeVisible();
 await page.getByRole('button',{name:'Clear feedback search',exact:true}).click();
 await expect(page.getByLabel('Find saved feedback')).toBeFocused();
 await page.getByRole('button',{name:'Save private draft',exact:true}).click();
 await expect(page.getByText(/Draft revision 1 saved/)).toBeVisible();
 await page.getByRole('button',{name:'View private draft history',exact:true}).click();
 const history=page.getByRole('region',{name:'Private saved draft history',exact:true});
 await history.locator('summary').filter({hasText:'Draft revision 1 ·'}).click();
 await expect(history.getByText('Generic feedback wording 300',{exact:true})).toBeVisible();
 await page.getByLabel('Individual written feedback').fill('New individual feedback remains separate from older saved wording.');
 await page.getByRole('button',{name:'Save private draft',exact:true}).click();
 await expect(page.getByText(/Draft revision 2 saved/)).toBeVisible();
 await expect(history.locator('summary').filter({hasText:'Draft revision 2 ·'})).toBeVisible();
 await history.locator('summary').filter({hasText:'Draft revision 1 ·'}).click();
 await expect(history.getByText('Generic feedback wording 300',{exact:true})).toBeVisible();
 await expect(page.getByLabel('Individual written feedback')).toHaveValue('New individual feedback remains separate from older saved wording.');
 await page.evaluate(()=>{document.documentElement.classList.add('dark');document.documentElement.style.fontSize='24px';});
 for(const viewport of [{width:375,height:812},{width:812,height:375},{width:1440,height:1000}]){
  await page.setViewportSize(viewport);await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
 expect(snapshots.map(s=>s.revision)).toEqual([2,1]);expect(receipt).toBeUndefined();expect(errors).toEqual([]);
});
