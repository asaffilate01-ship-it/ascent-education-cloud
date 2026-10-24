import {afterEach,expect,it} from 'vitest';
import {render,cleanup} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {readFileSync} from 'node:fs';
import Seo from '@/components/Seo';
import RouteIndexing from '@/components/RouteIndexing';
import {publicSeo,cleanSeoPath,isIndexablePath,SITE_URL} from '@/lib/publicSeo';
afterEach(()=>{cleanup();document.head.innerHTML='';});
it('provides unique metadata and sitemap entries for all approved public pages',()=>{
 const sitemap=readFileSync('public/sitemap.xml','utf8');const titles=new Set();
 for(const [path,page] of Object.entries(publicSeo)){expect(page.description.length).toBeGreaterThan(60);expect(page.description.length).toBeLessThan(200);expect(titles.has(page.title)).toBe(false);titles.add(page.title);expect(sitemap).toContain(`<loc>${SITE_URL}${path}</loc>`);}
 expect(sitemap).not.toContain('/student/');expect(sitemap).not.toContain('/apply/');
});
it('does not block public pages through private prefix rules',()=>{
 const rules=readFileSync('public/robots.txt','utf8').split('\n').filter(x=>x.startsWith('Disallow: ')).map(x=>x.slice(10));
 for(const path of Object.keys(publicSeo))for(const rule of rules)expect(rule.endsWith('$')?path===rule.slice(0,-1):path.startsWith(rule)).toBe(false);
});
it('uses clean canonical paths without marketing query strings or fragments',()=>{expect(cleanSeoPath('/tenant/unipathway/uk/?utm_source=test#apply')).toBe('/uk');expect(isIndexablePath('/student/coursework')).toBe(false);expect(isIndexablePath('/europe/nonexistent')).toBe(false);});
it('renders the shared SEO data, absolute social image and one canonical',()=>{
 render(<MemoryRouter initialEntries={['/tenant/unipathway/uk?utm_source=test']}><Seo title="Old" description="Old" canonical="/uk"/></MemoryRouter>);
 expect(document.title).toBe(publicSeo['/uk'].title);expect(document.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute('href',SITE_URL+'/uk');expect(document.querySelector('meta[property="og:image"]')).toHaveAttribute('content',SITE_URL+'/brand/unipathway-social.png');
 expect(JSON.parse(document.querySelector('script[data-seo="breadcrumb"]')!.textContent!).itemListElement).toHaveLength(2);
});
it('removes stale public canonical and marks private routes noindex',()=>{
 document.head.innerHTML='<link rel="canonical" href="https://unipathway.pk/uk"><meta name="robots" content="index, follow">';
 render(<MemoryRouter initialEntries={['/student']}><RouteIndexing/></MemoryRouter>);expect(document.querySelector('link[rel="canonical"]')).toBeNull();expect(document.querySelector('meta[name="robots"]')).toHaveAttribute('content','noindex, follow');
});
