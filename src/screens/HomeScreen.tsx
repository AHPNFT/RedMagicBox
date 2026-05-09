import React, { useState, useCallback, useEffect } from 'react';
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
import NetworkWarning from '../components/NetworkWarning';
import { checkNetworkStatus, monitorNetwork } from '../utils/network';
import { initWorkspace, formatFileSize } from '../utils/workspace';
import { getSession, clearSession } from '../utils/user';
import { getActivationState } from '../utils/activationState';
import { log } from '../utils/logger';
import { hapticLight } from '../utils/haptic';
import { t, getLang, setLang, LANG_OPTIONS } from '../i18n';
import type { RootStackParamList, WorkspaceStatus } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'> & { rooted: boolean };

const HomeScreen: React.FC<Props> = ({ navigation, rooted }) => {
  const [online, setOnline] = useState(false);
  const [ws, setWs] = useState<WorkspaceStatus | null>(null);
  const [username, setUsername] = useState('');
  const [activated, setActivated] = useState(false);
  const [currentLang, setCurrentLang] = useState(getLang());

  useEffect(() => {
    checkNetworkStatus().then((s) => setOnline(s === 'online'));
    const unsub = monitorNetwork((s) => setOnline(s === 'online'));
    getSession().then((s) => {
      if (s) setUsername(s.charAt(0) + '***' + s.slice(-1));
    });
    getActivationState().then((s) => setActivated(s.activated));
    return unsub;
  }, []);

  useFocusEffect(
    useCallback(() => {
      checkNetworkStatus().then((s) => setOnline(s === 'online'));
      initWorkspace().then(setWs);
    }, []),
  );

  const FEATURES = [
    {
      title: t('home_feature_encrypt_title'),
      desc: t('home_feature_encrypt_desc'),
      icon: '🔒',
      route: 'Encrypt' as const,
      needsOffline: true,
    },
    {
      title: t('home_feature_decrypt_title'),
      desc: t('home_feature_decrypt_desc'),
      icon: '🔓',
      route: 'Decrypt' as const,
      needsOffline: true,
    },
    {
      title: t('home_feature_filelist_title'),
      desc: t('home_feature_filelist_desc'),
      icon: '📁',
      route: 'FileList' as const,
      needsOffline: false,
    },
    {
      title: t('home_feature_share_title'),
      desc: t('home_feature_share_desc'),
      icon: '📤',
      route: 'Share' as const,
      needsOffline: true,
    },
  ];

  const handleFeature = useCallback(
    (feat: (typeof FEATURES)[0]) => {
      hapticLight();
      log.touch('Home', `tap feature: ${feat.title}`);
      if (feat.needsOffline && online) {
        Alert.alert(
          t('home_network_warning_title'),
          t('home_network_warning_msg'),
          [
            { text: t('common_cancel'), style: 'cancel' },
            {
              text: t('home_network_warning_continue'),
              onPress: () => navigation.navigate(feat.route as any),
            },
          ],
        );
        return;
      }
      navigation.navigate(feat.route as any);
    },
    [online, navigation],
  );

  const handleLogout = useCallback(() => {
    log.touch('Home', 'tap logout');
    Alert.alert(t('home_logout_title'), t('home_logout_msg'), [
      { text: t('common_cancel'), style: 'cancel' },
      {
        text: t('common_confirm'),
        onPress: async () => {
          await clearSession();
          log.info('Home', 'user logged out');
          navigation.replace('Login');
        },
      },
    ]);
  }, [navigation]);

  const handleLangSwitch = useCallback(() => {
    hapticLight();
    const current = getLang();
    const buttons: { text: string; onPress?: () => void; style?: 'cancel' | 'default' | 'destructive' }[] = LANG_OPTIONS.map((opt) => ({
      text: `${opt.flag} ${opt.label}`,
      onPress: async () => {
        if (opt.code !== current) {
          await setLang(opt.code);
          setCurrentLang(opt.code);
          Alert.alert(t('lang_title'), t('lang_changed'));
        }
      },
    }));
    buttons.push({ text: t('common_cancel'), style: 'cancel' });
    Alert.alert(t('lang_title'), `${t('lang_current')}: ${LANG_OPTIONS.find((o) => o.code === current)?.flag} ${LANG_OPTIONS.find((o) => o.code === current)?.label}`, buttons);
  }, [currentLang]);

  return (
    <View style={styles.root}>
      {rooted && (
        <View style={styles.rootWarning}>
          <Text style={styles.rootWarningText}>{t('home_root_warning')}</Text>
        </View>
      )}
      <NetworkWarning />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('app_name')}</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.langBtn}
            onPress={handleLangSwitch}>
            <Text style={styles.langBtnText}>🌐</Text>
          </TouchableOpacity>
          {username ? (
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={handleLogout}>
              <Text style={styles.headerBtnText}>{t('home_logout')}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => navigation.navigate('Login')}>
              <Text style={styles.headerBtnText}>{t('home_login')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}>
        {username && (
          <Text style={styles.userBadge}>
            {t('home_current_user')}{username}
          </Text>
        )}
        <Text style={styles.heroSub}>
          {t('home_hero_sub')}
        </Text>
        {ws && (
          <Text style={styles.wsInfo}>
            {t('home_ws_info')
              .replace('{count}', String(ws.fileCount))
              .replace('{size}', formatFileSize(ws.usedSpace))}
          </Text>
        )}
        <View style={styles.grid}>
          {FEATURES.map((feat) => {
            const locked = feat.needsOffline && online;
            return (
              <TouchableOpacity
                key={feat.route}
                style={[styles.card, locked && styles.cardLocked]}
                onPress={() => handleFeature(feat)}
                activeOpacity={0.7}>
                <Text style={styles.cardIcon}>{feat.icon}</Text>
                <Text
                  style={[
                    styles.cardTitle,
                    locked && styles.cardTitleLocked,
                  ]}>
                  {feat.title}
                </Text>
                <Text style={styles.cardDesc}>{feat.desc}</Text>
                {locked && (
                  <Text style={styles.lockedText}>{t('home_network_lock_warning')}</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
      <View style={styles.bottomRow}>
        <TouchableOpacity
          style={styles.bottomBtn}
          onPress={() => {
            log.touch('Home', 'tap workspace');
            navigation.navigate('WorkspaceSettings');
          }}>
          <Text style={styles.bottomBtnText}>{t('home_bottom_workspace')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.bottomBtn}
          onPress={() => {
            log.touch('Home', 'tap permission');
            navigation.navigate('PermissionSettings');
          }}>
          <Text style={styles.bottomBtnText}>{t('home_bottom_permission')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.bottomBtn}
          onPress={() => {
            log.touch('Home', 'tap activation');
            navigation.navigate('Activation');
          }}>
          <Text style={[styles.bottomBtnText, activated && styles.activatedText]}>
            {activated ? t('home_bottom_activated') : t('home_bottom_activate')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.bottomBtn}
          onPress={() => {
            log.touch('Home', 'tap about');
            navigation.navigate('About');
          }}>
          <Text style={styles.bottomBtnText}>{t('home_bottom_about')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  rootWarning: {
    backgroundColor: Colors.error,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  rootWarningText: {
    color: '#FFF',
    fontSize: Colors.font.sm,
    fontWeight: '700',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Colors.gap.lg,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: Colors.font.lg,
    fontWeight: '900',
    color: Colors.primary,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  langBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langBtnText: { fontSize: 20 },
  headerBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Colors.radius.sm,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  headerBtnText: {
    color: Colors.buttonText,
    fontSize: Colors.font.sm,
    fontWeight: '700',
  },
  scroll: { flex: 1 },
  content: { padding: Colors.gap.lg, paddingBottom: 80 },
  userBadge: {
    fontSize: Colors.font.sm,
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: 4,
    backgroundColor: Colors.surface,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  heroSub: {
    fontSize: Colors.font.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  wsInfo: {
    fontSize: Colors.font.sm,
    color: Colors.textHint,
    textAlign: 'center',
    marginBottom: 20,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    width: '47%',
    backgroundColor: Colors.surface,
    borderRadius: Colors.radius.lg,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardLocked: { borderColor: Colors.warning, opacity: 0.8 },
  cardIcon: { fontSize: 36, marginBottom: 8 },
  cardTitle: {
    fontSize: Colors.font.lg,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  cardTitleLocked: { color: Colors.warning },
  cardDesc: {
    fontSize: Colors.font.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  lockedText: {
    fontSize: Colors.font.xs,
    color: Colors.warning,
    marginTop: 4,
    fontWeight: '600',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  bottomBtn: { paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center' },
  bottomBtnText: {
    color: Colors.textSecondary,
    fontSize: Colors.font.sm,
    fontWeight: '600',
  },
  activatedText: {
    color: Colors.success,
  },
});

export default HomeScreen;
