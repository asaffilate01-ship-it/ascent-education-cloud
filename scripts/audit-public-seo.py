#!/usr/bin/env python3
"""Read-only HTTP SEO audit. Raw HTML findings are not a rendered-page or ranking score."""
import argparse, concurrent.futures, datetime, json, time, urllib.request, urllib.error
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse
import xml.etree.ElementTree as ET

class Document(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True); self.title=''; self.in_title=False; self.meta={}; self.canonicals=[]; self.h1=0; self.schemas=[]; self.schema_text=None; self.links=[]; self.lang=None
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=='html': self.lang=a.get('lang')
        if tag=='title': self.in_title=True
        if tag=='h1': self.h1+=1
        if tag=='meta': self.meta.setdefault((a.get('name') or a.get('property') or '').lower(),[]).append(a.get('content',''))
        if tag=='link' and 'canonical' in a.get('rel','').lower().split(): self.canonicals.append(a.get('href',''))
        if tag=='script' and a.get('type')=='application/ld+json': self.schema_text=''
        if tag=='a' and a.get('href'): self.links.append(a['href'])
    def handle_data(self,data):
        if self.in_title:self.title+=data
        if self.schema_text is not None:self.schema_text+=data
    def handle_endtag(self,tag):
        if tag=='title':self.in_title=False
        if tag=='script' and self.schema_text is not None:
            try:self.schemas.append(json.loads(self.schema_text))
            except json.JSONDecodeError:self.schemas.append({'parse_error':True})
            self.schema_text=None

def fetch(url,agent='UniPathway-SEO-Review/1.0'):
    start=time.monotonic()
    try:
        response=urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':agent}),timeout=18)
    except urllib.error.HTTPError as e: response=e
    except (urllib.error.URLError,TimeoutError,OSError) as e:return {'requested_url':url,'error':type(e).__name__}
    with response:
        raw=response.read(2_000_001);text=raw.decode('utf8',errors='replace')
        return {'requested_url':url,'final_url':response.url,'status':response.status,'content_type':response.headers.get('content-type',''),'x_robots_tag':response.headers.get('x-robots-tag'),'hsts':response.headers.get('strict-transport-security'),'seconds_observed':round(time.monotonic()-start,3),'bytes':len(raw),'truncated':len(raw)>2_000_000,'text':text}

def inspect(result,expected_url=None,expected=None):
    page={k:v for k,v in result.items() if k!='text'}
    if 'error' in page:return page
    doc=Document();doc.feed(result.get('text',''));page.update(title=doc.title,description=doc.meta.get('description',[]),robots=doc.meta.get('robots',[]),canonicals=doc.canonicals,og_url=doc.meta.get('og:url',[]),og_image=doc.meta.get('og:image',[]),lang=doc.lang,raw_h1_count=doc.h1,raw_link_count=len(doc.links),schema_types=[s.get('@type') for s in doc.schemas if isinstance(s,dict)],schema_parse_errors=sum(bool(s.get('parse_error')) for s in doc.schemas if isinstance(s,dict)))
    issues=[]
    if page['status']!=200:issues.append('non_200_public_url')
    if expected_url and doc.canonicals!=[expected_url]:issues.append('canonical_mismatch_or_duplicate')
    if expected_url and doc.meta.get('og:url')!=[expected_url]:issues.append('og_url_mismatch')
    if expected_url and (any('noindex' in x.lower() for x in doc.meta.get('robots',[])) or 'noindex' in (page['x_robots_tag'] or '').lower()):issues.append('noindex_on_public_url')
    if expected and doc.title!=expected['title']:issues.append('title_differs_from_catalogue')
    if expected and doc.meta.get('description')!=[expected['description']]:issues.append('description_differs_from_catalogue')
    if not doc.title:issues.append('missing_title')
    if not doc.meta.get('description'):issues.append('missing_description')
    if page['schema_parse_errors']:issues.append('invalid_raw_json_ld')
    page['issues']=issues
    return page

def run(origin,output):
    catalogue=json.loads(Path('src/data/public-seo.json').read_text());site=origin.rstrip('/')
    sitemap=fetch(site+'/sitemap.xml');robots=fetch(site+'/robots.txt')
    try:sitemap_urls=[e.text for e in ET.fromstring(sitemap.get('text','')).iter('{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]
    except ET.ParseError:sitemap_urls=[]
    def page(path):return inspect(fetch(site+path),site+path,catalogue[path])
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:pages=list(pool.map(page,catalogue))
    probes={p:inspect(fetch(site+p)) for p in ['/login','/apply','/seo-audit-not-a-real-page-20261030','/tuition/']}
    variants={u:inspect(fetch(u)) for u in ['http://unipathway.pk/','https://www.unipathway.pk/']}
    titles=Counter(p.get('title') for p in pages if p.get('title'));descriptions=Counter(p.get('description',[''])[0] for p in pages if p.get('description'))
    expected={site+p for p in catalogue}
    report={'audited_at_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'origin':site,'scope':'Unauthenticated HTTP responses and GitHub source catalogue only; raw H1/link counts do not describe JavaScript-rendered content. Observed request times are not Core Web Vitals.','summary':{'catalogue_urls':len(catalogue),'sitemap_urls':len(sitemap_urls),'http_200':sum(p.get('status')==200 for p in pages),'request_errors':sum('error'in p for p in pages),'pages_with_metadata_issues':sum(bool(p.get('issues')) for p in pages),'duplicate_titles':[t for t,c in titles.items() if c>1],'duplicate_descriptions':[d for d,c in descriptions.items() if c>1],'missing_from_sitemap':sorted(expected-set(sitemap_urls)),'extra_sitemap_urls':sorted(set(sitemap_urls)-expected)},'robots':{k:v for k,v in robots.items()},'sitemap_response':{k:v for k,v in sitemap.items() if k!='text'},'pages':pages,'indexing_probes':probes,'domain_variants':variants}
    target=Path(output);target.parent.mkdir(parents=True,exist_ok=True);target.write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n');print(json.dumps(report['summary'],indent=2));print('Evidence saved:',target)

if __name__=='__main__':
    args=argparse.ArgumentParser(description=__doc__);args.add_argument('--origin',default='https://unipathway.pk');args.add_argument('--output',default='docs/audits/unipathway-seo-http.json');a=args.parse_args()
    parsed=urlparse(a.origin)
    if parsed.scheme!='https' or parsed.username or parsed.password or parsed.query or parsed.fragment or parsed.path not in ('','/'):args.error('Use an HTTPS origin without credentials, query, fragment or path.')
    run(a.origin,a.output)
