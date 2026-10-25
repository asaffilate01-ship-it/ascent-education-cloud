import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

/** Links to real page headings, keeping catalogue filters and content in place. */
export default function PageContents() {
  const ref = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  const [items, setItems] = useState<{ id: string; label: string }[]>([]);
  useEffect(() => {
    const main = ref.current?.closest('main');
    if (!main) return;
    const headings = Array.from(main.querySelectorAll('h2')).filter(h => !h.closest('header'));
    setItems(headings.slice(0, 12).map((heading, index) => {
      if (!heading.id) heading.id = `page-section-${index + 1}`;
      return { id: heading.id, label: heading.textContent || 'Section' };
    }));
  }, [pathname]);
  return <nav ref={ref} aria-label="On this page" className="page-contents rounded-xl border bg-card p-4 sm:p-5">
    <details><summary className="min-h-11 cursor-pointer py-3 text-sm font-bold">On this page — jump to a section</summary>
    <ul className="flex flex-wrap gap-2">{items.map(item => <li key={item.id}><a href={`#${item.id}`} className="inline-flex min-h-11 items-center rounded-lg border px-3 py-2 text-sm font-medium hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{item.label}</a></li>)}</ul></details>
  </nav>;
}
