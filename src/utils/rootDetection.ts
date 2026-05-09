import { Platform } from 'react-native';

const ROOT_PATHS = [
  '/system/app/Superuser',
  '/system/xbin/daemonsu',
  '/system/etc/init.d/99SuperSUDaemon',
  '/system/bin/.ext/.su',
  '/system/etc/.has_su_daemon',
  '/system/etc/.installed_su_daemon',
  '/dev/com.koushikdutta.superuser.daemon',
  '/sbin/su',
  '/system/bin/su',
  '/system/xbin/su',
  '/data/local/xbin/su',
  '/data/local/bin/su',
  '/system/sd/xbin/su',
  '/system/bin/failsafe/su',
  '/data/local/su',
  '/su/bin/su',
  '/system/bin/magisk',
  '/system/bin/.magisk',
  '/sbin/.magisk',
  '/data/adb/magisk',
  '/data/adb/magisk.db',
  '/data/adb/magisk_simple',
  '/data/adb/.magisk',
];

const ROOT_PACKAGES = [
  'com.noshufou.android.su',
  'com.thirdparty.superuser',
  'eu.chainfire.supersu',
  'com.koushikdutta.superuser',
  'com.topjohnwu.magisk',
  'io.github.huskydg.magisk',
  'com.geohot.towelroot',
  'com.zachspong.temprootremovejb',
  'com.ramdroid.appquarantine',
  'com.devadvance.rootcloak',
  'com.devadvance.rootcloakplus',
  'de.robv.android.xposed.installer',
  'com.saurik.substrate',
];

let cachedResult: boolean | null = null;

let RNFS: {
  exists: (p: string) => Promise<boolean>;
} | null = null;
try { RNFS = require('react-native-fs'); } catch {}

export async function checkRoot(): Promise<boolean> {
  if (cachedResult !== null) return cachedResult;
  if (Platform.OS !== 'android') {
    cachedResult = false;
    return false;
  }

  let isRooted = false;

  if (RNFS) {
    for (const path of ROOT_PATHS) {
      try {
        if (await RNFS.exists(path)) {
          isRooted = true;
          break;
        }
      } catch {}
    }
  }

  try {
    const { NativeModules } = require('react-native');
    const pm = NativeModules.PackageManager;
    if (pm && pm.isPackageInstalled) {
      for (const pkg of ROOT_PACKAGES) {
        try {
          const installed = await pm.isPackageInstalled(pkg);
          if (installed) {
            isRooted = true;
            break;
          }
        } catch {}
      }
    }
  } catch {}

  cachedResult = isRooted;
  return isRooted;
}

export function clearRootCache(): void {
  cachedResult = null;
}
