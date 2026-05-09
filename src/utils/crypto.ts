import { NativeModules } from 'react-native';

const CryptoCore = NativeModules.CryptoCore;

export interface EncryptMeta {
  op?: string;
  mt?: string;
  ex?: string;
  fn?: string;
}

export async function encryptFile(
  plainBase64: string,
  password: string,
  username: string,
  fileName?: string,
  meta?: EncryptMeta,
  activated?: boolean,
): Promise<string> {
  return CryptoCore.encryptFile(
    plainBase64,
    password,
    username,
    fileName || 'data',
    meta || null,
    activated || false,
  );
}

export async function decryptFile(
  encryptedJson: string,
  password: string,
  username: string,
  activated?: boolean,
): Promise<string> {
  return CryptoCore.decryptFile(
    encryptedJson,
    password,
    username,
    activated || false,
  );
}

export async function parseEncryptMeta(encryptedJson: string): Promise<EncryptMeta> {
  return CryptoCore.parseEncryptMeta(encryptedJson);
}

export function checkPasswordStrength(password: string): 'weak' | 'medium' | 'strong' {
  if (password.length < 6) return 'weak';

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 2) return 'weak';
  if (score <= 3) return 'medium';
  return 'strong';
}
