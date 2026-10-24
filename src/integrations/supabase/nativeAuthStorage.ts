import { SecureStorage, KeychainAccess } from '@aparajita/capacitor-secure-storage';
// Called only on native. Errors propagate: never fall back to plaintext storage.
export const nativeAuthStorage = {
  async getItem(key: string): Promise<string | null> {
    const value = await SecureStorage.get(key, false, false);
    if (value === null) return null;
    if (typeof value !== 'string') throw new Error('Secure session is invalid.');
    return value;
  },
  async setItem(key: string, value: string): Promise<void> {
    await SecureStorage.set(key, value, false, false, KeychainAccess.whenUnlockedThisDeviceOnly);
  },
  async removeItem(key: string): Promise<void> { await SecureStorage.remove(key, false); },
};
