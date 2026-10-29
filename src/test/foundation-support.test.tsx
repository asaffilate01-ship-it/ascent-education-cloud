import {cleanup,render,screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,expect,it,vi} from 'vitest';
import FoundationScholarships from '@/pages/promo/FoundationScholarships';
vi.mock('@/components/PublicNav',()=>({default:()=>null}));vi.mock('@/components/PublicFooter',()=>({default:()=>null}));vi.mock('@/components/PageContents',()=>({default:()=>null}));vi.mock('@/components/Seo',()=>({default:()=>null}));vi.mock('@/components/PublicHero',()=>({default:({children}:{children:React.ReactNode})=><div>{children}</div>}));
afterEach(cleanup);
function mount(){render(<MemoryRouter><FoundationScholarships/></MemoryRouter>);}
it('offers circumstance-based reduced and fully funded study for gifted students with broader talent criteria',()=>{
 mount();expect(screen.getByText(/our charitable education-support service for talented/)).toHaveTextContent('less privileged backgrounds in Pakistan');
 expect(screen.getByRole('heading',{name:'Reduced-fee study'})).toBeInTheDocument();expect(screen.getByRole('heading',{name:'Fully funded tuition'})).toBeInTheDocument();
 expect(screen.getByText(/creative portfolios/)).toHaveTextContent('exam results alone do not decide an award');
 expect(screen.getByText(/Each written award/)).toHaveTextContent('whether exam, awarding-body, equipment, travel or residential costs are included');
});
it('separates student and employer enquiries while preserving their Foundation purpose',()=>{
 mount();for(const [name,course] of [['Ask about student fee support','UniPathway Foundation: student fee support'],['Help fund a student','UniPathway Foundation: employer co-funding and placements']]){
  const url=new URL(screen.getByRole('link',{name}).getAttribute('href')!,'https://unipathway.pk');expect(url.pathname).toBe('/contact');expect(url.searchParams.get('course')).toBe(course);
 }
});
it('includes employer co-funding and optional work opportunities with confidential review and no guaranteed award or job',()=>{
 mount();expect(screen.getByText(/We invite employers/)).toHaveTextContent('part-fund');expect(screen.getByRole('heading',{name:'From supported learning to work opportunities'})).toBeInTheDocument();
 expect(screen.getByText(/Placements and recruitment are separate/)).toHaveTextContent('student choice');expect(screen.getByText(/Placements and recruitment are separate/)).toHaveTextContent('does not guarantee an internship or job');
 expect(screen.getByText(/This page does not claim/)).toHaveTextContent('registered-charity status');expect(screen.getByText(/An enquiry does not confirm/)).toBeInTheDocument();
});
