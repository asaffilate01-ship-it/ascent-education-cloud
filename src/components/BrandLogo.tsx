import logo from '@/assets/unipathway-logo.png';

type BrandLogoProps = { compact?: boolean; className?: string; showTagline?: boolean };

/** Official UniPathway logo (uploaded artwork). */
export default function BrandLogo({ compact = false, className = '' }: BrandLogoProps) {
  if (compact) {
    return (
      <img src="/brand/unipathway-mark.svg" alt="UniPathway" className={`inline-block aspect-square object-contain ${className}`} />
    );
  }
  return <img src={logo} alt="UniPathway" className={`h-auto w-auto max-w-full object-contain ${className}`} />;
}
