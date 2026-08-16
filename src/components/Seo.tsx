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

const SITE_URL = 'https://unipathway.pk';

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

  useEffect(() => {
    const path = canonical ?? location.pathname;
    const url = `${SITE_URL}${path === '/' ? '' : path}`;
    const absoluteImage = image
      ? image.startsWith('http')
        ? image
        : `${SITE_URL}${image}`
      : `${SITE_URL}/og-image.png`;

    document.title = title;
    upsertMeta('meta[name="description"]', 'name', 'description', description);
    upsertMeta('meta[name="robots"]', 'name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');
    upsertMeta('meta[property="og:title"]', 'property', 'og:title', title);
    upsertMeta('meta[property="og:description"]', 'property', 'og:description', description);
    upsertMeta('meta[property="og:type"]', 'property', 'og:type', type);
    upsertMeta('meta[property="og:url"]', 'property', 'og:url', url);
    upsertMeta('meta[property="og:image"]', 'property', 'og:image', absoluteImage);
    upsertMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
    upsertMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title);
    upsertMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description);
    upsertMeta('meta[name="twitter:image"]', 'name', 'twitter:image', absoluteImage);

    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }
    link.href = url;

    let script: HTMLScriptElement | null = null;
    if (jsonLd) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      script.dataset.seo = 'route';
      script.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }

    return () => {
      if (script) script.remove();
    };
  }, [title, description, canonical, type, image, noindex, location.pathname, JSON.stringify(jsonLd ?? {})]);

  return null;
}
