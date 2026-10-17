import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {fireEvent,render,screen,waitFor,cleanup} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
const mocks=vi.hoisted(()=>({invoke:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{functions:{invoke:mocks.invoke}}}));
import InternationalEnquiryForm from '@/components/enquiry/InternationalEnquiryForm';

function fillBasic(){
 fireEvent.change(screen.getByLabelText(/Full name/),{target:{value:'External Learner'}});
 fireEvent.change(screen.getByLabelText(/Email address/),{target:{value:'learner@example.com'}});
 fireEvent.click(screen.getByRole('checkbox'));
}
beforeEach(()=>{mocks.invoke.mockResolvedValue({data:{ok:true},error:null});});
afterEach(()=>{cleanup();vi.clearAllMocks();});

describe('Public UniPathway enquiries',()=>{
 it('lets an external IELTS learner request counselling without an OTHM enrolment',async()=>{
   render(<MemoryRouter><InternationalEnquiryForm kind="ielts"/></MemoryRouter>);
   fillBasic();
   fireEvent.change(screen.getByLabelText(/IELTS test type/),{target:{value:'general'}});
   fireEvent.click(screen.getByRole('button',{name:/Request counselling/}));
   await waitFor(()=>expect(mocks.invoke).toHaveBeenCalledTimes(1));
   const [functionName,payload]=mocks.invoke.mock.calls[0];
   expect(functionName).toBe('unipathway-public-enquiry');
   expect(payload.body).toMatchObject({kind:'ielts',tenant_slug:'unipathway',test_type:'general',student_origin:'external_student',email:'learner@example.com',consent:true});
   expect(await screen.findByText('Enquiry received')).toBeInTheDocument();
 });
 it('passes Pakistani university progression enquiries into the same admissions queue',async()=>{
   render(<MemoryRouter><InternationalEnquiryForm kind="university"/></MemoryRouter>);
   fillBasic();
   fireEvent.change(screen.getByLabelText(/Destination country/),{target:{value:'Pakistan'}});
   fireEvent.change(screen.getByLabelText(/Current or intended qualification/),{target:{value:'Qualifi'}});
   fireEvent.click(screen.getByRole('button',{name:/Request counselling/}));
   await waitFor(()=>expect(mocks.invoke).toHaveBeenCalledTimes(1));
   expect(mocks.invoke.mock.calls[0][1].body).toMatchObject({kind:'university',destination:'Pakistan',prior_qualification:'Qualifi'});
 });
 it('does not send an enquiry without privacy acknowledgement',async()=>{
   render(<MemoryRouter><InternationalEnquiryForm kind="ielts"/></MemoryRouter>);
   fireEvent.change(screen.getByLabelText(/Full name/),{target:{value:'Student Name'}});
   fireEvent.change(screen.getByLabelText(/Email address/),{target:{value:'learner@example.com'}});
   fireEvent.click(screen.getByRole('button',{name:/Request counselling/}));
   expect(mocks.invoke).not.toHaveBeenCalled();
 });
});
