import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {MemoryRouter,Route,Routes,useLocation} from 'react-router-dom';
import {afterEach,expect,it,vi} from 'vitest';
import ApplyStart from '@/pages/promo/ApplyStart';
import {courseEnquiryPrefill,courseInterestEnquiryUrl,courseInterestEditUrl,courseInterestFromParams} from '@/lib/courseInterest';

vi.mock('@/components/PublicNav',()=>({default:()=>null}));
vi.mock('@/components/PublicFooter',()=>({default:()=>null}));
vi.mock('@/components/Seo',()=>({default:()=>null}));
afterEach(cleanup);

function Destination(){
 const location=useLocation();
 return <p data-testid="destination">{location.pathname}{location.search}{location.hash}</p>;
}
function mount(){
 return render(<MemoryRouter initialEntries={['/apply']}><Routes>
  <Route path="/apply" element={<ApplyStart/>}/>
  <Route path="/contact" element={<Destination/>}/>
 </Routes></MemoryRouter>);
}
it('guides Pakistan learners through an accessible course-interest enquiry, not an enrolment',()=>{
 mount();
 const continueButton=screen.getByRole('button',{name:'Continue to course enquiry'});
 expect(continueButton).toBeDisabled();
 expect(screen.getByRole('link',{name:'Start UK application'})).toHaveAttribute('href','/tenant/unipathway/apply/uk');
 expect(screen.getByRole('link',{name:'Start Germany application'})).toHaveAttribute('href','/tenant/unipathway/apply/germany');
 fireEvent.change(screen.getByLabelText(/What would you like to study\?/),{target:{value:'qualifications'}});
 fireEvent.change(screen.getByLabelText('Preferred level'),{target:{value:'level-4'}});
 fireEvent.change(screen.getByLabelText('Preferred study format'),{target:{value:'online'}});
 expect(continueButton).toBeEnabled();
 fireEvent.click(continueButton);
 const url=screen.getByTestId('destination').textContent!;
 expect(url).toMatch(/^\/contact\?/);
 const parsed=new URL(url,'https://example.invalid');
 expect(parsed.searchParams.get('subject')).toBe('Course Enquiry');
 expect(parsed.searchParams.get('area')).toBe('qualifications');
 expect(parsed.searchParams.get('mode')).toBe('online');
 expect(parsed.searchParams.get('level')).toBe('level-4');
 expect(parsed.hash).toBe('#contact-form');
});
it('rejects unknown course interest and delivery codes instead of reflecting them in the URL',()=>{
 expect(courseInterestEnquiryUrl({area:'nonexistent',mode:'online'})).toBe('/contact?subject=Course+Enquiry');
 const url=new URL(courseInterestEnquiryUrl({area:'tuition',mode:'forged',level:'unknown'}),'https://example.invalid');
 expect(url.searchParams.get('area')).toBe('tuition');
 expect(url.searchParams.has('mode')).toBe(false);
 expect(url.searchParams.has('level')).toBe(false);
});
it('creates a readable, advisory enquiry and preserves legacy published course links',()=>{
 const params=new URLSearchParams('area=vocational&level=short&mode=blended');
 const prefill=courseEnquiryPrefill(params);
 expect(prefill.subject).toBe('Course Enquiry');
 expect(prefill.message).toContain('Vocational, SIA and CPD enquiries');
 expect(prefill.message).toContain('Short or vocational course');
 expect(prefill.message).toContain('Blended online and centre-based study');
 expect(prefill.message).toContain('approval where applicable');
 const legacy=courseEnquiryPrefill(new URLSearchParams('course=Sewing'));
 expect(legacy.message).toContain('Sewing');
 expect(courseEnquiryPrefill(new URLSearchParams('subject=Other')).message).toBe('');
});

it('preserves an exact catalogue selection when editing without reflecting personal or arbitrary URL values',()=>{
 const title='OTHM Level 4 Diploma in Business Management';
 const params=new URLSearchParams({area:'qualifications',course:title,level:'level-6',mode:'blended',email:'private@example.invalid',message:'private draft',availability:'open'});
 const edit=courseInterestEditUrl(params);
 const restored=courseInterestFromParams(new URL(edit,'https://example.invalid').searchParams);
 expect(restored).toEqual({area:'qualifications',course:title,level:'level-4',mode:'blended'});
 expect(edit).not.toContain('private');
 expect(edit).not.toContain('availability');
 expect(courseEnquiryPrefill(params).message).toContain('Level 4');
 expect(courseEnquiryPrefill(params).message).not.toContain('Level 6');
 expect(courseInterestEditUrl(new URLSearchParams('course=unrecognised&area=forged'))).toBe('/apply');
});
it('restores general study preferences and offers Level 6 without a conflicting range label',()=>{
 const url=courseInterestEditUrl(new URLSearchParams('area=qualifications&level=level-6&mode=online'));
 render(<MemoryRouter initialEntries={[url]}><ApplyStart/></MemoryRouter>);
 expect(screen.getByLabelText(/What would you like to study/)).toHaveValue('qualifications');
 expect(screen.getByLabelText('Preferred level')).toHaveValue('level-6');
 expect(screen.getByLabelText('Preferred study format')).toHaveValue('online');
 expect(screen.getByRole('option',{name:'UK qualification pathways (confirm your level)'})).toBeInTheDocument();
});
