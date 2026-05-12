import { PermissionsAndroid, Platform, NativeModules } from 'react-native';
import type {
  WorkspaceStatus,
  PermissionConfig,
  PermissionStatus,
} from '../types';
import { t } from '../i18n';

interface RNFSModule {
  DocumentDirectoryPath: string;
  ExternalStorageDirectoryPath?: string;
  DownloadDirectoryPath?: string;
  mkdir: (p: string) => Promise<void>;
  exists: (p: string) => Promise<boolean>;
  writeFile: (p: string, c: string, e?: string) => Promise<void>;
  readDir: (
    p: string,
  ) => Promise<Array<{ name: string; size: number; isFile: () => boolean; isDirectory: () => boolean; path: string }>>;
  unlink: (p: string) => Promise<void>;
  readFile: (p: string, e?: string) => Promise<string>;
  stat: (p: string) => Promise<{ isFile: () => boolean; isDirectory: () => boolean; size: number }>;
}

let RNFS: RNFSModule | null = null;
try {
  RNFS = require('react-native-fs') as RNFSModule;
} catch {}

const WORKSPACE_DIR = 'HongmoSecureBox';
const ENCRYPTED_DIR = 'encrypted';
const DECRYPTED_DIR = 'decrypted';

function getBasePath(): string {
  return RNFS?.DocumentDirectoryPath || '';
}

export function getWorkspacePath(): string {
  return `${getBasePath()}/${WORKSPACE_DIR}`;
}

export function getEncryptedPath(): string {
  return `${getBasePath()}/${WORKSPACE_DIR}/${ENCRYPTED_DIR}`;
}

export function getDecryptedPath(): string {
  return `${getBasePath()}/${WORKSPACE_DIR}/${DECRYPTED_DIR}`;
}

export async function initWorkspace(): Promise<WorkspaceStatus> {
  const basePath = getBasePath();
  if (!basePath || !RNFS) {
    return { initialized: false, path: '', fileCount: 0, usedSpace: 0 };
  }
  try {
    for (const p of [
      getWorkspacePath(),
      getEncryptedPath(),
      getDecryptedPath(),
    ]) {
      if (!(await RNFS.exists(p))) await RNFS.mkdir(p);
    }
    const nomedia = `${getWorkspacePath()}/.nomedia`;
    if (!(await RNFS.exists(nomedia))) {
      await RNFS.writeFile(nomedia, '', 'utf8');
    }
    const files = await listEncryptedFiles();
    const usedSpace = files.reduce((s, f) => s + f.size, 0);
    return {
      initialized: true,
      path: getWorkspacePath(),
      fileCount: files.length,
      usedSpace,
    };
  } catch {
    return {
      initialized: false,
      path: getWorkspacePath(),
      fileCount: 0,
      usedSpace: 0,
    };
  }
}

export async function getWorkspaceStatus(): Promise<WorkspaceStatus> {
  if (!RNFS) {
    return { initialized: false, path: '', fileCount: 0, usedSpace: 0 };
  }
  try {
    const ex = await RNFS.exists(getWorkspacePath());
    if (!ex) {
      return {
        initialized: false,
        path: getWorkspacePath(),
        fileCount: 0,
        usedSpace: 0,
      };
    }
    const files = await listEncryptedFiles();
    return {
      initialized: true,
      path: getWorkspacePath(),
      fileCount: files.length,
      usedSpace: files.reduce((s, f) => s + f.size, 0),
    };
  } catch {
    return {
      initialized: false,
      path: getWorkspacePath(),
      fileCount: 0,
      usedSpace: 0,
    };
  }
}

export async function listEncryptedFiles() {
  if (!RNFS) return [];
  const encPath = getEncryptedPath();
  try {
    if (!(await RNFS.exists(encPath))) return [];
    const entries = await RNFS.readDir(encPath);
    return entries
      .filter((e) => e.isFile() && e.name.endsWith('.red'))
      .map((e) => ({
        name: e.name,
        originalName: e.name.replace(/\.red$/, ''),
        path: `${encPath}/${e.name}`,
        size: e.size,
        fileType:
          e.name.split('.').slice(-2, -1)[0] || 'unknown',
        createdAt: Date.now(),
        modifiedAt: Date.now(),
        mimeType: 'application/octet-stream',
      }));
  } catch {
    return [];
  }
}

export async function saveEncryptFile(
  content: string,
  fileName: string,
): Promise<string> {
  if (!RNFS) throw new Error(t('fs_unavailable'));
  const encPath = getEncryptedPath();
  if (!(await RNFS.exists(encPath))) await RNFS.mkdir(encPath);
  const safeName = fileName.endsWith('.red') ? fileName : fileName + '.red';
  const filePath = `${encPath}/${safeName}`;
  await RNFS.writeFile(filePath, content, 'utf8');
  return filePath;
}

export async function readEncryptFile(path: string): Promise<string> {
  if (!RNFS) throw new Error(t('fs_unavailable'));
  return RNFS.readFile(path, 'utf8');
}

export async function getDecryptOutputPath(
  originalName: string,
): Promise<string> {
  if (!RNFS) throw new Error(t('fs_unavailable'));
  const decPath = getDecryptedPath();
  if (!(await RNFS.exists(decPath))) await RNFS.mkdir(decPath);
  return `${decPath}/${originalName}`;
}

export async function writeBase64ToFile(
  base64: string,
  outputPath: string,
): Promise<void> {
  if (!RNFS) throw new Error(t('fs_unavailable'));
  await RNFS.writeFile(outputPath, base64, 'base64');
}

