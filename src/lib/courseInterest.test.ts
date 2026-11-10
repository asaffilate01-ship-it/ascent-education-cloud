import {describe,expect,it} from 'vitest';
import {courseEnquiryPrefill,courseInterestEnquiryUrl,courseInterestFromParams} from './courseInterest';
import {qualificationSelection} from './qualificationSelection';

const qualification = qualificationSelection.find(item=>item.level===4)!;
const course = `${qualification.body} ${qualification.name}`;

describe('guided course enquiries',()=>{
 it('preserves a known qualification, level and mode throughout the journey',()=>{
  const requested = new URLSearchParams({area:'qualifications',course,level:'level-4',mode:'blended'});
  const choice = courseInterestFromParams(requested);
  expect(choice).toEqual({area:'qualifications',level:'level-4',mode:'blended',course});
  const url = courseInterestEnquiryUrl(choice);
  const params = new URL(url,'https://unipathway.pk').searchParams;
  expect(params.get('course')).toBe(course);
  expect(params.get('area')).toBe('qualifications');
  expect(params.get('mode')).toBe('blended');
  expect(params.get('level')).toBe('level-4');
  const message = courseEnquiryPrefill(params);
  expect(message.summary).toBe(course);
  expect(message.message).toContain('My preferred study format is');
  expect(url.endsWith('#contact-form')).toBe(true);
 });
 it('refuses unrecognised course strings and unsupported URL values',()=>{
  const choice = courseInterestFromParams(new URLSearchParams({area:'technology',course:'NOT A COURSE',level:'level-42',mode:'internal'}));
  expect(choice).toEqual({area:'technology',level:'unsure',mode:'undecided',course:undefined});
  expect(new URL(courseInterestEnquiryUrl({...choice,course:'NOT A COURSE'}),'https://unipathway.pk').searchParams.has('course')).toBe(false);
 });
 it('never carries a qualification title into a different study area',()=>{
  const params = new URL(courseInterestEnquiryUrl({area:'tuition',course,level:'school'}),'https://unipathway.pk').searchParams;
  expect(params.has('course')).toBe(false);
 });
 it('supports Level 6 catalogue entries without falling back to a lower level',()=>{
  const higher=qualificationSelection.find(item=>item.level===6)!;
  const choice=courseInterestFromParams(new URLSearchParams({course:`${higher.body} ${higher.name}`}));
  expect(choice.area).toBe('qualifications');
  expect(choice.level).toBe('level-6');
 });
 it('leaves unsupported selections out of the enquiry address',()=>{
  const address=courseInterestEnquiryUrl({area:'qualifications',mode:'unauthorised',level:'level-99'});
  expect(address).toBe('/contact?subject=Course+Enquiry&area=qualifications#contact-form');
 });
});
