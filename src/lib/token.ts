import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'coopexpress.jwt';
const MOTOBY_KEY = 'coopexpress.motoboy';

export async function saveToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function saveMotoboy(motoboy: unknown): Promise<void> {
  await SecureStore.setItemAsync(MOTOBY_KEY, JSON.stringify(motoboy));
}

export async function getMotoboy<T>(): Promise<T | null> {
  const raw = await SecureStore.getItemAsync(MOTOBY_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(MOTOBY_KEY);
}
