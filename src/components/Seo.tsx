import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface SeoProps {
  title: string;
  description: string;
  /** Canonical path override, e.g. "/uk". Defaults to the current location. */
  canonical?: string;
  type?: 'website' | 'article';
  image?: string;
  noindex?: boolean;
  /** Optional JSON-LD structured data object. */
  jsonLd?: Record<string, unknown>;
}

import {SITE_URL,publicSeo,cleanSeoPath,breadcrumbSchema,isIndexablePath} from '@/lib/publicSeo';

function upsertMeta(selector: string, attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export default function Seo({ title, description, canonical, type = 'website', image, noindex, jsonLd }: SeoProps) {
  const location = useLocation();

  const schemaJson=JSON.stringify(jsonLd ?? null);
  useEffect(() => {
    const path = cleanSeoPath(canonical ?? location.pathname);
    const page = publicSeo[path];
    const pageTitle = page?.title ?? title;
    const pageDescription = page?.description ?? description;
    const url = `${SITE_URL}${path}`;
    const absoluteImage = image
      ? image.startsWith('http')
        ? image
        : `${SITE_URL}${image}`
      : `${SITE_URL}/brand/unipathway-social.png`;

    document.title = pageTitle;
    upsertMeta('meta[name="description"]', 'name', 'description', pageDescription);
    upsertMeta('meta[name="robots"]', 'name', 'robots', (noindex || !isIndexablePath(location.pathname)) ? 'noindex, follow' : 'index, follow, max-image-preview:large, max-snippet:-1');
    upsertMeta('meta[property="og:title"]', 'property', 'og:title', pageTitle);
    upsertMeta('meta[property="og:description"]', 'property', 'og:description', pageDescription);
    upsertMeta('meta[property="og:type"]', 'property', 'og:type', type);
    upsertMeta('meta[property="og:url"]', 'property', 'og:url', url);
    upsertMeta('meta[property="og:image"]', 'property', 'og:image', absoluteImage);
    upsertMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
    upsertMeta('meta[name="twitter:title"]', 'name', 'twitter:title', pageTitle);
    upsertMeta('meta[name="twitter:description"]', 'name', 'twitter:description', pageDescription);
    upsertMeta('meta[name="twitter:image"]', 'name', 'twitter:image', absoluteImage);

    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }
    link.href = url;

    document.head.querySelectorAll('script[data-seo="build"]').forEach(el=>el.remove());
    const breadcrumb=document.createElement('script');breadcrumb.type='application/ld+json';breadcrumb.dataset.seo='breadcrumb';breadcrumb.textContent=JSON.stringify(breadcrumbSchema(path,pageTitle));document.head.appendChild(breadcrumb);
    let script: HTMLScriptElement | null = null;
    if (schemaJson !== 'null') {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      script.dataset.seo = 'route';
      script.textContent = schemaJson;
      document.head.appendChild(script);
    }

    return () => {
      if (script) script.remove();
      breadcrumb.remove();
    };
  }, [title, description, canonical, type, image, noindex, location.pathname, schemaJson]);

  return null;
}
