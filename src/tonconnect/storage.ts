import AsyncStorage from '@react-native-async-storage/async-storage';

export const CONNECT_STORAGE_PREFIX = 'alton_ton_connect_';

const TON_CONNECT_STORAGE_KEY_PREFIX = `${CONNECT_STORAGE_PREFIX}ton-connect-storage`;

/**
 * Реализация IStorage для @tonconnect/sdk.
 * Префикс изолирует ключи от остальных данных приложения.
 * При желании заменить на MMKV — сохраните тот же контракт (async API или обёртка).
 */
/** Есть сохранённая сессия — иначе restoreConnection ходит в bridge без смысла. */
export async function hasTonConnectStoredSession(): Promise<boolean> {
  const keys = await AsyncStorage.getAllKeys();
  return keys.some(key => key.startsWith(TON_CONNECT_STORAGE_KEY_PREFIX));
}

export function createTonConnectAsyncStorage() {
  return {
    async setItem(key: string, value: string) {
      await AsyncStorage.setItem(`${CONNECT_STORAGE_PREFIX}${key}`, value);
    },
    async getItem(key: string) {
      return AsyncStorage.getItem(`${CONNECT_STORAGE_PREFIX}${key}`);
    },
    async removeItem(key: string) {
      await AsyncStorage.removeItem(`${CONNECT_STORAGE_PREFIX}${key}`);
    },
  };
}
