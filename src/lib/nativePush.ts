import { PushNotifications } from '@capacitor/push-notifications';
import type { PluginListenerHandle } from '@capacitor/core';
import { nativeAuthStorage } from '@/integrations/supabase/nativeAuthStorage';
import { db } from './db';
import { isNativeApp, nativePlatform } from './native';
export const nativePushConfigured = () => isNativeApp() && import.meta.env.VITE_NATIVE_PUSH_ENABLED === 'true';
const deviceKey = 'unipathway-native-device';
export async function enableNativePush() {
  if (!nativePushConfigured()) throw new Error('Push delivery is awaiting centre configuration. In-app notifications remain available.');
  let permission = await PushNotifications.checkPermissions();
  if (permission.receive === 'prompt' || permission.receive === 'prompt-with-rationale') permission = await PushNotifications.requestPermissions();
  if (permission.receive !== 'granted') throw new Error('Allow notifications in device settings to enable push.');
  let id = await nativeAuthStorage.getItem(deviceKey);
  if (!id) { id = crypto.randomUUID(); await nativeAuthStorage.setItem(deviceKey, id); }
  const handles: PluginListenerHandle[] = [];
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const token = await new Promise<string>((resolve, reject) => {
      timer = setTimeout(() => reject(new Error('Device registration timed out. Check provider configuration and retry.')), 20000);
      void (async () => {
        handles.push(await PushNotifications.addListener('registration', token => resolve(token.value)));
        handles.push(await PushNotifications.addListener('registrationError', () => reject(new Error('Device registration failed.'))));
        await PushNotifications.register();
      })().catch(reject);
    });
    const result = await db.rpc('register_unipathway_native_device', { p_id: id, p_platform: nativePlatform(), p_token: token });
    if (result.error) throw new Error('Device registration could not be saved. Retry while signed in.');
  } finally { clearTimeout(timer); await Promise.all(handles.map(handle => handle.remove())); }
}
export async function disableNativePush() {
  if (!isNativeApp()) return;
  const id = await nativeAuthStorage.getItem(deviceKey);
  if (!id) return;
  const result = await db.rpc('revoke_unipathway_native_device', { p_id: id });
  if (result.error) throw new Error('Could not revoke device notifications. Reconnect and retry before signing out.');
  await PushNotifications.unregister();
  await nativeAuthStorage.removeItem(deviceKey);
}
