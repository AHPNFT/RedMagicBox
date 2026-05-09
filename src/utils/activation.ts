import { NativeModules } from 'react-native';

const CryptoCore = NativeModules.CryptoCore;

const CODE_PATTERN = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
const FREE_ENCRYPT_LIMIT = 5;

export async function validateActivationCode(code: string): Promise<boolean> {
  if (!CODE_PATTERN.test(code)) return false;
  return CryptoCore.validateActivationCode(code);
}

export function isActivationCodeFormat(code: string): boolean {
  return CODE_PATTERN.test(code);
}

export { FREE_ENCRYPT_LIMIT };
