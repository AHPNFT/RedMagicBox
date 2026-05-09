import { SUPPORTED_EXTENSIONS } from '../types';

let DocumentPicker: {
  pick: (opts: any) => Promise<Array<{ uri: string; name: string; type: string; size: number }>>;
  types: Record<string, string>;
  isCancel: (err: any) => boolean;
} | null = null;
try {
  const m = require('react-native-document-picker');
  DocumentPicker = m.default || m;
} catch {}

let RNFS: { readFile: (p: string, e: string) => Promise<string> } | null = null;
try {
  RNFS = require('react-native-fs');
} catch {}

function base64Encode(str: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = '';
  for (let i = 0; i < str.length; i += 3) {
    const byte1 = str.charCodeAt(i);
    const byte2 = i + 1 < str.length ? str.charCodeAt(i + 1) : 0;
    const byte3 = i + 2 < str.length ? str.charCodeAt(i + 2) : 0;
    output += chars.charAt(byte1 >> 2);
    output += chars.charAt(((byte1 & 3) << 4) | (byte2 >> 4));
    output += i + 1 < str.length ? chars.charAt(((byte2 & 15) << 2) | (byte3 >> 6)) : '=';
    output += i + 2 < str.length ? chars.charAt(byte3 & 63) : '=';
  }
  return output;
}

export function isSupportedFile(fileName: string): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  return SUPPORTED_EXTENSIONS.includes(ext);
}

export async function pickFile(): Promise<{
  uri: string;
  name: string;
  type: string;
  size: number;
} | null> {
  if (!DocumentPicker) return null;
  try {
    const results = await DocumentPicker.pick({
      type: [DocumentPicker.types?.allFiles || '*/*'],
    });
    return results?.[0] || null;
  } catch (e: any) {
    if (DocumentPicker?.isCancel?.(e)) return null;
    return null;
  }
}

export async function readFileAsBase64(uri: string): Promise<string> {
  if (RNFS) {
    const path = uri.replace(/^file:\/\//, '');
    return RNFS.readFile(path, 'base64');
  }
  const response = await fetch(uri);
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return base64Encode(binary);
}
