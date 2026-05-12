import AsyncStorage from '@react-native-async-storage/async-storage';
import { validateActivationCode, FREE_ENCRYPT_LIMIT } from './activation';
import { t } from '../i18n';

const ACTIVATION_KEY = 'hongmo_activation_state';
const ENCRYPT_COUNT_KEY = 'hongmo_encrypt_count';

export interface ActivationState {
  activated: boolean;
  code?: string;
  activatedAt?: number;
}

export async function getActivationState(): Promise<ActivationState> {
  try {
    const data = await AsyncStorage.getItem(ACTIVATION_KEY);
    if (data) return JSON.parse(data);
  } catch {}
  return { activated: false };
}

export async function getActivationCode(): Promise<string | null> {
  const state = await getActivationState();
  return state.activated ? (state.code || null) : null;
}

export async function activateWithCode(code: string): Promise<{ success: boolean; message: string }> {
  if (!(await validateActivationCode(code))) {
    return { success: false, message: t('activation_code_invalid') };
  }
  const state: ActivationState = {
    activated: true,
    code,
    activatedAt: Date.now(),
  };
  await AsyncStorage.setItem(ACTIVATION_KEY, JSON.stringify(state));
  return { success: true, message: t('activation_code_success') };
}

export async function getEncryptCount(): Promise<number> {
  try {
    const data = await AsyncStorage.getItem(ENCRYPT_COUNT_KEY);
    return data ? parseInt(data, 10) : 0;
  } catch {
    return 0;
  }
}

export async function incrementEncryptCount(): Promise<number> {
  const count = await getEncryptCount() + 1;
  await AsyncStorage.setItem(ENCRYPT_COUNT_KEY, count.toString());
  return count;
}

export async function canEncrypt(): Promise<boolean> {
  const state = await getActivationState();
  if (state.activated) return true;
  const count = await getEncryptCount();
  return count < FREE_ENCRYPT_LIMIT;
}

export async function getRemainingEncrypts(): Promise<number> {
  const state = await getActivationState();
  if (state.activated) return -1;
  const count = await getEncryptCount();
  return Math.max(0, FREE_ENCRYPT_LIMIT - count);
}
