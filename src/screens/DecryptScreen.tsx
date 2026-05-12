import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  FlatList,
  TextInput,
  Image,
  NativeModules,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Colors from '../theme/colors';
import NetworkWarning from '../components/NetworkWarning';
import { decryptFile, parseEncryptMeta } from '../utils/crypto';
import type { EncryptMeta } from '../utils/crypto';
import { getDecryptOutputPath, listEncryptedFiles } from '../utils/workspace';
import { getSession, getSessionPassword } from '../utils/user';
import { getActivationState, getActivationCode } from '../utils/activationState';
import { hapticSuccess, hapticError, hapticLight } from '../utils/haptic';
import { log } from '../utils/logger';
import { t } from '../i18n';

type Props = NativeStackScreenProps<any, 'Decrypt'>;

interface RedFile {
  name: string;
  path: string;
  size: number;
  ownerRedid: string;
  ownerRedidMasked: string;
  isOwner: boolean;
  meta: EncryptMeta;
}

function maskRedid(id: string): string {
  if (!id || id === 'unknown') return id;
  return id.charAt(0) + '***' + id.slice(-1);
}

function getFileIcon(ex?: string): string {
  if (!ex) return '📄';
  const img = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
  const doc = ['doc', 'docx', 'pdf', 'txt'];
  const vid = ['mp4', 'avi', 'mov', 'mkv'];
  const zip = ['zip', 'rar', '7z'];
  if (img.includes(ex)) return '🖼️';
  if (doc.includes(ex)) return '📄';
  if (vid.includes(ex)) return '🎬';
  if (zip.includes(ex)) return '📦';
  return '📄';
}

function isPreviewable(meta: EncryptMeta): boolean {
  if (!meta.ex) return false;
  return ['txt', 'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(meta.ex);
}

function isImageExt(ex?: string): boolean {
  if (!ex) return false;
  return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ex);
}

