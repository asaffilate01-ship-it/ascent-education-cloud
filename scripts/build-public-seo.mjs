// Generates route-specific HTML heads, not server-rendered page bodies.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
const publicSeo=JSON.parse(await readFile('src/data/public-seo.json','utf8'));
const blogImages=JSON.parse(await readFile('src/data/blog-images.json','utf8'));
const SITE_URL='https://unipathway.pk';
const breadcrumbSchema=(path,title)=>({'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Home',item:SITE_URL+'/'},...(path==='/'?[]:[{'@type':'ListItem',position:2,name:title.split(' | ')[0],item:SITE_URL+path}])]});
const escape=s=>s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const sitemap=`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${Object.keys(publicSeo).map(path=>`  <url><loc>${SITE_URL}${path}</loc></url>`).join('\n')}\n</urlset>\n`;
if(process.argv.includes('--sitemap-only')){await writeFile('public/sitemap.xml',sitemap);console.log(`Sitemap: ${Object.keys(publicSeo).length} public URLs`);process.exit(0);}
const template=await readFile('dist/index.html','utf8');
const app=await readFile('src/App.tsx','utf8');
const privatePaths=[...app.matchAll(/<Route path="([^"]+)"/g)].map(m=>m[1]).filter(p=>!p.includes(':')&&!p.includes('*')&&!publicSeo[p]&&!['/index','/apply'].includes(p));
for(const path of [...Object.keys(publicSeo),...new Set(privatePaths)]){
 const page=publicSeo[path];const title=page?.title||'UniPathway | Secure learning portal';const description=page?.description||'Sign in to access your authorised UniPathway learning and administration services.';
 let html=template.replace(/<title>.*?<\/title>/s,`<title>${escape(title)}</title>`).replace(/<link[^>]+rel="canonical"[^>]*>/g,'');
 const image=SITE_URL+(blogImages[path]||'/brand/unipathway-social.png');
 const values={'og:image':image,'twitter:image':image,'description':description,'robots':page?'index, follow, max-image-preview:large, max-snippet:-1':'noindex, follow','og:type':path.startsWith('/blog/')?'article':'website','og:title':title,'og:description':description,'og:url':SITE_URL+path,'twitter:title':title,'twitter:description':description};
 for(const [key,value] of Object.entries(values))html=html.replace(new RegExp(`(<meta (?:name|property)="${key}" content=")[^"]*("[^>]*>)`),(_,a,b)=>a+escape(value)+b);
 if(page)html=html.replace('</head>',`<link rel="canonical" href="${SITE_URL}${path}" />\n<script type="application/ld+json" data-seo="build">${JSON.stringify(breadcrumbSchema(path,title)).replaceAll('<','\\u003c')}</script>\n</head>`);
 const directory=path==='/'?'dist':`dist${path}`;await mkdir(directory,{recursive:true});await writeFile(`${directory}/index.html`,html);
}
await writeFile('dist/sitemap.xml',sitemap);
console.log(`SEO HTML heads generated: ${Object.keys(publicSeo).length} public routes; private static routes excluded from indexing.`);
