import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import Colors from '../theme/colors';
import {
  PERMISSION_CONFIGS,
  checkPermission,
  requestPermission,
  checkAllPermissions,
} from '../utils/workspace';
import { log } from '../utils/logger';
import { hapticLight, hapticSuccess, hapticError } from '../utils/haptic';
import { t } from '../i18n';
import type { PermissionStatus } from '../types';

const STATUS_MAP: Record<PermissionStatus, string> = {
  granted: 'permission_granted',
  denied: 'permission_denied',
  blocked: 'permission_blocked',
  unavailable: 'permission_unavailable',
};

const STATUS_COLOR: Record<PermissionStatus, string> = {
  granted: Colors.success,
  denied: Colors.warning,
  blocked: Colors.error,
  unavailable: Colors.textHint,
};

const PermissionSettingsScreen: React.FC = () => {
  const [statuses, setStatuses] = useState<Record<string, PermissionStatus>>({});

  useEffect(() => {
    checkAllPermissions().then(setStatuses);
  }, []);

  const load = useCallback(async () => {
    hapticLight();
    log.touch('Permission', '刷新权限状态');
    setStatuses(await checkAllPermissions());
  }, []);

  const handleRequest = useCallback(
    async (name: string) => {
      const config = PERMISSION_CONFIGS.find((c) => c.name === name);
      if (!config) return;
      log.touch('Permission', `请求权限: ${config.title}`);
      const result = await requestPermission(config);
      log.perm('Permission', `权限结果: ${config.title} → ${result}`);
      if (result === 'blocked') {
        Alert.alert(t('permission_blocked_title'), t('permission_blocked_msg'), [
          { text: t('common_cancel') },
          {
            text: t('permission_go_settings'),
            onPress: () => Platform.OS === 'android' && Linking.openSettings(),
          },
        ]);
      } else if (result === 'granted') {
        hapticSuccess();
      } else {
        hapticError();
      }
      setStatuses(await checkAllPermissions());
    },
    [],
  );

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{t('permission_title')}</Text>

        <TouchableOpacity style={styles.refreshBtn} onPress={load}>
          <Text style={styles.refreshText}>{t('permission_refresh')}</Text>
        </TouchableOpacity>

        {PERMISSION_CONFIGS.map((config) => {
          const s = statuses[config.name] || 'denied';
          return (
            <View key={config.name} style={styles.card}>
              <View style={styles.header}>
                <Text style={styles.icon}>{config.icon}</Text>
                <View style={styles.info}>
                  <Text style={styles.permTitle}>{config.title}</Text>
                  <Text style={styles.permDesc}>{config.description}</Text>
                </View>
              </View>
              <View style={styles.footer}>
                <Text style={[styles.status, { color: STATUS_COLOR[s] || Colors.textSecondary }]}>
                  {t(STATUS_MAP[s])}
                </Text>
                {s !== 'granted' && s !== 'unavailable' && (
                  <TouchableOpacity style={styles.grantBtn} onPress={() => handleRequest(config.name)}>
                    <Text style={styles.grantText}>{t('permission_grant')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Colors.gap.lg },
  title: { fontSize: Colors.font.xl, fontWeight: '700', color: Colors.text, marginBottom: 20 },
  refreshBtn: { backgroundColor: Colors.surfaceVariant, borderRadius: Colors.radius.md, padding: 12, alignItems: 'center', marginBottom: 16 },
  refreshText: { color: Colors.text, fontSize: Colors.font.md, fontWeight: '600' },
  card: { backgroundColor: Colors.surface, borderRadius: Colors.radius.md, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  icon: { fontSize: 28, marginRight: 12 },
  info: { flex: 1 },
  permTitle: { fontSize: Colors.font.md, fontWeight: '700', color: Colors.text, marginBottom: 2 },
  permDesc: { fontSize: Colors.font.sm, color: Colors.textSecondary },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  status: { fontSize: Colors.font.sm, fontWeight: '600' },
  grantBtn: { backgroundColor: Colors.primary, borderRadius: Colors.radius.sm, paddingHorizontal: 16, paddingVertical: 6 },
  grantText: { color: Colors.buttonText, fontSize: Colors.font.sm, fontWeight: '600' },
});

export default PermissionSettingsScreen;
