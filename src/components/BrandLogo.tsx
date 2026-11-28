import logo from '@/assets/unipathway-logo.png';

type BrandLogoProps = { compact?: boolean; className?: string; showTagline?: boolean };

/** Official UniPathway logo (uploaded artwork). */
export default function BrandLogo({ compact = false, className = '' }: BrandLogoProps) {
  if (compact) {
    return (
      <span className={`inline-flex aspect-square shrink-0 items-center justify-center ${className}`}>
        <img src="/brand/unipathway-mark.svg" alt="UniPathway" className="h-full w-full object-contain" />
      </span>
    );
  }
  return <img src={logo} alt="UniPathway" className={`w-auto object-contain ${className}`} />;
}
