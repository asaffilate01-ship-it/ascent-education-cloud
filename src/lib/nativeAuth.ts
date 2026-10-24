import { Browser } from '@capacitor/browser';
import { supabase } from '@/integrations/supabase/client';
import { NATIVE_AUTH_CALLBACK } from './native';
export async function nativeGoogleSignIn() {
  const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: NATIVE_AUTH_CALLBACK, skipBrowserRedirect: true } });
  if (error || !data.url) throw error || new Error('Sign-in is unavailable.');
  // URL comes from the configured Supabase client, never from a deep-link parameter.
  const url = new URL(data.url);
  if (url.protocol !== 'https:') throw new Error('Secure sign-in URL required.');
  await Browser.open({ url: url.href });
}
