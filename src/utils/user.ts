import AsyncStorage from '@react-native-async-storage/async-storage';
import CryptoJS from 'crypto-js';
import * as Keychain from 'react-native-keychain';
import type { UserInfo } from '../types';

const USER_KEY = 'hongmo_user_info';
const SESSION_KEY = 'hongmo_session';
const KEYCHAIN_SERVICE = 'hongmo_securebox_password';

export function hashPassword(password: string): string {
  return CryptoJS.SHA256(password).toString();
}

export async function saveUser(username: string, password: string): Promise<void> {
  const userInfo: UserInfo = {
    username,
    passwordHash: hashPassword(password),
  };
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(userInfo));
}

export async function getUser(): Promise<UserInfo | null> {
  try {
    const data = await AsyncStorage.getItem(USER_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export async function verifyUser(username: string, password: string): Promise<boolean> {
  const user = await getUser();
  if (!user) return false;
  return user.username === username && user.passwordHash === hashPassword(password);
}

export async function clearUser(): Promise<void> {
  await AsyncStorage.removeItem(USER_KEY);
  await AsyncStorage.removeItem(SESSION_KEY);
  try {
    await Keychain.resetGenericPassword({ service: KEYCHAIN_SERVICE });
  } catch {}
}

export async function setSession(username: string, password: string): Promise<void> {
  await AsyncStorage.setItem(SESSION_KEY, username);
  await Keychain.setGenericPassword(username, password, {
    service: KEYCHAIN_SERVICE,
  });
}

export async function getSession(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export async function getSessionPassword(): Promise<string | null> {
  try {
    const credentials = await Keychain.getGenericPassword({
      service: KEYCHAIN_SERVICE,
    });
    return credentials ? credentials.password : null;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
  try {
    await Keychain.resetGenericPassword({ service: KEYCHAIN_SERVICE });
  } catch {}
}
