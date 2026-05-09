import type { NetworkStatus } from '../types';

interface NetInfoState {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
}

let NetInfo: {
  fetch: () => Promise<NetInfoState>;
  addEventListener: (cb: (s: NetInfoState) => void) => () => void;
} | null = null;
try {
  const m = require('@react-native-community/netinfo');
  NetInfo = m.default || m;
} catch {}

function toStatus(s: NetInfoState): NetworkStatus {
  if (s.isConnected === true && s.isInternetReachable === true) {
    return 'online';
  }
  return 'offline';
}

export async function checkNetworkStatus(): Promise<NetworkStatus> {
  if (!NetInfo) {
    return 'offline';
  }
  try {
    const s = await NetInfo.fetch();
    return toStatus(s);
  } catch {
    return 'offline';
  }
}

export function monitorNetwork(cb: (status: NetworkStatus) => void): () => void {
  if (!NetInfo) {
    cb('offline');
    return () => {};
  }
  return NetInfo.addEventListener((s) => {
    cb(toStatus(s));
  });
}

export function getNetworkStatus(): NetworkStatus {
  return 'unknown';
}
