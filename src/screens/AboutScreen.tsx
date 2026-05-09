import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Clipboard,
} from 'react-native';
import Colors from '../theme/colors';
import { log } from '../utils/logger';
import { hapticSuccess, hapticError, hapticLight } from '../utils/haptic';
import { t } from '../i18n';

const APP_VERSION = '3.7.1';
const RMAB_CONTRACT = '0x92cB10E1D503b5c41f54fCC6B576176E6f29FBAD';

interface ShareModule {
  open: (opts: any) => Promise<any>;
}

let RNShare: ShareModule | null = null;
try {
  const m = require('react-native-share');
  RNShare = m.default || m;
} catch {}

interface RNFSModule {
  DocumentDirectoryPath: string;
  exists: (p: string) => Promise<boolean>;
  readDir: (p: string) => Promise<Array<{ name: string; path: string; isFile: () => boolean }>>;
  readFile: (p: string, e?: string) => Promise<string>;
  writeFile: (p: string, c: string, e?: string) => Promise<void>;
  CachesDirectoryPath: string;
  unlink: (p: string) => Promise<void>;
}

let RNFS: RNFSModule | null = null;
try {
  RNFS = require('react-native-fs') as RNFSModule;
} catch {}

const AboutScreen: React.FC = () => {
  const [exporting, setExporting] = useState(false);

  const handleExportLog = useCallback(async () => {
    hapticLight();
    log.touch('About', '点击导出日志');

    if (!RNFS || !RNShare) {
      Alert.alert(t('common_error'), t('about_log_unavailable'));
      return;
    }

    setExporting(true);
    try {
      const logDir = `${RNFS.DocumentDirectoryPath}/hongmo_logs`;
      if (!(await RNFS.exists(logDir))) {
        Alert.alert(t('common_tip'), t('about_no_logs'));
        setExporting(false);
        return;
      }

      const entries = await RNFS.readDir(logDir);
      const logFiles = entries.filter((e) => e.isFile() && e.name.endsWith('.log'));

      if (logFiles.length === 0) {
        Alert.alert(t('common_tip'), t('about_no_logs'));
        setExporting(false);
        return;
      }

      let allContent = t('about_log_header')
        .replace('{version}', APP_VERSION)
        .replace('{time}', new Date().toLocaleString())
        .replace('{separator}', '='.repeat(50));

      for (const f of logFiles) {
        try {
          const content = await RNFS.readFile(f.path, 'utf8');
          allContent += `\n--- ${f.name} ---\n${content}\n`;
        } catch {}
      }

      const exportPath = `${RNFS.CachesDirectoryPath}/hongmo_log_export_${Date.now()}.txt`;
      await RNFS.writeFile(exportPath, allContent, 'utf8');

      await RNShare.open({
        title: t('about_log_export_title'),
        message: t('about_log_export_msg'),
        url: `file://${exportPath}`,
        filename: `hongmo_log_${Date.now()}.txt`,
        type: 'text/plain',
        failOnCancel: false,
      });

      hapticSuccess();
      log.info('About', '日志导出分享成功');

      try { await RNFS.unlink(exportPath); } catch {}
    } catch (e: any) {
      if (e.message?.includes('cancel') || e.message?.includes('CANCELLED')) {
        setExporting(false);
        return;
      }
      hapticError();
      log.error('About', `日志导出失败: ${e.message || '未知错误'}`);
      Alert.alert(t('about_log_export_fail'), e.message || t('decrypt_err_unknown'));
    } finally {
      setExporting(false);
    }
  }, []);

  const handleCopyContract = useCallback(() => {
    hapticLight();
    Clipboard.setString(RMAB_CONTRACT);
    Alert.alert(t('common_copied'), t('about_contract_copied'));
    log.info('About', '复制合约地址');
  }, []);

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <Image
          source={require('../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.appName}>{t('app_name')}</Text>
        <Text style={styles.version}>v{APP_VERSION}</Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('about_app_desc1').split('。')[0]}</Text>
          <Text style={styles.bodyText}>
            {t('about_app_desc1')}
          </Text>
          <Text style={styles.bodyText}>
            {t('about_app_desc2')}
          </Text>
          <Text style={styles.bodyText}>
            {t('about_app_desc3')}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('about_security_title')}</Text>
          <InfoRow label={t('about_security_algo')} value="AES-256-CBC" />
          <InfoRow label={t('about_security_kdf')} value="PBKDF2-SHA256 100K" />
          <InfoRow label={t('about_security_hmac')} value="HMAC-SHA256" />
          <InfoRow label={t('about_security_obfuscation')} value="Native Layer" />
          <InfoRow label={t('about_security_keystore')} value="Android Keystore" />
          <InfoRow label={t('about_security_engine')} value="C++ Native SO" />
          <InfoRow label={t('about_security_screenshot')} value="FLAG_SECURE" />
          <InfoRow label={t('about_security_root')} value="Enabled" />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('about_super_title')}</Text>
          <Text style={styles.bodyText}>
            {t('about_super_desc')}
          </Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>{t('about_super_price_label')}</Text>
            <Text style={styles.priceValue}>{t('about_super_price_value')}</Text>
          </View>
        </View>

        <View style={[styles.card, styles.contractCard]}>
          <Text style={styles.sectionTitle}>{t('about_contract_title')}</Text>
          <Text style={styles.contractAddr}>{RMAB_CONTRACT}</Text>
          <TouchableOpacity
            style={styles.copyBtn}
            onPress={handleCopyContract}
            activeOpacity={0.7}>
            <Text style={styles.copyBtnText}>{t('about_contract_copy')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('about_disclaimer_title')}</Text>
          <Text style={styles.bodyText}>
            {t('about_disclaimer_text')}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.logBtn}
          onPress={handleExportLog}
          disabled={exporting}>
          {exporting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.logBtnText}>{t('about_export_log')}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const InfoRow: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Colors.gap.lg },
  logo: {
    width: 80,
    height: 80,
    alignSelf: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  appName: {
    fontSize: Colors.font.xxl,
    fontWeight: '900',
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: 4,
  },
  version: {
    fontSize: Colors.font.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Colors.radius.md,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  contractCard: {
    borderColor: Colors.primary,
    borderWidth: 1.5,
  },
  sectionTitle: {
    fontSize: Colors.font.lg,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 10,
  },
  bodyText: {
    fontSize: Colors.font.sm,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  infoLabel: {
    fontSize: Colors.font.md,
    color: Colors.textSecondary,
  },
  infoValue: {
    fontSize: Colors.font.md,
    color: Colors.text,
    fontWeight: '600',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  priceLabel: {
    fontSize: Colors.font.md,
    color: Colors.textSecondary,
  },
  priceValue: {
    fontSize: Colors.font.md,
    color: Colors.primary,
    fontWeight: '700',
  },
  contractAddr: {
    fontSize: Colors.font.xs,
    color: Colors.text,
    fontFamily: 'monospace',
    marginBottom: 10,
    lineHeight: 18,
  },
  copyBtn: {
    backgroundColor: Colors.surfaceVariant,
    borderRadius: Colors.radius.sm,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  copyBtnText: {
    fontSize: Colors.font.sm,
    color: Colors.primary,
    fontWeight: '600',
  },
  logBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Colors.radius.md,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  logBtnText: {
    color: Colors.buttonText,
    fontSize: Colors.font.lg,
    fontWeight: '700',
  },
});

export default AboutScreen;
