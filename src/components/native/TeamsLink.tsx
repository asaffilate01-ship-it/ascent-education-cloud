import type { AnchorHTMLAttributes } from 'react';
import { AppLauncher } from '@capacitor/app-launcher';
import { toast } from 'sonner';
import { isNativeApp } from '@/lib/native';
import { isTeamsMeetingUrl } from '@/lib/teamsTeaching';
export default function TeamsLink({ href, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  if (!isTeamsMeetingUrl(href || null)) return null;
  return <a {...props} href={href} target="_blank" rel="noopener noreferrer" onClick={event => {
    if (!isNativeApp()) return;
    event.preventDefault();
    void AppLauncher.openUrl({ url: href! }).then(result => {
      if (!result.completed) toast.error('Teams could not be opened. Install Teams or enable a browser on this device.');
    }).catch(() => toast.error('Unable to open Teams. Check your device settings and retry.'));
  }}>{children}</a>;
}