export async function deleteEncryptFile(path: string): Promise<void> {
  if (!RNFS) throw new Error(t('fs_unavailable'));
  if (await RNFS.exists(path)) await RNFS.unlink(path);
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export const PERMISSION_CONFIGS: PermissionConfig[] = [
  {
    name: 'storage',
    title: t('perm_storage_title'),
    description: t('perm_storage_desc'),
    icon: '💾',
    required: true,
    androidPermission: PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
  },
  {
    name: 'readStorage',
    title: t('perm_read_storage_title'),
    description: t('perm_read_storage_desc'),
    icon: '📂',
    required: true,
    androidPermission: PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
  },
  {
    name: 'readMediaImages',
    title: t('perm_read_images_title'),
    description: t('perm_read_images_desc'),
    icon: '🖼️',
    required: false,
    androidPermission: PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
  },
  {
    name: 'readMediaVideo',
    title: t('perm_read_videos_title'),
    description: t('perm_read_videos_desc'),
    icon: '🎬',
    required: false,
    androidPermission: PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
  },
];

export async function checkPermission(
  config: PermissionConfig,
): Promise<PermissionStatus> {
  if (Platform.OS !== 'android' || !config.androidPermission) {
    return 'unavailable';
  }
  try {
    const sdk = Platform.Version as number;
    if (sdk >= 33 && (
      config.androidPermission === PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE ||
      config.androidPermission === PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
    )) {
      return 'granted';
    }
    if (sdk < 33 && (
      config.androidPermission === PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES ||
      config.androidPermission === PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO
    )) {
      return 'granted';
    }
    return (await PermissionsAndroid.check(config.androidPermission))
      ? 'granted'
      : 'denied';
  } catch {
    return 'unavailable';
  }
}

export async function requestPermission(
  config: PermissionConfig,
): Promise<PermissionStatus> {
  if (Platform.OS !== 'android' || !config.androidPermission) {
    return 'unavailable';
  }
  try {
    const sdk = Platform.Version as number;
    if (sdk >= 33 && (
      config.androidPermission === PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE ||
      config.androidPermission === PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
    )) {
      return 'granted';
    }
    if (sdk < 33 && (
      config.androidPermission === PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES ||
      config.androidPermission === PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO
    )) {
      return 'granted';
    }
    const result = await PermissionsAndroid.request(config.androidPermission);
    if (result === 'granted') return 'granted';
    if (result === 'never_ask_again') return 'blocked';
    return 'denied';
  } catch {
    return 'unavailable';
  }
}

export async function checkAllPermissions(): Promise<
  Record<string, PermissionStatus>
> {
  const results: Record<string, PermissionStatus> = {};
  for (const config of PERMISSION_CONFIGS) {
    results[config.name] = await checkPermission(config);
  }
  return results;
}

const SKIP_DIRS = new Set([
  'Android', 'android', '.android',
  'MIUI', '.MIUI',
  'System', 'system',
  'cache', 'Cache', '.cache',
  '.Trash', '.trash',
  '.Thumbnail', '.thumbnail', 'thumbnail', 'Thumbnail',
  'backups', '.backup',
  'lost+found',
  '.profig', '.profigos',
  'dings', 'Dings',
]);

export interface ScannedRedFile {
  name: string;
  path: string;
  size: number;
  isExternal: boolean;
}

export async function checkManageStoragePermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  try {
    const StoragePermission = NativeModules.StoragePermission;
    if (StoragePermission && StoragePermission.checkManageStoragePermission) {
      return await StoragePermission.checkManageStoragePermission();
    }
    const sdk = Platform.Version as number;
    if (sdk < 30) {
      return await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
      );
    }
    return false;
  } catch {
    return false;
  }
}

export async function requestManageStoragePermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  try {
    const StoragePermission = NativeModules.StoragePermission;
    if (StoragePermission && StoragePermission.requestManageStoragePermission) {
      return await StoragePermission.requestManageStoragePermission();
    }
    const sdk = Platform.Version as number;
    if (sdk < 30) {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
      );
      return result === 'granted';
    }
    return false;
  } catch {
    return false;
  }
}

export async function scanAllRedFiles(
  onProgress?: (scanned: number, found: number) => void,
): Promise<ScannedRedFile[]> {
  if (!RNFS) return [];

  const startPaths: string[] = [];
  const ext = (RNFS as any).ExternalStorageDirectoryPath;
  const dl = (RNFS as any).DownloadDirectoryPath;
  if (ext) startPaths.push(ext);
  if (dl && dl !== ext) startPaths.push(dl);

  if (startPaths.length === 0) return [];

  const results: ScannedRedFile[] = [];
  const visited = new Set<string>();
  let scannedCount = 0;

  async function walk(dir: string, depth: number): Promise<void> {
    if (depth > 8) return;
    if (visited.has(dir)) return;
    visited.add(dir);

    let entries: Array<{ name: string; size: number; isFile: () => boolean; isDirectory: () => boolean; path: string }>;
    try {
      if (!(await RNFS!.exists(dir))) return;
      entries = await RNFS!.readDir(dir);
    } catch {
      return;
    }

    for (const entry of entries) {
      scannedCount++;
      if (onProgress && scannedCount % 50 === 0) {
        onProgress(scannedCount, results.length);
      }
      try {
        if (entry.isFile() && entry.name.endsWith('.red')) {
          results.push({
            name: entry.name,
            path: entry.path || `${dir}/${entry.name}`,
            size: entry.size,
            isExternal: true,
          });
        } else if (entry.isDirectory && entry.isDirectory() && !SKIP_DIRS.has(entry.name)) {
          const subPath = entry.path || `${dir}/${entry.name}`;
          await walk(subPath, depth + 1);
        }
      } catch {
        continue;
      }
    }
  }

  for (const p of startPaths) {
    await walk(p, 0);
  }

  return results;
}
