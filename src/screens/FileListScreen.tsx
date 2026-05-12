import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Colors from '../theme/colors';
import {
  listEncryptedFiles,
  deleteEncryptFile,
  formatFileSize,
  scanAllRedFiles,
  checkManageStoragePermission,
  requestManageStoragePermission,
} from '../utils/workspace';
import type { ScannedRedFile } from '../utils/workspace';
import { hapticLight } from '../utils/haptic';
import { log } from '../utils/logger';
import { t } from '../i18n';
import type { RootStackParamList, FileInfo } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'FileList'>;

const FileListScreen: React.FC<Props> = ({ navigation }) => {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [externalFiles, setExternalFiles] = useState<FileInfo[]>([]);
  const [fullScanning, setFullScanning] = useState(false);
  const [fullScanProgress, setFullScanProgress] = useState('');

  useFocusEffect(
    useCallback(() => {
      listEncryptedFiles().then(setFiles);
    }, []),
  );

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
      log.info('FileList', `全盘扫描完成: ${mapped.length}个外部文件`);
    } catch (e: any) {
      log.error('FileList', `全盘扫描失败: ${e.message || '未知错误'}`);
      Alert.alert(t('decrypt_scan_fail'), e.message || t('decrypt_err_unknown'));
    } finally {
      setFullScanning(false);
      setFullScanProgress('');
    }
  }, []);

  const handleDelete = useCallback((f: FileInfo) => {
    log.touch('FileList', `点击删除: ${f.name}`);
    Alert.alert(
      t('filelist_delete_title'),
      t('filelist_delete_msg').replace('{name}', f.name),
      [
        { text: t('common_cancel'), style: 'cancel' },
        {
          text: t('common_delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEncryptFile(f.path);
              log.file('FileList', `已删除: ${f.name}`);
              listEncryptedFiles().then(setFiles);
            } catch (e: any) {
              log.error('FileList', `删除失败: ${e.message}`);
              Alert.alert(t('filelist_delete_fail'), e.message);
            }
          },
        },
      ],
    );
  }, []);

  const handleDecrypt = useCallback(
    (f: FileInfo) => {
      hapticLight();
      log.touch('FileList', `点击解密: ${f.name}`);
      navigation.navigate('Decrypt', { filePath: f.path });
    },
    [navigation],
  );

  const handleShare = useCallback(
    (f: FileInfo) => {
      hapticLight();
      log.touch('FileList', `点击分享: ${f.name}`);
      navigation.navigate('Share', {
        filePath: f.path,
        fileName: f.name,
      });
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }: { item: FileInfo }) => (
      <View style={styles.fileCard}>
        <View style={styles.fileInfo}>
          <Text style={styles.fileName} numberOfLines={1}>
            {item.originalName}
          </Text>
          <Text style={styles.fileMeta}>
            {formatFileSize(item.size)} ·{' '}
            {item.fileType.toUpperCase()}
          </Text>
        </View>
        <View style={styles.fileActions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleDecrypt(item)}>
            <Text style={styles.actionText}>🔓</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleShare(item)}>
            <Text style={styles.actionText}>📤</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleDelete(item)}>
            <Text style={styles.actionText}>🗑</Text>
          </TouchableOpacity>
        </View>
      </View>
    ),
    [handleDecrypt, handleShare, handleDelete],
  );

  return (
    <View style={styles.root}>
      <View style={styles.scanHeader}>
        <Text style={styles.scanTitle}>{t('filelist_title')}</Text>
        <TouchableOpacity
          style={[styles.scanBtn, styles.fullScanBtn]}
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

      <FlatList
        data={files}
        keyExtractor={(i) => i.path}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>{t('filelist_empty')}</Text>
        }
      />

      {externalFiles.length > 0 && (
        <>
          <View style={styles.sectionDivider} />
          <Text style={styles.sectionTitle}>{t('decrypt_fullscan_result')}</Text>
          <FlatList
            data={externalFiles}
            keyExtractor={(i) => i.path}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            scrollEnabled={false}
          />
        </>
      )}

      {fullScanning && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.centerText}>{t('decrypt_fullscan_scanning')}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  scanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Colors.gap.lg,
    paddingTop: Colors.gap.lg,
  },
  scanTitle: {
    fontSize: Colors.font.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  scanBtn: {
    borderRadius: Colors.radius.sm,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  fullScanBtn: {
    backgroundColor: Colors.primary,
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
    marginBottom: 4,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 8,
    marginHorizontal: Colors.gap.lg,
  },
  sectionTitle: {
    fontSize: Colors.font.md,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 8,
    paddingHorizontal: Colors.gap.lg,
  },
  list: { padding: Colors.gap.lg },
  fileCard: {
    backgroundColor: Colors.surface,
    borderRadius: Colors.radius.md,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  fileInfo: { marginBottom: 8 },
  fileName: {
    fontSize: Colors.font.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  fileMeta: { fontSize: Colors.font.sm, color: Colors.textHint },
  fileActions: { flexDirection: 'row', gap: 12 },
  actionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: Colors.surfaceVariant,
    borderRadius: Colors.radius.sm,
  },
  actionText: { fontSize: 18 },
  empty: {
    textAlign: 'center',
    color: Colors.textHint,
    marginTop: 40,
    fontSize: Colors.font.md,
  },
  center: { alignItems: 'center', paddingVertical: 20 },
  centerText: {
    color: Colors.textHint,
    fontSize: Colors.font.md,
    marginTop: 8,
  },
});

export default FileListScreen;
