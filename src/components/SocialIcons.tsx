import { Facebook, Instagram, Linkedin, Youtube, Twitter } from 'lucide-react';

// Brand handles — update once the client provides real URLs.
export const SOCIAL_LINKS = {
  facebook: 'https://facebook.com/unipathway',
  instagram: 'https://instagram.com/unipathway',
  twitter: 'https://twitter.com/unipathway',
  linkedin: 'https://linkedin.com/company/unipathway',
  youtube: 'https://youtube.com/@unipathway',
  whatsapp: 'https://wa.me/923000000000',
  tiktok: 'https://tiktok.com/@unipathway',
};

const WhatsappGlyph = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
    <path d="M20.52 3.48A11.86 11.86 0 0 0 12.04 0C5.5 0 .2 5.3.2 11.84c0 2.09.55 4.13 1.6 5.93L0 24l6.4-1.68a11.83 11.83 0 0 0 5.63 1.44h.01c6.54 0 11.84-5.3 11.84-11.84 0-3.16-1.23-6.13-3.46-8.44Zm-8.48 18.2h-.01a9.79 9.79 0 0 1-5-1.37l-.36-.22-3.8 1 1.02-3.7-.24-.38a9.83 9.83 0 1 1 18.24-5.17c0 5.43-4.42 9.84-9.85 9.84Zm5.4-7.37c-.29-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.66.15-.2.29-.76.96-.93 1.16-.17.2-.34.22-.63.07-.29-.15-1.24-.46-2.36-1.46-.87-.78-1.46-1.73-1.63-2.02-.17-.29-.02-.45.13-.6.13-.13.29-.34.44-.51.15-.17.2-.29.29-.49.1-.2.05-.37-.02-.51-.07-.15-.66-1.59-.9-2.18-.24-.57-.48-.5-.66-.51h-.56c-.2 0-.51.07-.78.36-.27.29-1.02 1-1.02 2.43 0 1.43 1.05 2.82 1.2 3.02.15.2 2.06 3.14 4.99 4.4.7.3 1.25.48 1.68.61.7.22 1.34.19 1.85.11.56-.08 1.75-.71 2-1.4.25-.7.25-1.29.17-1.4-.07-.11-.27-.18-.56-.32Z" />
  </svg>
);

const TiktokGlyph = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
    <path d="M19.6 6.32a5.5 5.5 0 0 1-3.36-1.14 5.5 5.5 0 0 1-2.14-3.68h-3.5v13.4a2.55 2.55 0 1 1-1.8-2.44V8.86a6.1 6.1 0 1 0 5.3 6.04V9.34a8.9 8.9 0 0 0 5.5 1.86Z" />
  </svg>
);

interface Props {
  className?: string;
  iconClassName?: string;
  variant?: 'light' | 'dark';
}

export default function SocialIcons({ className = '', iconClassName = 'w-4 h-4', variant = 'light' }: Props) {
  const base =
    variant === 'dark'
      ? 'bg-background/5 hover:bg-background/10 text-background/70 hover:text-background'
      : 'bg-muted hover:bg-primary/10 text-muted-foreground hover:text-primary';

  const items = [
    { href: SOCIAL_LINKS.facebook, label: 'Facebook', Icon: Facebook },
    { href: SOCIAL_LINKS.instagram, label: 'Instagram', Icon: Instagram },
    { href: SOCIAL_LINKS.twitter, label: 'X (Twitter)', Icon: Twitter },
    { href: SOCIAL_LINKS.linkedin, label: 'LinkedIn', Icon: Linkedin },
    { href: SOCIAL_LINKS.youtube, label: 'YouTube', Icon: Youtube },
    { href: SOCIAL_LINKS.tiktok, label: 'TikTok', Icon: TiktokGlyph },
    { href: SOCIAL_LINKS.whatsapp, label: 'WhatsApp', Icon: WhatsappGlyph },
  ];

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {items.map(({ href, label, Icon }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${base}`}
        >
          <Icon className={iconClassName} />
        </a>
      ))}
    </div>
  );
}
