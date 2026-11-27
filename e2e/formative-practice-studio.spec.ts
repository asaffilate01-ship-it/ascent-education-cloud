import {test,expect} from '@playwright/test';
import {academicRecords} from './support/syntheticAcademicRecords';
import {dismissConsent} from './support/layoutEvidence';

test('staff practise and validate drafts locally across mobile, tablet and desktop',async({context,page},info)=>{
 test.setTimeout(90000);
 const fixture=await academicRecords(context,'lecturer',{});
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.setViewportSize({width:360,height:900});
 await page.goto('/lecturer/course-content');
 await dismissConsent(page);
 const library=page.getByRole('region',{name:'Formative question library',exact:true});
 await expect(library).toBeVisible();
 await library.getByRole('button',{name:'Explore question library'}).click();
 await library.getByLabel('Search practice questions').fill('UP-FQ3-MATHS-01');
 await library.getByRole('button',{name:'Focused practice',exact:true}).click();
 await library.getByRole('button',{name:'Start practice (1 available)'}).click();
 const practice=library.getByRole('region',{name:'Focused practice preview'});
 await practice.getByRole('radio',{name:/\. 7$/}).check();
 await practice.getByRole('button',{name:'Check practice answer'}).click();
 await practice.getByRole('button',{name:'Finish practice'}).click();
 await expect(practice.getByText('0 / 1 correct')).toBeVisible();
 await practice.getByRole('button',{name:'Review missed questions (1)'}).click();
 for(const width of [360,390,768,1440]){
  await page.setViewportSize({width,height:900});
  await expect.poll(()=>library.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
  await practice.screenshot({path:info.outputPath('practice-'+width+'.png'),animations:'disabled'});
 }
 page.on('dialog',dialog=>dialog.accept());
 await library.getByRole('button',{name:'Draft review',exact:true}).click();
 const intake=library.getByRole('region',{name:'AI and author draft review'});
 await intake.getByLabel('Draft source (self-reported)').selectOption('Claude');
 await intake.getByLabel('Proposed questions JSON').fill(JSON.stringify([{subject:'School maths',scope:'Class 8',topic:'Addition',question:'Add 17 and 29.',options:['46','42','45','47'],answer:'46',explanation:'Add tens and units: 17 + 29 = 46.'}]));
 await intake.getByRole('button',{name:'Validate draft batch'}).click();
 await expect(intake.getByText('1 structurally valid · 0 issues')).toBeVisible();
 await expect(intake.getByText('Add 17 and 29.',{exact:true})).toBeVisible();
 for(const width of [360,390,768,1440]){
  await page.setViewportSize({width,height:900});
  await expect.poll(()=>library.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
 }
 expect(fixture.requests.filter(read=>!['GET','HEAD'].includes(read.method)&&!['ensure_my_account','consent_records'].includes(read.name)).map(read=>read.pathname)).toEqual([]);
});
