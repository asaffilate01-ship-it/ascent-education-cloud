import logo from '@/assets/unipathway-logo.png';

type BrandLogoProps = { compact?: boolean; className?: string; showTagline?: boolean };

/** Official UniPathway logo (uploaded artwork). */
export default function BrandLogo({ compact = false, className = '' }: BrandLogoProps) {
  if (compact) {
    return (
      <span className={`inline-block aspect-square overflow-hidden ${className}`} aria-label="UniPathway">
        <img src={logo} alt="UniPathway" className="h-full w-auto max-w-none object-cover object-left" />
      </span>
    );
  }
  return <img src={logo} alt="UniPathway" className={`w-auto object-contain ${className}`} />;
}
