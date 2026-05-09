import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Clipboard,
} from 'react-native';
import Colors from '../theme/colors';
import { hapticLight } from '../utils/haptic';
import { t } from '../i18n';

const APP_VERSION = '3.7.2';
const RMAB_CONTRACT = '0x92cB10E1D503b5c41f54fCC6B576176E6f29FBAD';

const AboutScreen: React.FC = () => {
  const handleCopyContract = useCallback(() => {
    hapticLight();
    Clipboard.setString(RMAB_CONTRACT);
    Alert.alert(t('common_copied'), t('about_contract_copied'));
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
});

export default AboutScreen;
