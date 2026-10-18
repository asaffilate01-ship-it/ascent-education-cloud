import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** New page navigation starts at the beginning, rather than inheriting the prior page's scroll offset. */
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useLayoutEffect(() => {
    // Hash links are deliberate jumps; everything else must open at the top.
    window.scrollTo(0, 0);
    if (!hash) return;
    let frame = 0;
    const targetId = decodeURIComponent(hash.slice(1));
    const align = (tries: number) => {
      const target = document.getElementById(targetId);
      if (target) { target.scrollIntoView({ block: 'start', behavior: 'auto' }); return; }
      if (tries < 8) frame = window.requestAnimationFrame(() => align(tries + 1));
    };
    frame = window.requestAnimationFrame(() => align(0));
    return () => window.cancelAnimationFrame(frame);
  }, [pathname, hash]);

  useLayoutEffect(() => {
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    return () => { window.history.scrollRestoration = previous; };
  }, []);
  return null;
}
