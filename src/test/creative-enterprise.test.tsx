import {cleanup,render,screen,within} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,expect,it} from 'vitest';
import WomenCreativeEnterprise from '@/components/WomenCreativeEnterprise';
import {creativeEnterpriseCourses} from '@/lib/creativeEnterprise';
afterEach(cleanup);
it('targets women entrepreneurs with distinct art/craft and selling learning options',()=>{
 render(<MemoryRouter><WomenCreativeEnterprise/></MemoryRouter>);
 const section=screen.getByRole('region',{name:'Fine art and crafts for women building a business'});
 expect(section).toHaveTextContent('Specifically designed for women in Pakistan');
 expect(section).toHaveTextContent('microbusiness');expect(section).toHaveTextContent('ecommerce');
 expect(within(section).getAllByRole('article')).toHaveLength(7);
 expect(creativeEnterpriseCourses.filter(c=>c.format==='Short course')).toHaveLength(4);
 expect(creativeEnterpriseCourses.filter(c=>c.format==='Workshop')).toHaveLength(3);
 expect(section).toHaveTextContent('profit-aware pricing');expect(section).toHaveTextContent('tracking results');
 expect(section).toHaveTextContent('They are not Pearson qualifications and do not carry HNC or HND credits.');
});
it('passes the selected course to admissions without starting registration or payment',()=>{
 render(<MemoryRouter><WomenCreativeEnterprise/></MemoryRouter>);
 for(const course of creativeEnterpriseCourses){
  const link=screen.getByRole('link',{name:`Enquire about ${course.title}`});
  const url=new URL(link.getAttribute('href')!,'https://unipathway.pk');
  expect(url.pathname).toBe('/contact');expect(url.searchParams.get('course')).toBe(`Women’s creative enterprise: ${course.title}`);
 }
 expect(screen.getByText(/Dates, duration, fees, materials/)).toBeInTheDocument();
});
