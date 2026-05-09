import type { Permission } from 'react-native';

export type PasswordStrength = 'weak' | 'medium' | 'strong';
export type NetworkStatus = 'online' | 'offline' | 'unknown';
export type PermissionStatus = 'granted' | 'denied' | 'blocked' | 'unavailable';

export interface WorkspaceStatus {
  initialized: boolean;
  path: string;
  fileCount: number;
  usedSpace: number;
}

export interface FileInfo {
  name: string;
  originalName: string;
  path: string;
  size: number;
  fileType: string;
  createdAt: number;
  modifiedAt: number;
  mimeType: string;
}

export interface UserInfo {
  username: string;
  passwordHash: string;
}

export interface PermissionConfig {
  name: string;
  title: string;
  description: string;
  icon: string;
  required: boolean;
  androidPermission?: Permission;
}

export type RootStackParamList = {
  Home: undefined;
  Login: undefined;
  Encrypt: undefined;
  Decrypt: { filePath?: string };
  FileList: undefined;
  Share: { filePath?: string; fileName?: string };
  WorkspaceSettings: undefined;
  PermissionSettings: undefined;
  About: undefined;
  Activation: undefined;
};

export const SUPPORTED_EXTENSIONS = [
  'doc', 'docx', 'pdf', 'txt', 'xls', 'xlsx', 'ppt', 'pptx',
  'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp',
  'mp4', 'avi', 'mov', 'mkv',
  'zip', 'rar', '7z',
];