const DecryptScreen: React.FC<Props> = ({ route, navigation }) => {
  const [files, setFiles] = useState<RedFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [rawUsername, setRawUsername] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [pendingFile, setPendingFile] = useState<RedFile | null>(null);
  const [pendingAction, setPendingAction] = useState<'decrypt' | 'preview' | 'open'>('decrypt');
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    getSession().then((s) => {
      if (s) setRawUsername(s);
    });
    scanFiles();
  }, []);

  const scanFiles = useCallback(async () => {
    log.touch('Decrypt', '点击刷新扫描');
    setScanning(true);
    try {
      const session = await getSession();
      const currentRedid = session || '';
      const workspaceFiles = await listEncryptedFiles();
      const scannedFiles: RedFile[] = [];
      for (const f of workspaceFiles) {
        let ownerRedid = 'unknown';
        let meta: EncryptMeta = {};
        try {
          const RNFS = require('react-native-fs');
          const content = await RNFS.readFile(f.path, 'utf8');
          if (content) {
            const parsed = JSON.parse(content);
            ownerRedid = parsed.u || 'unknown';
            meta = await parseEncryptMeta(content);
          }
        } catch {
          ownerRedid = 'unknown';
        }
        scannedFiles.push({
          name: f.name,
          path: f.path,
          size: f.size,
          ownerRedid,
          ownerRedidMasked: maskRedid(ownerRedid),
          isOwner: ownerRedid === currentRedid,
          meta,
        });
      }
      setFiles(scannedFiles);
      log.info('Decrypt', `扫描完成: ${scannedFiles.length}个文件`);
    } catch (e: any) {
      log.error('Decrypt', `扫描失败: ${e.message || '未知错误'}`);
      Alert.alert(t('decrypt_scan_fail'), e.message || t('decrypt_err_unknown'));
    } finally {
      setScanning(false);
    }
  }, []);

  const requestAction = useCallback(
    (file: RedFile, action: 'decrypt' | 'preview' | 'open') => {
      hapticLight();
      log.touch('Decrypt', `点击${action}: ${file.name}`);
      if (!file.isOwner) {
        Alert.alert(t('decrypt_cannot_operate'), t('decrypt_not_owner'), [
          { text: t('common_ok') },
        ]);
        return;
      }
      if (!rawUsername) {
        Alert.alert(t('common_tip'), t('encrypt_need_login'));
        return;
      }
      setPendingFile(file);
      setPendingAction(action);
      setShowPwdModal(true);
    },
    [rawUsername],
  );

  const doAction = useCallback(async () => {
    if (!confirmPwd.trim()) {
      Alert.alert(t('common_tip'), t('decrypt_pwd_empty'));
      return;
    }
    const loginPwd = await getSessionPassword();
    if (!loginPwd) {
      Alert.alert(t('common_tip'), t('encrypt_err_need_login'));
      return;
    }
    if (confirmPwd !== loginPwd) {
      Alert.alert(t('common_error'), t('encrypt_err_wrong_pwd'));
      hapticError();
      return;
    }
    setShowPwdModal(false);
    if (!pendingFile) return;

    setLoading(true);
    try {
      const RNFS = require('react-native-fs');
      const encryptedContent = await RNFS.readFile(pendingFile.path, 'utf8');
      const decryptedBase64 = await decryptFile(encryptedContent, loginPwd, rawUsername, (await getActivationState()).activated, await getActivationCode());

      const ext = pendingFile.meta.ex || '';
      const originalName = pendingFile.meta.fn || pendingFile.name.replace(/\.red$/, '');

      if (pendingAction === 'preview') {
        const tmpPath = `${RNFS.CachesDirectoryPath}/hongmo_preview_${Date.now()}.${ext || 'bin'}`;
        await RNFS.writeFile(tmpPath, decryptedBase64, 'base64');

        if (isImageExt(ext)) {
          setPreviewImage(`file://${tmpPath}`);
          setPreviewContent(null);
        } else {
          try {
            const text = await RNFS.readFile(tmpPath, 'utf8');
            setPreviewContent(text);
            setPreviewImage(null);
          } catch {
            setPreviewContent(t('decrypt_binary_preview'));
            setPreviewImage(null);
          }
          try { await RNFS.unlink(tmpPath); } catch {}
        }
        setShowPreview(true);
        hapticSuccess();
        log.info('Decrypt', `预览: ${originalName}`);
      } else if (pendingAction === 'open') {
        const tmpPath = `${RNFS.CachesDirectoryPath}/hongmo_open_${Date.now()}.${ext || 'bin'}`;
        await RNFS.writeFile(tmpPath, decryptedBase64, 'base64');
        const mime = pendingFile.meta.mt || 'application/octet-stream';

        try {
          await NativeModules.FileOpener.openFile(tmpPath, mime);
        } catch (openErr: any) {
          Alert.alert(t('decrypt_open_fail'), openErr.message || t('decrypt_no_app'));
        }
        hapticSuccess();
        log.info('Decrypt', `打开: ${originalName}`);
      } else {
        const outputPath = await getDecryptOutputPath(originalName);
        await RNFS.writeFile(outputPath, decryptedBase64, 'base64');
        setResult({ success: true, message: t('decrypt_saved').replace('{name}', originalName) });
        hapticSuccess();
        log.crypto('Decrypt', `解密成功: ${originalName}`);
        Alert.alert(t('decrypt_result_success'), t('decrypt_saved_msg').replace('{name}', originalName));
      }
    } catch (e: any) {
      const errMap: Record<string, string> = {
        DECRYPT_ERR_CIPHER_FORMAT: t('decrypt_err_cipher_format'),
        DECRYPT_ERR_TAMPERED: t('decrypt_err_tampered'),
        DECRYPT_ERR_USER_MISMATCH: t('decrypt_err_user_mismatch'),
        DECRYPT_ERR_HMAC: t('decrypt_err_hmac'),
        DECRYPT_ERR_FAILED: t('decrypt_err_failed'),
        DECRYPT_ERR_NEED_ACTIVATE: t('decrypt_err_need_activate'),
      };
      const msg = errMap[e.message] || e.message || t('decrypt_err_unknown');
      setResult({ success: false, message: msg });
      hapticError();
      log.error('Decrypt', `操作失败: ${msg}`);
      Alert.alert(t('decrypt_action_fail'), msg);
    } finally {
      setLoading(false);
      setConfirmPwd('');
      setPendingFile(null);
    }
  }, [confirmPwd, rawUsername, pendingFile, pendingAction]);

  const renderItem = useCallback(
    ({ item }: { item: RedFile }) => (
      <View style={[styles.fileItem, !item.isOwner && styles.fileItemLocked]}>
        <View style={styles.fileItemLeft}>
          <Text style={styles.fileItemIcon}>
            {getFileIcon(item.meta.ex)}
          </Text>
          <View style={styles.fileItemInfo}>
            <Text style={styles.fileName} numberOfLines={1}>
              {item.meta.fn || item.name}
            </Text>
            <Text style={styles.fileMeta}>
              {(item.size / 1024).toFixed(1)} KB · {item.ownerRedidMasked}
              {item.meta.ex ? ` · .${item.meta.ex}` : ''}
              {!item.isOwner && ` ${t('decrypt_not_current_user')}`}
            </Text>
          </View>
        </View>
        {item.isOwner ? (
          <View style={styles.actionRow}>
            {isPreviewable(item.meta) && (
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => requestAction(item, 'preview')}>
                <Text style={styles.actionBtnText}>👁</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => requestAction(item, 'open')}>
              <Text style={styles.actionBtnText}>📂</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => requestAction(item, 'decrypt')}>
              <Text style={styles.actionBtnText}>💾</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.lockIcon}>🔒</Text>
        )}
      </View>
    ),
    [requestAction],
  );

  return (
    <View style={styles.root}>
      <NetworkWarning />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}>
        <View style={styles.scanHeader}>
          <Text style={styles.scanTitle}>{t('decrypt_scan_title')}</Text>
          <TouchableOpacity
            style={styles.scanBtn}
            onPress={scanFiles}
            disabled={scanning}>
            <Text style={styles.scanBtnText}>
              {scanning ? t('decrypt_scanning') : t('decrypt_scan_refresh')}
            </Text>
          </TouchableOpacity>
        </View>

        {scanning ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.centerText}>{t('decrypt_scanning_files')}</Text>
          </View>
        ) : files.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyIcon}>📂</Text>
            <Text style={styles.centerText}>{t('decrypt_no_files')}</Text>
          </View>
        ) : (
          <FlatList
            data={files}
            keyExtractor={(item) => item.path}
            renderItem={renderItem}
            scrollEnabled={false}
          />
        )}

        {loading && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.centerText}>{t('decrypt_processing')}</Text>
          </View>
        )}

        {result && (
          <View
            style={[
              styles.resultCard,
              { borderColor: result.success ? Colors.success : Colors.error },
            ]}>
            <Text style={styles.resultTitle}>
              {result.success ? t('decrypt_result_success') : t('decrypt_result_fail')}
            </Text>
            <Text style={styles.resultText}>{result.message}</Text>
          </View>
        )}
      </ScrollView>

      {showPwdModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('decrypt_pwd_modal_title')}</Text>
            <Text style={styles.modalDesc}>
              {t(`decrypt_pwd_modal_desc_${pendingAction}`)}
            </Text>
            <TextInput
              style={styles.modalInput}
              value={confirmPwd}
              onChangeText={setConfirmPwd}
              placeholder={t('decrypt_pwd_placeholder')}
              placeholderTextColor={Colors.textHint}
              secureTextEntry
              autoFocus
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => { setShowPwdModal(false); setConfirmPwd(''); setPendingFile(null); }}>
                <Text style={styles.modalCancelText}>{t('common_cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={doAction}>
                <Text style={styles.modalConfirmText}>{t('common_confirm')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {showPreview && (
        <View style={styles.modalOverlay}>
          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle}>{t('decrypt_preview_title')}</Text>
              <TouchableOpacity
                onPress={() => { setShowPreview(false); setPreviewContent(null); setPreviewImage(null); }}>
                <Text style={styles.previewClose}>✕</Text>
              </TouchableOpacity>
            </View>
            {previewImage ? (
              <Image
                source={{ uri: previewImage }}
                style={styles.previewImage}
                resizeMode="contain"
              />
            ) : (
              <ScrollView style={styles.previewScroll}>
                <Text style={styles.previewText}>{previewContent}</Text>
              </ScrollView>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { padding: Colors.gap.lg },
  scanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  scanTitle: {
    fontSize: Colors.font.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  scanBtn: {
    backgroundColor: Colors.surfaceVariant,
    borderRadius: Colors.radius.sm,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  scanBtnText: {
    color: Colors.textSecondary,
    fontSize: Colors.font.sm,
    fontWeight: '600',
  },
  center: { alignItems: 'center', paddingVertical: 40 },
  centerText: {
    color: Colors.textHint,
    fontSize: Colors.font.md,
    marginTop: 12,
  },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  fileItem: {
    backgroundColor: Colors.surface,
    borderRadius: Colors.radius.md,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  fileItemLocked: { opacity: 0.6, borderColor: Colors.warning },
  fileItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginBottom: 8,
  },
  fileItemInfo: { flex: 1 },
  fileItemIcon: { fontSize: 24, marginRight: 10 },
  fileName: {
    fontSize: Colors.font.md,
    color: Colors.text,
    fontWeight: '600',
  },
  fileMeta: {
    fontSize: Colors.font.sm,
    color: Colors.textHint,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionBtn: {
    backgroundColor: Colors.surfaceVariant,
    borderRadius: Colors.radius.sm,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  actionBtnText: { fontSize: 16 },
  lockIcon: { fontSize: 20, color: Colors.textHint },
  resultCard: {
    backgroundColor: Colors.surface,
    borderRadius: Colors.radius.md,
    padding: 18,
    borderWidth: 1,
    marginTop: 16,
  },
  resultTitle: {
    fontSize: Colors.font.lg,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  resultText: {
    fontSize: Colors.font.md,
    color: Colors.textSecondary,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderRadius: Colors.radius.lg,
    padding: 24,
    width: '85%',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalTitle: {
    fontSize: Colors.font.xl,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: Colors.font.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: Colors.surfaceVariant,
    borderRadius: Colors.radius.sm,
    padding: 12,
    fontSize: Colors.font.md,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: Colors.surfaceVariant,
    borderRadius: Colors.radius.md,
    padding: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    color: Colors.textSecondary,
    fontSize: Colors.font.md,
    fontWeight: '600',
  },
  modalConfirmBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: Colors.radius.md,
    padding: 12,
    alignItems: 'center',
  },
  modalConfirmText: {
    color: Colors.buttonText,
    fontSize: Colors.font.md,
    fontWeight: '700',
  },
  previewCard: {
    backgroundColor: Colors.surface,
    borderRadius: Colors.radius.lg,
    width: '92%',
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  previewTitle: {
    fontSize: Colors.font.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  previewClose: {
    fontSize: 20,
    color: Colors.textSecondary,
    fontWeight: '700',
    paddingHorizontal: 8,
  },
  previewScroll: {
    padding: 16,
    maxHeight: 500,
  },
  previewText: {
    fontSize: Colors.font.md,
    color: Colors.text,
    fontFamily: 'monospace',
  },
  previewImage: {
    width: '100%',
    height: 400,
  },
});

export default DecryptScreen;
