import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Colors from '../theme/colors';
import {
  listEncryptedFiles,
  formatFileSize,
  scanAllRedFiles,
  checkManageStoragePermission,
  requestManageStoragePermission,
} from '../utils/workspace';
import type { ScannedRedFile } from '../utils/workspace';
import { hapticLight, hapticSuccess, hapticError } from '../utils/haptic';
import { log } from '../utils/logger';
import { t } from '../i18n';
import type { RootStackParamList, FileInfo } from '../types';

interface ShareModule {
  open: (opts: any) => Promise<any>;
}

let RNShare: ShareModule | null = null;
try {
  const m = require('react-native-share');
  RNShare = m.default || m;
} catch {}

interface RNFSModule {
  readFile: (p: string, e: string) => Promise<string>;
  exists: (p: string) => Promise<boolean>;
  copyFile: (f: string, d: string) => Promise<void>;
  CachesDirectoryPath: string;
}

let RNFS: RNFSModule | null = null;
try {
  RNFS = require('react-native-fs') as RNFSModule;
} catch {}

type Props = NativeStackScreenProps<RootStackParamList, 'Share'>;

const ShareScreen: React.FC<Props> = ({ route }) => {
  const filePath = route.params?.filePath;
  const fileName = route.params?.fileName;
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [externalFiles, setExternalFiles] = useState<FileInfo[]>([]);
  const [sharing, setSharing] = useState(false);
  const [fullScanning, setFullScanning] = useState(false);
  const [fullScanProgress, setFullScanProgress] = useState('');

  useEffect(() => {
    if (filePath && fileName) {
      setSelectedFile({
        name: fileName,
        originalName: fileName,
        path: filePath,
        size: 0,
        fileType: 'red',
        createdAt: Date.now(),
        modifiedAt: Date.now(),
        mimeType: 'application/octet-stream',
      });
    }
    listEncryptedFiles().then(setFiles);
  }, [filePath, fileName]);

  const fullScanAllFiles = useCallback(async () => {
    const hasPermission = await checkManageStoragePermission();
    if (!hasPermission) {
      Alert.alert(
        t('decrypt_fullscan_perm_title'),
        t('decrypt_fullscan_perm_msg'),
        [
          { text: t('common_cancel'), style: 'cancel' },
          {
            text: t('decrypt_fullscan_perm_go'),
            onPress: async () => {
              await requestManageStoragePermission();
            },
          },
        ],
      );
      return;
    }
    setFullScanning(true);
    setFullScanProgress(t('decrypt_fullscan_start'));
    setExternalFiles([]);
    try {
      const scanned: ScannedRedFile[] = await scanAllRedFiles((s, f) => {
        setFullScanProgress(t('decrypt_fullscan_progress').replace('{scanned}', String(s)).replace('{found}', String(f)));
      });
      const mapped: FileInfo[] = scanned.map((f) => ({
        name: f.name,
        originalName: f.name.replace(/\.red$/, ''),
        path: f.path,
        size: f.size,
        fileType: f.name.split('.').slice(-2, -1)[0] || 'unknown',
        createdAt: Date.now(),
        modifiedAt: Date.now(),
        mimeType: 'application/octet-stream',
      }));
      setExternalFiles(mapped);
      log.info('Share', `全盘扫描完成: ${mapped.length}个外部文件`);
    } catch (e: any) {
      log.error('Share', `全盘扫描失败: ${e.message || '未知错误'}`);
      Alert.alert(t('decrypt_scan_fail'), e.message || t('decrypt_err_unknown'));
    } finally {
      setFullScanning(false);
      setFullScanProgress('');
    }
  }, []);

  const handleShare = useCallback(async () => {
    if (!RNShare || !RNFS) {
      Alert.alert(t('common_error'), t('share_unavailable'));
      return;
    }
    const target = selectedFile;
    if (!target) {
      Alert.alert(t('common_tip'), t('share_select_file'));
      return;
    }
    hapticLight();
    log.touch('Share', `点击分享: ${target.name}`);
    setSharing(true);
    try {
      if (!(await RNFS.exists(target.path))) {
        Alert.alert(t('common_error'), t('share_file_not_exist'));
        return;
      }
      const sharePath = `${RNFS.CachesDirectoryPath}/${target.name}`;
      await RNFS.copyFile(target.path, sharePath);
      await RNShare.open({
        title: target.name || t('share_title'),
        message: t('share_share_msg').replace('{name}', target.name),
        url: `file://${sharePath}`,
        filename: target.name,
        type: 'application/octet-stream',
        failOnCancel: false,
      });
      hapticSuccess();
      log.info('Share', `分享成功: ${target.name}`);
    } catch (e: any) {
      if (
        e.message?.includes('cancel') ||
        e.message?.includes('CANCELLED')
      ) {
        return;
      }
      hapticError();
      log.error('Share', `分享失败: ${e.message || '未知错误'}`);
      Alert.alert(t('share_fail'), e.message || t('decrypt_err_unknown'));
    } finally {
      setSharing(false);
    }
  }, [selectedFile]);

  const renderFileItem = useCallback(
    (f: FileInfo) => (
      <TouchableOpacity
        key={f.path}
        style={styles.fileItem}
        onPress={() => {
          hapticLight();
          setSelectedFile(f);
        }}>
        <Text style={styles.fileItemName} numberOfLines={1}>
          {f.name}
        </Text>
        <Text style={styles.fileItemMeta}>
          {formatFileSize(f.size)}
        </Text>
      </TouchableOpacity>
    ),
    [],
  );

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{t('share_title')}</Text>

        {selectedFile ? (
          <View style={styles.selectedCard}>
            <Text style={styles.selectedLabel}>{t('share_selected_label')}</Text>
            <Text style={styles.selectedName}>{selectedFile.name}</Text>
            {selectedFile.size > 0 && (
              <Text style={styles.selectedMeta}>
                {formatFileSize(selectedFile.size)}
              </Text>
            )}
            <TouchableOpacity
              style={styles.changeBtn}
              onPress={() => setSelectedFile(null)}>
              <Text style={styles.changeBtnText}>{t('common_change')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.pickSection}>
            <View style={styles.pickHeader}>
              <Text style={styles.pickHint}>{t('share_pick_hint')}</Text>
              <TouchableOpacity
                style={styles.fullScanBtn}
                onPress={fullScanAllFiles}
                disabled={fullScanning}>
                <Text style={styles.fullScanBtnText}>
                  {fullScanning ? t('decrypt_fullscan_scanning') : t('decrypt_fullscan_btn')}
                </Text>
              </TouchableOpacity>
            </View>

            {fullScanProgress ? (
              <Text style={styles.progressText}>{fullScanProgress}</Text>
            ) : null}

            {files.length === 0 && externalFiles.length === 0 && !fullScanning ? (
              <Text style={styles.emptyText}>{t('share_no_files')}</Text>
            ) : (
              <>
                {files.map((f) => renderFileItem(f))}
                {externalFiles.length > 0 && (
                  <>
                    <View style={styles.sectionDivider} />
                    <Text style={styles.sectionTitle}>{t('decrypt_fullscan_result')}</Text>
                    {externalFiles.map((f) => renderFileItem(f))}
                  </>
                )}
              </>
            )}

            {fullScanning && (
              <View style={styles.center}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.centerText}>{t('decrypt_fullscan_scanning')}</Text>
              </View>
            )}
          </View>
        )}

        <TouchableOpacity
          style={[styles.shareBtn, !selectedFile && styles.shareBtnDisabled]}
          onPress={handleShare}
          disabled={!selectedFile || sharing}>
          {sharing ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.shareBtnText}>{t('share_btn')}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Colors.gap.lg },
  title: {
    fontSize: Colors.font.xl,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 20,
  },
  selectedCard: {
    backgroundColor: Colors.surface,
    borderRadius: Colors.radius.md,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  selectedLabel: {
    fontSize: Colors.font.sm,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  selectedName: {
    fontSize: Colors.font.md,
    color: Colors.text,
    fontWeight: '600',
    marginBottom: 4,
  },
  selectedMeta: {
    fontSize: Colors.font.sm,
    color: Colors.textHint,
    marginBottom: 8,
  },
  changeBtn: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.surfaceVariant,
    borderRadius: Colors.radius.sm,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  changeBtnText: {
    color: Colors.primary,
    fontSize: Colors.font.sm,
    fontWeight: '600',
  },
  pickSection: {
    marginBottom: 20,
  },
  pickHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pickHint: {
    fontSize: Colors.font.md,
    color: Colors.textSecondary,
    flex: 1,
  },
  fullScanBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Colors.radius.sm,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  fullScanBtnText: {
    color: Colors.buttonText,
    fontSize: Colors.font.sm,
    fontWeight: '700',
  },
  progressText: {
    color: Colors.textHint,
    fontSize: Colors.font.sm,
    textAlign: 'center',
    marginBottom: 8,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  sectionTitle: {
    fontSize: Colors.font.md,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: Colors.font.md,
    color: Colors.textHint,
    textAlign: 'center',
    paddingVertical: 20,
  },
  fileItem: {
    backgroundColor: Colors.surface,
    borderRadius: Colors.radius.md,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  fileItemName: {
    fontSize: Colors.font.md,
    color: Colors.text,
    fontWeight: '600',
    marginBottom: 2,
  },
  fileItemMeta: {
    fontSize: Colors.font.sm,
    color: Colors.textHint,
  },
  center: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  centerText: {
    color: Colors.textHint,
    fontSize: Colors.font.sm,
    marginTop: 6,
  },
  shareBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Colors.radius.md,
    padding: 16,
    alignItems: 'center',
  },
  shareBtnDisabled: { opacity: 0.5 },
  shareBtnText: {
    color: Colors.buttonText,
    fontSize: Colors.font.lg,
    fontWeight: '700',
  },
});

export default ShareScreen;
