import {useLayoutEffect} from 'react';
import {useLocation} from 'react-router-dom';
import {isIndexablePath} from '@/lib/publicSeo';
export default function RouteIndexing(){
 const {pathname}=useLocation();
 useLayoutEffect(()=>{
  let robots=document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
  if(!robots){robots=document.createElement('meta');robots.name='robots';document.head.appendChild(robots);}
  robots.content=isIndexablePath(pathname)?'index, follow, max-image-preview:large':'noindex, follow';
  if(!isIndexablePath(pathname)){
   document.title='UniPathway | Secure learning portal';
   document.head.querySelector('link[rel="canonical"]')?.remove();
   document.head.querySelectorAll('script[data-seo="build"],script[data-seo="breadcrumb"],script[data-seo="route"]').forEach(el=>el.remove());
  }
 },[pathname]);
 return null;
}
