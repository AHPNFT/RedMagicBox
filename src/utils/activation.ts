import { NativeModules } from 'react-native';

const CryptoCore = NativeModules.CryptoCore;

const CODE_PATTERN = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
const FREE_ENCRYPT_LIMIT = 5;

export interface PaymentTokenInfo {
  address: string;
  symbol: string;
  decimals: number;
  price: number;
}

export interface PaymentInfo {
  bnbPrice: number;
  tokens: PaymentTokenInfo[];
  contractAddress: string;
  adminWallet: string;
}

export async function validateActivationCode(code: string): Promise<boolean> {
  if (!CODE_PATTERN.test(code)) return false;
  return CryptoCore.validateActivationCode(code);
}

export async function verifyActivationCodeOnChain(code: string): Promise<'verified' | 'not_found' | 'network_error' | 'invalid_format'> {
  if (!CODE_PATTERN.test(code)) return 'invalid_format';
  return CryptoCore.verifyActivationCodeOnChain(code);
}

export async function getPaymentInfo(): Promise<PaymentInfo> {
  return CryptoCore.getPaymentInfo();
}

export async function getActivationCodeByBuyer(buyerAddress: string): Promise<string | null> {
  return CryptoCore.getActivationCodeByBuyer(buyerAddress);
}

export function isActivationCodeFormat(code: string): boolean {
  return CODE_PATTERN.test(code);
}

export { FREE_ENCRYPT_LIMIT };
