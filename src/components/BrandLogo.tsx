import { useId } from 'react';

type BrandLogoProps = { compact?: boolean; className?: string; showTagline?: boolean };

/** Vector adaptation of the selected navy/green pathway concept. */
export default function BrandLogo({ compact = false, className = '', showTagline = false }: BrandLogoProps) {
  const id = useId().replace(/:/g, '');
  return (
    <span className={`inline-flex min-w-0 items-center gap-2.5 ${className}`} aria-label="UniPathway">
      <svg viewBox="0 0 72 76" role="img" aria-label="UniPathway pathway symbol" className="h-full w-auto shrink-0" xmlns="http://www.w3.org/2000/svg">
        <defs><linearGradient id={`green-${id}`} x1="0" y1="1" x2="1" y2="0"><stop stopColor="#087947"/><stop offset="1" stopColor="#16a34a"/></linearGradient></defs>
        <path d="M7 9 L22 15 L22 55 Q22 62 29 66 L18 72 Q7 64 7 50 Z" fill="#0B2D5B"/>
        <path d="M33 20 L61 8 L61 47 Q61 64 43 71 L27 74 Q47 56 49 39 L49 27 L33 32 Z" fill={`url(#green-${id})`}/>
        <path d="M16 73 Q33 57 45 40 Q51 30 54 20 L59 27 Q49 55 27 74 Z" fill="#FFFFFF"/>
      </svg>
      {!compact && <span className="flex min-w-0 flex-col justify-center leading-none">
        <span className="whitespace-nowrap text-[1.35rem] font-extrabold tracking-[-0.055em] sm:text-[1.55rem]"><span style={{color:'#0B2D5B'}}>Uni</span><span style={{color:'#168448'}}>Pathway</span></span>
        {showTagline && <span className="mt-1.5 whitespace-nowrap text-[0.56rem] font-semibold tracking-[0.095em] sm:text-[0.62rem]" style={{color:'#0B2D5B'}}>Learn here. Go further.</span>}
      </span>}
    </span>
  );
}
