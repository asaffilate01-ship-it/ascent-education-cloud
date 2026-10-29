import {act,cleanup,render,screen,within} from '@testing-library/react';
import {fireEvent} from '@testing-library/react';
import {MemoryRouter,useLocation,useNavigate} from 'react-router-dom';
import {afterEach,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import CreativeCrafts from '@/pages/promo/CreativeCrafts';
import {studyLinks} from '@/components/PublicNav';
import {publicSeo,SITE_URL} from '@/lib/publicSeo';
import {isPublicMobilePath} from '@/lib/mobileTabRoutes';

vi.mock('@/components/PublicNav',async()=>{const m=await vi.importActual<typeof import('@/components/PublicNav')>('@/components/PublicNav');return {...m,default:()=>null};});
vi.mock('@/components/PublicFooter',()=>({default:()=>null}));
vi.mock('@/components/Seo',()=>({default:()=>null}));
vi.mock('@/components/PageContents',()=>({default:()=>null}));
vi.mock('@/components/CourseAtAGlance',()=>({default:()=>null}));
vi.mock('@/components/PublicHero',()=>({default:({children}:any)=><div>{children}</div>}));

afterEach(cleanup);
function Location(){const location=useLocation(),navigate=useNavigate();return <><output data-testid="url">{location.search}{location.hash}</output><button onClick={()=>navigate(-1)}>Go back</button></>;}
async function mount(url='/creative-crafts'){await act(async()=>{render(<MemoryRouter initialEntries={[url]}><CreativeCrafts/><Location/></MemoryRouter>);});}
const options=()=>within(screen.getByRole('region',{name:'Choose the craft, then the business skills around it'})).getAllByRole('article');

it('lists all eight craft and selling options with the sewing course included',async()=>{
 await mount();
 expect(options()).toHaveLength(8);
 expect(screen.getByRole('heading',{name:'Sewing and tailoring for women'})).toBeInTheDocument();
 expect(screen.getByRole('heading',{name:'Market and sell your handmade products'})).toBeInTheDocument();
});

it('narrows craft options by search text and by learning format',async()=>{
 await mount();
 fireEvent.change(screen.getByLabelText(/Search crafts and skills/),{target:{value:'sewing'}});
 expect(options()).toHaveLength(1);
 expect(options()[0]).toHaveTextContent('Sewing and tailoring for women');
 fireEvent.change(screen.getByLabelText(/Search crafts and skills/),{target:{value:''}});
 fireEvent.change(screen.getByLabelText('Learning format'),{target:{value:'Workshop'}});
 expect(options()).toHaveLength(3);
 expect(options().every(card=>card.textContent?.includes('Workshop'))).toBe(true);
});

it('keeps craft enquiries on-site through the admissions contact form',async()=>{
 await mount();
 const sewingCard=options().find(card=>card.textContent?.includes('Sewing and tailoring for women'))!;
 const url=new URL(within(sewingCard).getByRole('link',{name:'Request course details'}).getAttribute('href')!,'https://unipathway.pk');
 expect(url.pathname).toBe('/contact');
 expect(url.searchParams.get('course')).toBe('Women’s creative enterprise: Sewing and tailoring for women');
});


it('publishes sewing and craft search metadata, a sitemap entry and navigation links',()=>{
 const page=publicSeo['/creative-crafts'];
 expect(page.title).toContain('Art, Crafts & Sewing Courses in Pakistan');
 expect(page.keywords).toContain('art and craft courses Pakistan');
 expect(page.keywords).toContain('fine art courses Pakistan');
 expect(page.keywords).toContain('sewing courses in Pakistan');
 expect(page.keywords).toContain('tailoring courses for women in Pakistan');

 expect(readFileSync('public/sitemap.xml','utf8')).toContain(`<loc>${SITE_URL}/creative-crafts</loc>`);
 expect(studyLinks.some(link=>link.to==='/creative-crafts'&&link.label.includes('Sewing'))).toBe(true);
 expect(isPublicMobilePath('/creative-crafts')).toBe(true);
});

it('restores craft filters from a shared URL and preserves campaign and fragment through history and reset',async()=>{
 await mount('/creative-crafts?q=sewing&format=Short+course&utm_source=partner#crafts-options-heading');
 expect(options()).toHaveLength(1);expect(screen.getByLabelText('Learning format')).toHaveValue('Short course');
 fireEvent.change(screen.getByLabelText('Learning format'),{target:{value:'Workshop'}});
 expect(screen.getByText('No craft matches that search yet.')).toBeInTheDocument();
 expect(screen.getByTestId('url')).toHaveTextContent('utm_source=partner');
 fireEvent.click(screen.getByText('Go back'));expect(options()).toHaveLength(1);
 fireEvent.click(screen.getByText('Clear craft filters'));
 expect(screen.getByTestId('url')).toHaveTextContent('?utm_source=partner#crafts-options-heading');
 expect(screen.getByLabelText(/Search crafts and skills/)).toHaveFocus();expect(options()).toHaveLength(8);
});
it('bounds external search and recovers from an invalid format without losing literal search values',async()=>{
 await mount('/creative-crafts?format=Unknown&q='+('x'.repeat(180)));
 expect(screen.getByLabelText('Learning format')).toHaveValue('All');expect(screen.getByLabelText(/Search crafts and skills/)).toHaveValue('x'.repeat(120));
 fireEvent.click(screen.getByText('Show all craft options'));expect(options()).toHaveLength(8);expect(screen.getByLabelText(/Search crafts and skills/)).toHaveFocus();
 fireEvent.change(screen.getByLabelText(/Search crafts and skills/),{target:{value:'All'}});expect(screen.getByTestId('url')).toHaveTextContent('q=All');
});
