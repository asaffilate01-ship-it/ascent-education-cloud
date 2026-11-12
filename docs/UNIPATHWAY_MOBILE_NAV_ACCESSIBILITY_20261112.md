# UniPathway mobile navigation accessibility — 12 November 2026

## Scope
The off-canvas sidebar was translated away from view at mobile widths but remained visible to assistive technologies and keyboard users. This could cause unexpected focus on a menu that appears closed, particularly on small Android screens.

## Fix
- The closed sidebar now uses Tailwind `invisible lg:visible`, with its existing `-translate-x-full lg:translate-x-0` behavior. At desktop widths it remains visible and keyboard navigable; at phone widths it is hidden from the visibility tree until explicitly opened.
- The mobile menu trigger now identifies the controlled sidebar via `aria-controls`; the sidebar has a stable ID.
- The close button and collapsible specialist headings now use minimum 44px interaction heights, plus visible keyboard focus styles. The open/close and Escape behavior, role navigation, search, focus trap and all route destinations remain unchanged.
- Synthetic UI tests exercise expanded state, mobile-hidden/desktop-visible classes, the accessible close control, and retained role-scoped link destinations.

## Verification and limitations
Require exact-head GitHub TypeScript, lint, unit, DB/Edge, browser, Android/iOS and design checks. Review 360/390/768/1440px screenshots and 200% text. Real VoiceOver/TalkBack, physical Android/iPhone and Chrome/Safari keyboard acceptance remains a separate deployment gate; static CSS classes in unit tests are not proof of real screen-reader behavior.

No Supabase migration, hosted data reads, paid AI calls, Lovable credits, authentication changes or production publication.
