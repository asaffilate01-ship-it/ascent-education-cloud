import catalogue from '../data/public-seo.json' with {type:'json'};
export const SITE_URL='https://unipathway.pk';
export type PageSeo={title:string;description:string;keywords:string[]};
export const publicSeo:Record<string,PageSeo>={...catalogue};
export function cleanSeoPath(path:string){
 const clean=path.split(/[?#]/)[0].replace(/\/+$/,'')||'/';
 return clean.replace(/^\/tenant\/unipathway(?=\/|$)/,'')||'/';
}
export function organisationSchema(){return {'@context':'https://schema.org','@type':'EducationalOrganization','@id':`${SITE_URL}/#organisation`,name:'UniPathway',url:SITE_URL,logo:`${SITE_URL}/pwa-512x512.png`,address:{'@type':'PostalAddress',streetAddress:'Civil Lines',addressLocality:'Jhelum',addressRegion:'Punjab',addressCountry:'PK'},areaServed:{'@type':'Country',name:'Pakistan'}};}
export function breadcrumbSchema(path:string,title:string){return {'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Home',item:SITE_URL+'/'},...(path==='/'?[]:[{'@type':'ListItem',position:2,name:title.split(' | ')[0],item:SITE_URL+path}])]};}

export const isIndexablePath=(path:string)=>Object.prototype.hasOwnProperty.call(publicSeo,cleanSeoPath(path));
