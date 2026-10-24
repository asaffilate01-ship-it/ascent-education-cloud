import { afterEach, expect, it, vi } from 'vitest';
import { nativeAuthCode } from '@/lib/native';
const storage=vi.hoisted(()=>({get:vi.fn(),set:vi.fn(),remove:vi.fn()}));
vi.mock('@aparajita/capacitor-secure-storage',()=>({SecureStorage:storage,KeychainAccess:{whenUnlockedThisDeviceOnly:1}}));
import { nativeAuthStorage } from '@/integrations/supabase/nativeAuthStorage';
afterEach(()=>vi.clearAllMocks());
it('accepts only exact PKCE callbacks and rejects tokens, duplicate codes and deceptive hosts',()=>{
 expect(nativeAuthCode('unipathway://auth/callback?code=abc&flow=recovery')).toEqual({code:'abc',recovery:true});
 for(const url of ['https://auth/callback?code=abc','unipathway://auth.evil/callback?code=x','unipathway://user@auth/callback?code=x','unipathway://auth/callback?code=a&code=b','unipathway://auth/callback#access_token=secret','unipathway://auth/callback?code=x#error','unipathway://auth/callback?error=denied&code=x','unipathway://auth/other?code=x'])expect(nativeAuthCode(url)).toBeNull();
});
it('stores native sessions without cloud sync or plaintext fallback',async()=>{
 storage.get.mockResolvedValue('session');await expect(nativeAuthStorage.getItem('key')).resolves.toBe('session');
 await nativeAuthStorage.setItem('key','session');expect(storage.set).toHaveBeenCalledWith('key','session',false,false,1);
 storage.get.mockRejectedValue(new Error('Keystore unavailable'));await expect(nativeAuthStorage.getItem('key')).rejects.toThrow('Keystore unavailable');
 expect(localStorage.getItem('key')).toBeNull();
});
it('rejects corrupt native sessions',async()=>{storage.get.mockResolvedValue({invalid:true});await expect(nativeAuthStorage.getItem('key')).rejects.toThrow('invalid');});
