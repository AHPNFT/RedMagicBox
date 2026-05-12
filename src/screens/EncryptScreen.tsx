import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Colors from '../theme/colors';
import NetworkWarning from '../components/NetworkWarning';
import { pickFile, readFileAsBase64 } from '../utils/file';
import { encryptFile } from '../utils/crypto';
import type { EncryptMeta } from '../utils/crypto';
import { saveEncryptFile } from '../utils/workspace';
import { getSession, getSessionPassword } from '../utils/user';
import { canEncrypt, incrementEncryptCount, getRemainingEncrypts, getActivationState, getActivationCode } from '../utils/activationState';
import { FREE_ENCRYPT_LIMIT } from '../utils/activation';
import { hapticSuccess, hapticError, hapticLight } from '../utils/haptic';
import { log } from '../utils/logger';
import { t } from '../i18n';
import type { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Encrypt'>;

const EncryptScreen: React.FC<Props> = ({ navigation }) => {
  const [mode, setMode] = useState<'file' | 'text'>('file');
  const [file, setFile] = useState<{
    uri: string;
    name: string;
    size: number;
    type: string;
  } | null>(null);
  const [textInput, setTextInput] = useState('');
  const [customFileName, setCustomFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [username, setUsername] = useState('');
  const [rawUsername, setRawUsername] = useState('');
  const [remaining, setRemaining] = useState(-1);

  useEffect(() => {
    getSession().then((s) => {
      if (s) {
        setRawUsername(s);
        setUsername(s.charAt(0) + '***' + s.slice(-1));
      }
    });
    getRemainingEncrypts().then(setRemaining);
  }, []);

  const handlePickFile = useCallback(async () => {
    log.touch('Encrypt', 'tap pick file');
    const f = await pickFile();
    if (f) {
      log.file('Encrypt', `selected: ${f.name} | ${(f.size / 1024).toFixed(1)}KB`);
      setFile({ uri: f.uri, name: f.name, size: f.size, type: f.type });
      if (!customFileName) {
        setCustomFileName(f.name.replace(/\.[^.]+$/, ''));
      }
      setResult(null);
    }
  }, [customFileName]);

  const [confirmPwd, setConfirmPwd] = useState('');
  const [showPwdModal, setShowPwdModal] = useState(false);

  const handleEncrypt = useCallback(async () => {
    if (!username) {
      Alert.alert(t('common_tip'), t('encrypt_need_login'));
      return;
    }
    if (mode === 'file' && !file) {
      Alert.alert(t('common_tip'), t('encrypt_need_file'));
      return;
    }
    if (mode === 'text' && !textInput.trim()) {
      Alert.alert(t('common_tip'), t('encrypt_need_text'));
      return;
    }
    if (!customFileName.trim()) {
      Alert.alert(t('common_tip'), t('encrypt_need_filename'));
      return;
    }
    const allowed = await canEncrypt();
    if (!allowed) {
      Alert.alert(
        t('encrypt_limit_reached_title'),
        t('encrypt_limit_reached_msg').replace('{limit}', String(FREE_ENCRYPT_LIMIT)),
        [
          { text: t('common_cancel'), style: 'cancel' },
          {
            text: t('encrypt_go_activate'),
            onPress: () => navigation.navigate('Activation'),
          },
        ],
      );
      return;
    }
    setShowPwdModal(true);
  }, [mode, file, textInput, customFileName, username]);

  const doEncrypt = useCallback(async () => {
    if (!confirmPwd.trim()) {
      Alert.alert(t('common_tip'), t('encrypt_need_login'));
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

    hapticLight();
    setLoading(true);
    log.crypto('Encrypt', `start | mode: ${mode} | name: ${customFileName.trim()}.red`);

    try {
      let base64: string;
      let tmpTxtPath: string | null = null;
      if (mode === 'file') {
        base64 = await readFileAsBase64(file!.uri);
      } else {
        const RNFS = require('react-native-fs');
        tmpTxtPath = `${RNFS.CachesDirectoryPath}/${customFileName.trim()}_${Date.now()}.txt`;
        await RNFS.writeFile(tmpTxtPath, textInput, 'utf8');
        base64 = await readFileAsBase64('file://' + tmpTxtPath);
      }

      const finalFileName = customFileName.trim();
      const meta: EncryptMeta = {};
      if (mode === 'file' && file) {
        meta.op = file.uri;
        meta.fn = file.name;
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        if (ext) meta.ex = ext;
        if (file.type) meta.mt = file.type;
      } else {
        meta.op = tmpTxtPath ? 'file://' + tmpTxtPath : undefined;
        meta.ex = 'txt';
        meta.mt = 'text/plain';
        meta.fn = finalFileName + '.txt';
      }
      const encrypted = await encryptFile(
        base64,
        loginPwd,
        rawUsername,
        finalFileName,
        meta,
        (await getActivationState()).activated,
        (await getActivationCode()) ?? undefined,
      );
      await saveEncryptFile(encrypted, finalFileName + '.red');

      if (tmpTxtPath) {
        try {
          const RNFS = require('react-native-fs');
          await RNFS.unlink(tmpTxtPath);
        } catch {}
      }

      setResult({ success: true, message: t('encrypt_result_success') });
      hapticSuccess();
      await incrementEncryptCount();
      getRemainingEncrypts().then(setRemaining);
      log.crypto('Encrypt', `success: ${finalFileName}.red`);

      if (mode === 'file' && file) {
        Alert.alert(
          t('encrypt_delete_source_title'),
          t('encrypt_delete_source_msg').replace('{name}', finalFileName),
          [
            { text: t('common_keep'), style: 'cancel' },
            {
              text: t('common_delete'),
              style: 'destructive',
              onPress: async () => {
                try {
                  const RNFS = require('react-native-fs');
                  const path = decodeURIComponent(
                    file.uri.replace(/^(file:\/\/|content:\/\/)/, ''),
                  );
                  await RNFS.unlink(path);
                  Alert.alert(t('common_tip'), t('encrypt_source_deleted'));
                } catch (e: any) {
                  Alert.alert(t('common_tip'), t('encrypt_source_delete_fail') + e.message);
                }
              },
            },
          ],
        );
      }

      setFile(null);
      setTextInput('');
      setCustomFileName('');
    } catch (e: any) {
      const errMap: Record<string, string> = {
        DECRYPT_ERR_CIPHER_FORMAT: t('encrypt_err_cipher_format'),
        DECRYPT_ERR_TAMPERED: t('encrypt_err_tampered'),
        DECRYPT_ERR_USER_MISMATCH: t('encrypt_err_user_mismatch'),
        DECRYPT_ERR_HMAC: t('encrypt_err_hmac'),
        DECRYPT_ERR_FAILED: t('encrypt_err_failed'),
        DECRYPT_ERR_NEED_ACTIVATE: t('encrypt_err_need_activate'),
      };
      const msg = errMap[e.message] || e.message || t('login_err_unknown');
      setResult({ success: false, message: msg });
      hapticError();
      log.error('Encrypt', `failed: ${msg}`);
      Alert.alert(t('encrypt_result_fail'), msg);
    } finally {
      setLoading(false);
      setConfirmPwd('');
    }
  }, [mode, file, textInput, customFileName, rawUsername, confirmPwd]);

  return (
    <View style={styles.root}>
      <NetworkWarning />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}>
        <View style={styles.userBadge}>
          <Text style={styles.userBadgeText}>
            {t('encrypt_current_redid').replace('{username}', username)}
          </Text>
          {remaining >= 0 && (
            <Text style={styles.remainingText}>
              {t('encrypt_remaining')
                .replace('{remaining}', String(remaining))
                .replace('{limit}', String(FREE_ENCRYPT_LIMIT))}
            </Text>
          )}
        </View>

        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[
              styles.modeBtn,
              mode === 'file' && styles.modeBtnActive,
            ]}
            onPress={() => {
              setMode('file');
              setResult(null);
              log.touch('Encrypt', 'switch: file');
            }}>
            <Text
              style={[
                styles.modeBtnText,
                mode === 'file' && styles.modeBtnTextActive,
              ]}>
              {t('encrypt_file_mode')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.modeBtn,
              mode === 'text' && styles.modeBtnActive,
            ]}
            onPress={() => {
              setMode('text');
              setResult(null);
              log.touch('Encrypt', 'switch: text');
            }}>
            <Text
              style={[
                styles.modeBtnText,
                mode === 'text' && styles.modeBtnTextActive,
              ]}>
              {t('encrypt_text_mode')}
            </Text>
          </TouchableOpacity>
        </View>

        {mode === 'file' ? (
          <TouchableOpacity
            style={styles.pickBtn}
            onPress={handlePickFile}>
            <Text style={styles.pickText}>
              {file ? file.name : t('encrypt_pick_file')}
            </Text>
            {file && (
              <Text style={styles.pickSize}>
                {(file.size / 1024).toFixed(1)} KB
              </Text>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.textCard}>
            <Text style={styles.label}>{t('encrypt_text_label')}</Text>
            <TextInput
              style={styles.textArea}
              value={textInput}
              onChangeText={setTextInput}
              placeholder={t('encrypt_text_placeholder')}
              placeholderTextColor={Colors.textHint}
              multiline
              textAlignVertical="top"
            />
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.label}>
            {t('encrypt_filename_label')}
          </Text>
          <TextInput
            style={styles.input}
            value={customFileName}
            onChangeText={setCustomFileName}
            placeholder={t('encrypt_filename_placeholder')}
            placeholderTextColor={Colors.textHint}
          />
          {customFileName ? (
            <Text style={styles.preview}>
              {t('encrypt_filename_preview').replace('{name}', customFileName)}
            </Text>
          ) : null}
        </View>

        <TouchableOpacity
          style={[
            styles.encryptBtn,
            loading && styles.encryptBtnDisabled,
          ]}
          onPress={handleEncrypt}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.encryptBtnText}>
              {t('encrypt_btn')}
            </Text>
          )}
        </TouchableOpacity>

        {result && (
          <View
            style={[
              styles.resultCard,
              {
                borderColor: result.success
                  ? Colors.success
                  : Colors.error,
              },
            ]}>
            <Text style={styles.resultTitle}>
              {result.success ? t('encrypt_result_success') : t('encrypt_result_fail')}
            </Text>
            <Text style={styles.resultText}>{result.message}</Text>
          </View>
        )}
      </ScrollView>

      {showPwdModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('encrypt_pwd_modal_title')}</Text>
            <Text style={styles.modalDesc}>{t('encrypt_pwd_modal_desc')}</Text>
            <TextInput
              style={styles.modalInput}
              value={confirmPwd}
              onChangeText={setConfirmPwd}
              placeholder={t('encrypt_pwd_placeholder')}
              placeholderTextColor={Colors.textHint}
              secureTextEntry
              autoFocus
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => { setShowPwdModal(false); setConfirmPwd(''); }}>
                <Text style={styles.modalCancelText}>{t('common_cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={doEncrypt}>
                <Text style={styles.modalConfirmText}>{t('encrypt_pwd_confirm')}</Text>
              </TouchableOpacity>
            </View>
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
  userBadge: {
    backgroundColor: Colors.surface,
    borderRadius: Colors.radius.sm,
    padding: 10,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  userBadgeText: {
    fontSize: Colors.font.sm,
    color: Colors.primary,
    fontWeight: '600',
  },
  remainingText: {
    fontSize: Colors.font.xs,
    color: Colors.warning,
    fontWeight: '600',
    marginTop: 4,
  },
  modeRow: { flexDirection: 'row', marginBottom: 20, gap: 12 },
  modeBtn: {
    flex: 1,
    backgroundColor: Colors.surfaceVariant,
    borderRadius: Colors.radius.md,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modeBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  modeBtnText: {
    fontSize: Colors.font.md,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  modeBtnTextActive: { color: Colors.buttonText },
  pickBtn: {
    backgroundColor: Colors.surface,
    borderRadius: Colors.radius.lg,
    padding: 32,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    marginBottom: 20,
  },
  pickText: {
    fontSize: Colors.font.md,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  pickSize: {
    fontSize: Colors.font.sm,
    color: Colors.textHint,
    marginTop: 4,
  },
  textCard: {
    backgroundColor: Colors.surface,
    borderRadius: Colors.radius.md,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textArea: {
    backgroundColor: Colors.surfaceVariant,
    borderRadius: Colors.radius.sm,
    padding: 12,
    fontSize: Colors.font.md,
    color: Colors.text,
    minHeight: 150,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Colors.radius.md,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  label: {
    fontSize: Colors.font.sm,
    color: Colors.textSecondary,
    marginBottom: 6,
    fontWeight: '600',
  },
  input: {
    backgroundColor: Colors.surfaceVariant,
    borderRadius: Colors.radius.sm,
    padding: 12,
    fontSize: Colors.font.md,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  preview: {
    fontSize: Colors.font.sm,
    color: Colors.primary,
    marginTop: 8,
  },
  encryptBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Colors.radius.md,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  encryptBtnDisabled: { opacity: 0.5 },
  encryptBtnText: {
    color: Colors.buttonText,
    fontSize: Colors.font.lg,
    fontWeight: '700',
  },
  resultCard: {
    backgroundColor: Colors.surface,
    borderRadius: Colors.radius.md,
    padding: 18,
    borderWidth: 1,
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
});

export default EncryptScreen;
