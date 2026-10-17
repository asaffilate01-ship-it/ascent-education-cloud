import {afterEach,beforeEach,it,expect,vi} from 'vitest';
import {cleanup,render,screen,waitFor} from '@testing-library/react';

const mocks=vi.hoisted(()=>({
 filters:[] as [string,unknown][],
 row:{
  id:'evidence-1',tenant_id:'centre-1',awarding_body:'OTHM',
  qualification_name:'Business Diploma',qualification_level:'Level 5',
  destination_country:'UK',destination_institution:'Example University',
  destination_programme:'Business Top-up',grade_requirements:'Merit subject to review',
  english_requirements:'Institution to confirm',entry_stage:'Final year',
  source_url:'https://example.edu/official-progression',source_kind:'university_official_page',
  review_status:'verified',student_visible:true,reviewed_at:'2026-10-17T12:00:00Z',recheck_due:'2027-04-17'
 }
}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{from:()=>{
 const chain={
  select:()=>chain,
  eq:(k:string,v:unknown)=>{mocks.filters.push([k,v]);return chain;},
  order:()=>chain,
  limit:async()=>({data:[mocks.row],error:null}),
 };
 return chain;
}}}));
import AcademicEvidenceDirectory from '@/components/progression/AcademicEvidenceDirectory';
beforeEach(()=>{mocks.filters.length=0;});
afterEach(cleanup);

it('students are shown published sources and never invited to approve a university',async()=>{
 render(<AcademicEvidenceDirectory tenant="centre-1" student manager={false}/>);
 expect(await screen.findByText('Example University')).toBeInTheDocument();
 expect(screen.getByText('Business Top-up')).toBeInTheDocument();
 expect(screen.getByRole('link',{name:/Open published evidence/})).toHaveAttribute('href','https://example.edu/official-progression');
 expect(screen.queryByRole('button',{name:/Verify & publish/})).not.toBeInTheDocument();
 expect(screen.queryByRole('button',{name:/Add academic evidence/})).not.toBeInTheDocument();
 await waitFor(()=>{
  expect(mocks.filters).toContainEqual(['tenant_id','centre-1']);
  expect(mocks.filters).toContainEqual(['student_visible',true]);
  expect(mocks.filters).toContainEqual(['review_status','verified']);
 });
});
