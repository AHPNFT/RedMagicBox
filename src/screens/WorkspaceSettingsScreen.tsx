import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Colors from '../theme/colors';
import {
  getWorkspaceStatus,
  initWorkspace,
  formatFileSize,
} from '../utils/workspace';
import { log } from '../utils/logger';
import { hapticLight } from '../utils/haptic';
import { t } from '../i18n';
import type { RootStackParamList, WorkspaceStatus } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'WorkspaceSettings'>;

const WorkspaceSettingsScreen: React.FC<Props> = ({ navigation }) => {
  const [ws, setWs] = useState<WorkspaceStatus | null>(null);

  useFocusEffect(
    useCallback(() => {
      getWorkspaceStatus().then(setWs);
    }, []),
  );

  const handleInit = useCallback(async () => {
    log.touch('Workspace', '点击初始化工作区');
    const status = await initWorkspace();
    setWs(status);
    log.info('Workspace', `工作区初始化: ${status.initialized ? '成功' : '失败'}`);
    Alert.alert(
      status.initialized ? t('common_success') : t('common_fail'),
      status.initialized ? t('workspace_init_success') : t('workspace_init_fail'),
    );
  }, []);

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{t('workspace_title')}</Text>

        <View style={styles.card}>
          <InfoRow label={t('workspace_status')} value={ws?.initialized ? t('workspace_initialized') : t('workspace_not_initialized')} />
          <InfoRow label={t('workspace_path')} value={ws?.path || '-'} />
          <InfoRow label={t('workspace_encrypted_files')} value={t('workspace_file_count').replace('{count}', String(ws?.fileCount ?? 0))} />
          <InfoRow label={t('workspace_used_space')} value={formatFileSize(ws?.usedSpace ?? 0)} />
        </View>

        <TouchableOpacity
          style={styles.fileBtn}
          onPress={() => {
            hapticLight();
            log.touch('Workspace', '点击进入文件管理');
            navigation.navigate('FileList');
          }}>
          <Text style={styles.fileBtnText}>{t('workspace_enter_filemgr')}</Text>
        </TouchableOpacity>

        {!ws?.initialized && (
          <TouchableOpacity style={styles.btn} onPress={handleInit}>
            <Text style={styles.btnText}>{t('workspace_init_btn')}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Colors.gap.lg },
  title: { fontSize: Colors.font.xl, fontWeight: '700', color: Colors.text, marginBottom: 20 },
  card: { backgroundColor: Colors.surface, borderRadius: Colors.radius.md, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: Colors.border },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  rowLabel: { fontSize: Colors.font.md, color: Colors.textSecondary },
  rowValue: { fontSize: Colors.font.md, color: Colors.text, fontWeight: '600' },
  fileBtn: {
    backgroundColor: Colors.surface,
    borderRadius: Colors.radius.md,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  fileBtnText: {
    color: Colors.primary,
    fontSize: Colors.font.lg,
    fontWeight: '700',
  },
  btn: { backgroundColor: Colors.primary, borderRadius: Colors.radius.md, padding: 16, alignItems: 'center' },
  btnText: { color: Colors.buttonText, fontSize: Colors.font.lg, fontWeight: '700' },
});

export default WorkspaceSettingsScreen;
