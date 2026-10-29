import {test,expect} from '@playwright/test';
test.describe.configure({retries:0});
test('qualification filters survive shared links, reload and browser navigation with empty-result recovery',async({context,page})=>{
 test.setTimeout(45_000);
 await context.route('https://unipathway-browser-ci.invalid/**',route=>route.fulfill({status:200,headers:{'access-control-allow-origin':'*','content-type':'application/json'},body:'[]'}));
 await page.setViewportSize({width:375,height:812});await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/qualifications?body=OTHM&subject=Business&q=business&utm_source=synthetic#qualification-results');await expect(page.getByLabel('Search programmes',{exact:true})).toHaveValue('business');
 const consent=page.getByRole('dialog',{name:'Cookie preferences'});if(await consent.isVisible())await consent.getByRole('button',{name:'Reject all'}).click();
 await expect(page.getByRole('combobox',{name:'Subject',exact:true})).toHaveValue('Business');await page.getByRole('button',{name:'Qualifi',exact:true}).click();
 await expect.poll(()=>new URL(page.url()).searchParams.get('body')).toBe('Qualifi');expect(new URL(page.url()).hash).toBe('#qualification-results');for(const [key,value] of [['q','business'],['subject','Business'],['utm_source','synthetic']])expect(new URL(page.url()).searchParams.get(key)).toBe(value);
 await page.reload();await expect(page.getByLabel('Search programmes',{exact:true})).toHaveValue('business');await expect(page.getByRole('button',{name:'Qualifi',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.goBack();await expect(page.getByRole('button',{name:'OTHM',exact:true})).toHaveAttribute('aria-pressed','true');await page.goForward();await expect(page.getByRole('button',{name:'Qualifi',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.getByLabel('Search programmes',{exact:true}).fill('zz-no-qualification');await expect(page.getByText(/No matching qualifications/)).toBeVisible();await page.getByRole('button',{name:'Reset qualification search',exact:true}).click();await expect(page.getByLabel('Search programmes',{exact:true})).toBeFocused();
 expect(new URL(page.url()).searchParams.toString()).toBe('utm_source=synthetic');await expect(page.getByRole('region',{name:'Proposed qualifications',exact:true}).getByRole('article').first()).toBeVisible();
 await page.evaluate(()=>{document.documentElement.classList.add('dark');document.documentElement.style.fontSize='24px';});for(const viewport of [{width:375,height:812},{width:812,height:375},{width:1440,height:1000}]){await page.setViewportSize(viewport);await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth?[]:Array.from(document.querySelectorAll('body *')).filter(el=>el.getBoundingClientRect().right>innerWidth+1&&getComputedStyle(el).visibility!=='hidden').slice(-8).map(el=>({tag:el.tagName,text:el.textContent?.slice(0,90),right:Math.round(el.getBoundingClientRect().right),viewport:innerWidth})))).toEqual([]);}
});

test('students search and page enrolled modules, retain module links and recover from a failed read',async({context,page})=>{
 test.setTimeout(45_000);
 const tenant='00000000-0000-4000-8000-000000000010',user={id:'00000000-0000-4000-8000-000000000001',aud:'authenticated',role:'authenticated',email:'synthetic-student@unipathway.pk',app_metadata:{provider:'email'},user_metadata:{},created_at:'2026-01-01T00:00:00Z'};
 await context.addInitScript(({user})=>{if(location.origin==='null')return;const token=btoa(JSON.stringify({alg:'HS256',typ:'JWT'}))+'.'+btoa(JSON.stringify({sub:user.id,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600}))+'.synthetic';localStorage.setItem('sb-unipathway-browser-ci-auth-token',JSON.stringify({access_token:token,refresh_token:'synthetic',token_type:'bearer',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,user}));},{user});
 const programmes=Array.from({length:7},(_,i)=>({id:`p${i}`,tenant_id:tenant,title:`Programme ${i}`,awarding_body:'OTHM',level:'5'})),modules=Array.from({length:8},(_,i)=>({id:`m${i}`,tenant_id:tenant,programme_id:'p0',title:`Learning module ${i}`,code:`NET00${i}`,status:i===7?'archived':'active'}));
 const tables:Record<string,any[]>={student_enrolments:programmes.map(p=>({id:`enrol-${p.id}`,tenant_id:tenant,student_id:user.id,programme_id:p.id,status:'active'})),programmes,modules};const reads:{name:string;params:URLSearchParams}[]=[];let failModules=false;
 await context.route('https://unipathway-browser-ci.invalid/**',async route=>{
  const r=route.request(),url=new URL(r.url()),name=url.pathname.split('/').at(-1)||'';let data:any=tables[name]||[];
  if(name==='profiles')data={full_name:'Synthetic learner',tenant_id:tenant};else if(name==='user_roles')data=[{role:'student'}];else if(url.pathname.endsWith('/auth/v1/user'))data=user;
  if(tables[name]){
   reads.push({name,params:url.searchParams});if(name==='modules'&&failModules)return route.fulfill({status:503,headers:{'access-control-allow-origin':'*','content-type':'application/json'},body:JSON.stringify({message:'Synthetic unavailable modules'})});
   for(const [key,value] of url.searchParams){if(value.startsWith('eq.'))data=data.filter((row:any)=>String(row[key])===value.slice(3));if(value.startsWith('in.(')){const ids=value.slice(4,-1).split(',');data=data.filter((row:any)=>ids.includes(String(row[key])));}}
   data=data.slice(Number(url.searchParams.get('offset')||0),Number(url.searchParams.get('offset')||0)+Number(url.searchParams.get('limit')||250));
  }
  await route.fulfill({status:200,headers:{'access-control-allow-origin':'*','content-type':'application/json'},body:JSON.stringify(data)});
 });
 await page.setViewportSize({width:375,height:812});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/student/courses');await page.getByLabel('Find my course or module',{exact:true}).waitFor();const consent=page.getByRole('dialog',{name:'Cookie preferences'});if(await consent.isVisible())await consent.getByRole('button',{name:'Reject all'}).click();
 expect(reads.find(x=>x.name==='programmes')?.params.get('id')).toBe('in.(p0,p1,p2,p3,p4,p5,p6)');expect(reads.find(x=>x.name==='modules')?.params.get('programme_id')).toBe('in.(p0,p1,p2,p3,p4,p5,p6)');expect(reads.every(x=>x.params.get('tenant_id')===`eq.${tenant}`)).toBe(true);
 await page.getByRole('button',{name:'Next courses',exact:true}).click();await expect(page.getByRole('heading',{name:'Programme 6',exact:true})).toBeVisible();await page.getByLabel('Find my course or module',{exact:true}).fill('NET007');await expect(page.getByRole('link',{name:'Learning module 7',exact:true})).toHaveAttribute('href','/student/module?module=m7');await expect(page.getByText(/Module status: archived/)).toBeVisible();
 await page.getByRole('button',{name:'Clear my course search',exact:true}).click();await expect(page.getByLabel('Find my course or module',{exact:true})).toBeFocused();await page.getByRole('button',{name:'Next modules for Programme 0',exact:true}).click();await expect(page.getByRole('link',{name:'Learning module 7',exact:true})).toBeVisible();
 failModules=true;await page.reload();await expect(page.getByRole('alert').filter({hasText:'Your courses could not be verified'})).toBeVisible();await expect(page.getByText(/No active enrolments yet/)).toHaveCount(0);failModules=false;await page.getByRole('button',{name:'Retry my courses',exact:true}).click();await expect(page.getByRole('link',{name:'Learning module 0',exact:true})).toBeVisible();
 await page.evaluate(()=>{document.documentElement.classList.add('dark');document.documentElement.style.fontSize='24px';});for(const viewport of [{width:375,height:812},{width:812,height:375},{width:1440,height:1000}]){await page.setViewportSize(viewport);await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth?[]:Array.from(document.querySelectorAll('body *')).filter(el=>el.getBoundingClientRect().right>innerWidth+1&&getComputedStyle(el).visibility!=='hidden').slice(-8).map(el=>({tag:el.tagName,text:el.textContent?.slice(0,90),right:Math.round(el.getBoundingClientRect().right),viewport:innerWidth})))).toEqual([]);}
});

test('Pearson Fine Art and craft options expose sourced modules and a course-specific enquiry',async({context,page})=>{
 test.setTimeout(45_000);
 await context.route('https://unipathway-browser-ci.invalid/**',route=>route.fulfill({status:200,headers:{'access-control-allow-origin':'*','content-type':'application/json'},body:'[]'}));
 await page.setViewportSize({width:375,height:812});await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/qualifications?body=Pearson+BTEC&subject=Fine+Art+%26+Craft&q=textile');
 const consent=page.getByRole('dialog',{name:'Cookie preferences'});if(await consent.isVisible())await consent.getByRole('button',{name:'Reject all'}).click();
 const cards=page.getByRole('region',{name:'Proposed qualifications',exact:true}).getByRole('article');await expect(cards).toHaveCount(2);
 const hnd=cards.filter({has:page.getByRole('heading',{name:'Level 5 Higher National Diploma in Fine Art',exact:true})});
 await hnd.getByText('Modules and craft study · Level 5',{exact:true}).click();
 await expect(hnd.getByText('B2 · Professional Project — 75 credits',{exact:true})).toBeVisible();
 await expect(hnd.getByText(/not additional Pearson units or extra credits/)).toBeVisible();
 const enquiry=hnd.getByRole('link',{name:/Ask about Pearson BTEC Level 5/});
 expect(new URL(await enquiry.getAttribute('href')||'',page.url()).searchParams.get('course')).toBe('Pearson BTEC Level 5 Higher National Diploma in Fine Art');
 await expect(hnd.getByRole('link',{name:/Pearson Fine Art specification/})).toHaveAttribute('href',/qualifications\.pearson\.com/);
 const enterprise=page.getByRole('region',{name:'Fine art and crafts for women building a business',exact:true});
 await expect(enterprise.getByRole('article')).toHaveCount(8);
 await expect(enterprise.getByText(/Specifically designed for women in Pakistan/)).toBeVisible();
 await expect(enterprise.getByRole('heading',{name:'Sewing and tailoring for women',exact:true})).toBeVisible();
 const workshop=enterprise.getByRole('link',{name:'Enquire about Ecommerce and social selling',exact:true});
 expect(new URL(await workshop.getAttribute('href')||'',page.url()).searchParams.get('course')).toBe('Women’s creative enterprise: Ecommerce and social selling');
 await expect(enterprise.getByText(/They are not Pearson qualifications/)).toBeVisible();
 await page.evaluate(()=>{document.documentElement.classList.add('dark');document.documentElement.style.fontSize='24px';});
 for(const viewport of [{width:375,height:812},{width:812,height:375},{width:1440,height:1000}]){await page.setViewportSize(viewport);await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
});

test('craft discovery restores shared filters and recovers with keyboard focus on narrow screens',async({context,page})=>{
 test.setTimeout(45_000);
 await context.route('https://unipathway-browser-ci.invalid/**',route=>route.fulfill({status:200,headers:{'access-control-allow-origin':'*','content-type':'application/json'},body:'[]'}));
 await page.setViewportSize({width:375,height:812});await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/creative-crafts?q=sewing&format=Short+course&utm_source=synthetic#crafts-options-heading');
 const consent=page.getByRole('dialog',{name:'Cookie preferences'});if(await consent.isVisible())await consent.getByRole('button',{name:'Reject all'}).click();
 const options=page.getByRole('region',{name:'Choose the craft, then the business skills around it',exact:true});
 await expect(options.getByRole('article')).toHaveCount(1);await page.reload();await expect(page.getByLabel('Search crafts and skills',{exact:true})).toHaveValue('sewing');
 await page.getByLabel('Learning format',{exact:true}).selectOption('Workshop');await expect(page.getByText('No craft matches that search yet.',{exact:true})).toBeVisible();
 await page.goBack();await expect(options.getByRole('article')).toHaveCount(1);
 await page.getByRole('button',{name:'Clear craft filters',exact:true}).click();await expect(page.getByLabel('Search crafts and skills',{exact:true})).toBeFocused();
 expect(new URL(page.url()).searchParams.toString()).toBe('utm_source=synthetic');expect(new URL(page.url()).hash).toBe('#crafts-options-heading');await expect(options.getByRole('article')).toHaveCount(8);
 await page.evaluate(()=>{document.documentElement.classList.add('dark');document.documentElement.style.fontSize='24px';});
 for(const viewport of [{width:375,height:812},{width:812,height:375},{width:1440,height:1000}]){await page.setViewportSize(viewport);await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
});

test('page contents follows qualification filters without obsolete anchors',async({context,page})=>{
 test.setTimeout(45_000);
 await context.route('https://unipathway-browser-ci.invalid/**',route=>route.fulfill({status:200,headers:{'access-control-allow-origin':'*','content-type':'application/json'},body:'[]'}));
 await page.goto('/qualifications?body=Pearson+BTEC&q=Fine+Art');
 const consent=page.getByRole('dialog',{name:'Cookie preferences'});if(await consent.isVisible())await consent.getByRole('button',{name:'Reject all'}).click();
 const contents=page.getByRole('navigation',{name:'On this page',exact:true});
 await contents.getByText('On this page — jump to a section',{exact:true}).click();
 await expect(contents.getByRole('link',{name:'Level 4 Higher National Certificate in Fine Art',exact:true})).toBeVisible();
 await page.getByLabel('Search programmes',{exact:true}).fill('zz-no-result');
 await expect(contents.getByRole('link',{name:'Level 4 Higher National Certificate in Fine Art',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Reset qualification search',exact:true}).click();
 await expect(contents.getByRole('link',{name:'Level 3 Diploma in Business Studies',exact:true})).toBeVisible();
 expect(await contents.getByRole('link').evaluateAll(links=>links.every(link=>{const target=link.getAttribute('href')?.slice(1);return !!target&&!!document.getElementById(target);}))).toBe(true);
});
