import { useState } from 'react';
import { isNativeApp } from '@/lib/native';
import { disableNativePush, enableNativePush, nativePushConfigured } from '@/lib/nativePush';
import { Button } from '@/components/ui/button';
export default function NativeNotifications() {
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  if (!isNativeApp()) return null;
  async function change(enable: boolean) {
    setBusy(true); setMessage('');
    try { await (enable ? enableNativePush() : disableNativePush()); setMessage(enable ? 'Device registered. Delivery requires an active notification provider.' : 'Device notifications disabled.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Notification settings could not be saved.'); }
    finally { setBusy(false); }
  }
  return <section className="mb-6 space-y-3 rounded border p-4"><h3 className="font-semibold">This device</h3><p className="text-sm">{nativePushConfigured() ? 'Allow device notifications for this account.' : 'Push delivery is awaiting provider configuration. You can still read notifications in the app.'}</p><Button disabled={busy || !nativePushConfigured()} onClick={() => void change(true)}>Enable device notifications</Button><Button className="ml-2" variant="outline" disabled={busy} onClick={() => void change(false)}>Disable</Button>{message && <p role="status" className="text-sm">{message}</p>}</section>;
}
