import {useLayoutEffect} from 'react';
import {useLocation} from 'react-router-dom';
import {isIndexablePath} from '@/lib/publicSeo';
export default function RouteIndexing(){
 const {pathname}=useLocation();
 useLayoutEffect(()=>{
  let robots=document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
  if(!robots){robots=document.createElement('meta');robots.name='robots';document.head.appendChild(robots);}
  const indexable=isIndexablePath(pathname)&&window.location.hostname!=='demo.unipathway.pk';
  robots.content=indexable?'index, follow, max-image-preview:large':'noindex, follow';
  if(!indexable){
   document.title=pathname==='/demo'?'UniPathway | Explore the platform demo':'UniPathway | Secure learning portal';
   for(const [name,value] of Object.entries({'description':'Explore authorised UniPathway workspaces and services. Sign-in is required for private dashboards.','keywords':'','og:title':document.title,'og:description':'UniPathway learning and administration workspaces.','og:url':'https://unipathway.pk/','og:type':'website','og:image':'https://unipathway.pk/brand/unipathway-social.png','twitter:title':document.title,'twitter:description':'UniPathway learning and administration workspaces.','twitter:image':'https://unipathway.pk/brand/unipathway-social.png'})){
    const attribute=name.startsWith('og:')?'property':'name';let el=document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${name}"]`);
    if(!el){el=document.createElement('meta');el.setAttribute(attribute,name);document.head.appendChild(el);}el.content=value;
   }
   document.head.querySelector('link[rel="canonical"]')?.remove();
   document.head.querySelectorAll('script[data-seo="build"],script[data-seo="breadcrumb"],script[data-seo="route"]').forEach(el=>el.remove());
  }
 },[pathname]);
 return null;
}
