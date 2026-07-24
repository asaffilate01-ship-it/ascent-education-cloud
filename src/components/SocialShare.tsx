import { Facebook, Linkedin, Twitter, Link2, Mail } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Props {
  url?: string;
  title?: string;
  className?: string;
}

export default function SocialShare({ url, title = 'UniPathway', className = '' }: Props) {
  const shareUrl = typeof window !== 'undefined' ? url ?? window.location.href : url ?? '';
  const enc = (v: string) => encodeURIComponent(v);

  const links = [
    {
      label: 'Share on Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${enc(shareUrl)}`,
      Icon: Facebook,
    },
    {
      label: 'Share on X',
      href: `https://twitter.com/intent/tweet?url=${enc(shareUrl)}&text=${enc(title)}`,
      Icon: Twitter,
    },
    {
      label: 'Share on LinkedIn',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(shareUrl)}`,
      Icon: Linkedin,
    },
    {
      label: 'Share via WhatsApp',
      href: `https://wa.me/?text=${enc(`${title} — ${shareUrl}`)}`,
      Icon: () => (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
          <path d="M20.52 3.48A11.86 11.86 0 0 0 12.04 0C5.5 0 .2 5.3.2 11.84c0 2.09.55 4.13 1.6 5.93L0 24l6.4-1.68a11.83 11.83 0 0 0 5.63 1.44c6.54 0 11.85-5.3 11.85-11.84 0-3.16-1.23-6.13-3.46-8.44Z" />
        </svg>
      ),
    },
    {
      label: 'Share by email',
      href: `mailto:?subject=${enc(title)}&body=${enc(shareUrl)}`,
      Icon: Mail,
    },
  ];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: 'Link copied', description: 'Share it anywhere.' });
    } catch {
      toast({ title: 'Copy failed', description: shareUrl, variant: 'destructive' });
    }
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className="text-xs font-medium text-muted-foreground mr-1">Share:</span>
      {links.map(({ label, href, Icon }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          className="w-9 h-9 rounded-full flex items-center justify-center bg-muted hover:bg-primary/10 hover:text-primary text-muted-foreground transition-all"
        >
          <Icon className="w-4 h-4" />
        </a>
      ))}
      <button
        onClick={copy}
        aria-label="Copy link"
        className="w-9 h-9 rounded-full flex items-center justify-center bg-muted hover:bg-primary/10 hover:text-primary text-muted-foreground transition-all"
      >
        <Link2 className="w-4 h-4" />
      </button>
    </div>
  );
}
