import {act,cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {MemoryRouter,useLocation,useNavigate} from 'react-router-dom';
import {afterEach,expect,it,vi} from 'vitest';
import QualificationsCatalogue from '@/pages/promo/QualificationsCatalogue';
vi.mock('@/lib/db',()=>({db:{from:()=>({select:()=>({eq:()=>Promise.resolve({data:[],error:null})})})}}));
vi.mock('@/components/PublicNav',()=>({default:()=>null}));vi.mock('@/components/PublicFooter',()=>({default:()=>null}));vi.mock('@/components/Seo',()=>({default:()=>null}));vi.mock('@/components/PageContents',()=>({default:()=>null}));vi.mock('@/components/AwardingBodyGuidance',()=>({default:()=>null}));vi.mock('@/components/PublicHero',()=>({default:({children}:any)=><div>{children}</div>}));vi.mock('@/components/CourseAtAGlance',()=>({default:()=>null}));
afterEach(cleanup);
function Location(){const location=useLocation(),navigate=useNavigate();return <><output data-testid="url">{location.search}</output><output data-testid="fragment">{location.hash}</output><button onClick={()=>navigate(-1)}>Browser back</button><button onClick={()=>navigate(1)}>Browser forward</button></>;}
async function mount(url:string){let view;await act(async()=>{view=render(<MemoryRouter initialEntries={[url]}><QualificationsCatalogue/><Location/></MemoryRouter>);});return view;}
const params=()=>new URLSearchParams(screen.getByTestId('url').textContent||'');
it('restores all public filters from a shared URL and preserves unrelated context when changing body',async()=>{
 await mount('/qualifications?body=OTHM&subject=Business&q=business&utm_source=partner#qualification-results');
 expect(screen.getByLabelText('Search programmes')).toHaveValue('business');expect(screen.getByRole('combobox',{name:'Subject'})).toHaveValue('Business');expect(screen.getByRole('button',{name:'OTHM'})).toHaveAttribute('aria-pressed','true');
 fireEvent.click(screen.getByRole('button',{name:'Qualifi'}));expect(params().get('body')).toBe('Qualifi');expect(params().get('subject')).toBe('Business');expect(params().get('q')).toBe('business');expect(params().get('utm_source')).toBe('partner');expect(screen.getByTestId('fragment')).toHaveTextContent('#qualification-results');
 expect(within(screen.getByLabelText('Proposed qualifications')).getAllByRole('article').every(el=>el.textContent?.includes('Qualifi'))).toBe(true);
 fireEvent.click(screen.getByText('Browser back'));expect(screen.getByRole('button',{name:'OTHM'})).toHaveAttribute('aria-pressed','true');fireEvent.click(screen.getByText('Browser forward'));expect(screen.getByRole('button',{name:'Qualifi'})).toHaveAttribute('aria-pressed','true');
});
it('keeps live search in the URL and commits subject changes without dropping the search',async()=>{
 await mount('/qualifications?campaign=october');fireEvent.change(screen.getByLabelText('Search programmes'),{target:{value:'business'}});expect(params().get('q')).toBe('business');
 fireEvent.change(screen.getByRole('combobox',{name:'Subject'}),{target:{value:'Business'}});expect(params().get('subject')).toBe('Business');expect(params().get('campaign')).toBe('october');
 fireEvent.click(screen.getByText('Browser back'));expect(screen.getByRole('combobox',{name:'Subject'})).toHaveValue('All');expect(screen.getByLabelText('Search programmes')).toHaveValue('business');
 fireEvent.change(screen.getByLabelText('Search programmes'),{target:{value:'All'}});expect(params().get('q')).toBe('All');
});
it('recovers from empty results by clearing only known filters and returning focus to search',async()=>{
 await mount('/qualifications?body=OTHM&subject=Business&q=zz-no-option&utm_source=partner');expect(screen.getByText(/No matching qualifications/)).toBeInTheDocument();
 fireEvent.click(screen.getByText('Reset qualification search'));expect(params().get('utm_source')).toBe('partner');for(const key of ['body','q','subject'])expect(params().has(key)).toBe(false);
 expect(screen.getByLabelText('Search programmes')).toHaveFocus();expect(within(screen.getByLabelText('Proposed qualifications')).getAllByRole('article').length).toBeGreaterThan(0);
});
it('ignores invalid body/subject values without crashing and bounds externally supplied search text',async()=>{
 await mount('/qualifications?body=Unknown&subject=Unknown&q='+('x'.repeat(200)));expect(screen.getByRole('button',{name:'All catalogue options'})).toHaveAttribute('aria-pressed','true');expect(screen.getByRole('combobox',{name:'Subject'})).toHaveValue('All');expect(screen.getByLabelText('Search programmes')).toHaveValue('x'.repeat(120));
 fireEvent.click(screen.getByText('Clear qualification filters'));expect(params().toString()).toBe('');
});
it('finds both Pearson Fine Art awards by craft focus and displays the correct staged curriculum',async()=>{
 await mount('/qualifications?body=Pearson+BTEC&subject=Fine+Art+%26+Craft&q=textile');
 expect(screen.getByRole('button',{name:'Pearson BTEC'})).toHaveAttribute('aria-pressed','true');
 const cards=within(screen.getByLabelText('Proposed qualifications')).getAllByRole('article');expect(cards).toHaveLength(2);
 expect(cards[0]).toHaveTextContent('610/1794/2');expect(cards[0]).toHaveTextContent('120 credits');expect(cards[0]).not.toHaveTextContent('B1');
 expect(cards[1]).toHaveTextContent('610/1795/4');expect(cards[1]).toHaveTextContent('240 credits overall: 120 at Level 4 plus 120 at Level 5');
 expect(cards[1]).toHaveTextContent('B2 · Professional Project');expect(cards[0]).toHaveTextContent('not additional Pearson units or extra credits');
 expect(within(cards[0]).getByRole('link',{name:/Pearson Fine Art specification/})).toHaveAttribute('href',expect.stringContaining('qualifications.pearson.com'));
});
