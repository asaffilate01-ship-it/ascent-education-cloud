import {test,expect,type Page} from '@playwright/test';

// This browser suite never uses production credentials or University/British Council systems.
// A synthetic challenge and synthetic Supabase response exercise the real React/Vite UI.
type EnquiryBody={
 kind:string;tenant_slug:string;destination?:string;test_type?:string;
 prior_qualification?:string;captcha_token?:string;consent:boolean;
 student_origin?:string;
};
async function syntheticTurnstile(page:Page){
 await page.addInitScript(()=>{
  Object.assign(window,{
   turnstile:{
    render:(target:HTMLElement,opts:{callback:(token:string)=>void})=>{
     const b=document.createElement('button');
     b.type='button';
     b.textContent='Complete simulated challenge';
     b.setAttribute('aria-label','Complete simulated challenge');
     b.addEventListener('click',()=>opts.callback('synthetic-challenge-for-browser-test'));
     target.appendChild(b);
     return 'ci-test-challenge';
    },
    remove:()=>undefined
   }
  });
 });
}
async function stubEnquiry(page:Page){
 const submitted:EnquiryBody[]=[];
 await page.route('**/functions/v1/unipathway-public-enquiry',async route=>{
  const request=route.request();
  if(request.method()==='OPTIONS'){
   await route.fulfill({status:204,headers:{
    'access-control-allow-origin':'*',
    'access-control-allow-headers':'authorization, apikey, content-type, x-client-info',
    'access-control-allow-methods':'POST, OPTIONS'
   }});
   return;
  }
  submitted.push(request.postDataJSON() as EnquiryBody);
  await route.fulfill({status:200,contentType:'application/json',
   headers:{'access-control-allow-origin':'*'},
   body:JSON.stringify({ok:true,message:'Synthetic acceptance; no real CRM record was created.'})});
 });
 return submitted;
}
test.describe('UniPathway synthetic browser acceptance (no live database)',()=>{
 test('IELTS form cannot submit until explicit challenge and privacy consent',async({page})=>{
  await syntheticTurnstile(page);
  const submitted=await stubEnquiry(page);
  await page.goto('/ielts-preparation');
  const form=page.locator('#ielts-enquiry');
  await expect(form).toBeVisible();
  await expect(form.getByRole('heading',{name:'Enquire about IELTS preparation'})).toBeVisible();
  await expect(form.getByRole('button',{name:'Request counselling'})).toBeDisabled();
  await form.getByRole('button',{name:'Complete simulated challenge'}).click();
  await expect(form.getByRole('button',{name:'Request counselling'})).toBeEnabled();
  await form.getByLabel('Full name').fill('Synthetic Learner');
  await form.getByLabel('Email address').fill('student.synthetic@example.invalid');
  await form.getByLabel('IELTS test type').selectOption('academic');
  await form.getByRole('checkbox').check();
  await form.getByRole('button',{name:'Request counselling'}).click();
  await expect(form.getByText('Enquiry received')).toBeVisible();
  expect(submitted).toHaveLength(1);
  expect(submitted[0]).toMatchObject({
   kind:'ielts',tenant_slug:'unipathway',test_type:'academic',
   student_origin:'external_student',consent:true,
   captcha_token:'synthetic-challenge-for-browser-test'
  });
  await expect(page.getByText(/not an official IELTS exam|not the official examination/i).first()).toBeVisible();
 });
 test('Pakistani university counselling is independent of OTHM or Qualifi enrolment',async({page})=>{
  await syntheticTurnstile(page);
  const submitted=await stubEnquiry(page);
  await page.goto('/pathways');
  await expect(page).toHaveURL(/\/tenant\/unipathway\/pathways/);
  const form=page.locator('#progression-enquiry');
  await expect(form).toBeVisible();
  await form.getByLabel('Full name').fill('Synthetic University Applicant');
  await form.getByLabel('Email address').fill('university.synthetic@example.invalid');
  await form.getByLabel('Destination country').selectOption('Pakistan');
  await form.getByLabel('Current or intended qualification').selectOption('Qualifi');
  await form.getByRole('checkbox').check();
  await form.getByRole('button',{name:'Complete simulated challenge'}).click();
  await form.getByRole('button',{name:'Request counselling'}).click();
  await expect(form.getByText('Enquiry received')).toBeVisible();
  expect(submitted).toHaveLength(1);
  expect(submitted[0]).toMatchObject({
   kind:'university',destination:'Pakistan',prior_qualification:'Qualifi',consent:true,
   student_origin:'external_student'
  });
 });
 test('anonymous visitors cannot open any protected IELTS staff/student workspace',async({page})=>{
  for(const path of ['/student/ielts','/lecturer/ielts','/exams/ielts','/director/ielts']){
   await page.goto(path);
   await expect(page).toHaveURL(/\/login(?:[/?#]|$)/);
   await expect(page.getByRole('button',{name:/sign in|log in/i}).first()).toBeVisible();
  }
 });
 test('mobile IELTS enquiry remains operable with accessible labels',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await syntheticTurnstile(page);
  await page.goto('/ielts-preparation');
  const form=page.locator('#ielts-enquiry');
  await form.scrollIntoViewIfNeeded();
  await expect(form.getByLabel('Full name')).toBeVisible();
  await expect(form.getByLabel('Email address')).toBeVisible();
  await expect(form.getByRole('checkbox')).toBeVisible();
  await expect(form.getByRole('button',{name:'Request counselling'})).toBeDisabled();
 });
});
