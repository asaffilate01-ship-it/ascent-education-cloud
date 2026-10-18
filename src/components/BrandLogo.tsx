import { useId } from 'react';

type BrandLogoProps = { compact?: boolean; className?: string; showTagline?: boolean };

/** Scalable implementation of the selected UniPathway arrow-and-pathway brand board. */
export default function BrandLogo({ compact = false, className = '', showTagline = false }: BrandLogoProps) {
  const id = useId().replace(/:/g, '');
  return (
    <span className={`inline-flex min-w-0 items-center gap-2.5 ${className}`} aria-label="UniPathway">
      <svg viewBox="0 0 100 100" role="img" aria-label="UniPathway ascending pathway and arrow" className="h-full w-auto shrink-0" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={`uni-navy-${id}`} x1="0" y1="1" x2="1" y2="0"><stop stopColor="#09295B"/><stop offset="1" stopColor="#0B2D5B"/></linearGradient>
          <linearGradient id={`uni-green-${id}`} x1="0" y1="1" x2="1" y2="0"><stop stopColor="#087D54"/><stop offset="1" stopColor="#16A34A"/></linearGradient>
        </defs>
        <path d="M6 30 L24 37 L24 78 Q24 89 35 92 Q18 97 9 83 Q6 77 6 67 Z" fill={`url(#uni-navy-${id})`}/>
        <path d="M45 40 L72 26 L72 18 L96 3 L96 39 L83 30 L83 70 Q81 91 56 96 Q42 99 28 95 Q52 80 60 62 Q68 46 70 31 Z" fill={`url(#uni-green-${id})`}/>
        <path d="M8 83 Q21 68 38 59 Q58 49 77 29 L82 34 Q67 61 47 78 Q29 93 19 96 Q11 93 8 83 Z" fill="#FFFFFF"/>
        <path d="M6 87 Q24 65 44 57 Q61 50 74 36 Q55 68 31 91 L21 97 Q11 96 6 87 Z" fill={`url(#uni-navy-${id})`}/>
        <path d="M21 97 Q45 80 63 56 Q73 43 82 29 L87 34 Q74 62 55 83 Q41 98 21 97 Z" fill="#FFFFFF"/>
      </svg>
      {!compact && <span className="flex min-w-0 flex-col justify-center leading-none">
        <span className="whitespace-nowrap text-[1.35rem] font-extrabold tracking-[-0.055em] sm:text-[1.55rem]"><span style={{ color: '#0B2D5B' }}>Uni</span><span style={{ color: '#16A34A' }}>Pathway</span></span>
        {showTagline && <span className="mt-1.5 whitespace-nowrap text-[0.56rem] font-medium tracking-[0.095em] sm:text-[0.62rem]" style={{ color: '#0B2D5B' }}>Learn here. Go further.</span>}
      </span>}
    </span>
  );
}
