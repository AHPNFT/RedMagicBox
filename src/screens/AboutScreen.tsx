import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { captureRef } from 'react-native-view-shot';
import Share from 'react-native-share';
import Colors from '../theme/colors';
import { hapticLight, hapticSuccess, hapticError } from '../utils/haptic';
import { t } from '../i18n';

const APP_VERSION = '3.9.38';
const GITHUB_RELEASE = 'https://github.com/AHPNFT/RedMagicBox/releases/latest/download/RedMagicBox.apk';

const AboutScreen: React.FC = () => {
  const posterRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);

  const handleShare = useCallback(async () => {
    hapticLight();
    setSharing(true);
    try {
      if (!posterRef.current) return;
      const uri = await captureRef(posterRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });
      await Share.open({
        title: 'RedMagicBox',
        message: t('about_share_message'),
        url: 'file://' + uri,
        type: 'image/png',
      });
      hapticSuccess();
    } catch (e: any) {
      if (e?.message !== 'User did not share') {
        hapticError();
      }
    } finally {
      setSharing(false);
    }
  }, []);

  return (
    <View style={styles.root}>
      <View ref={posterRef} collapsable={false} style={styles.posterHidden}>
        <Image
          source={require('../assets/hongmo.jpg')}
          style={styles.posterBg}
          resizeMode="cover"
        />
        <View style={styles.posterOverlay}>
          <View style={styles.posterTop}>
            <Image
              source={require('../assets/logo.png')}
              style={styles.posterLogo}
              resizeMode="contain"
            />
            <Text style={styles.posterTitle}>{t('about_share_poster_title')}</Text>
            <Text style={styles.posterSubtitle}>{t('about_share_poster_subtitle')}</Text>
            <View style={styles.posterChallenge}>
              <Text style={styles.posterChallengeTitle}>🏆 {t('activation_challenge_text')}</Text>
              <Text style={styles.posterChallengeBounty}>🔥 {t('activation_challenge_desc')}</Text>
              <Text style={styles.posterChallengeReward}>{t('activation_challenge_reward')}</Text>
              <Text style={styles.posterChallengeBounty}>{t('activation_challenge_suffix')}</Text>
            </View>
          </View>
          <View style={styles.posterBottom}>
            <View style={styles.posterQrWrap}>
              <Image
                source={require('../assets/redmagicbox_qr.png')}
                style={styles.posterQr}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.posterQrHint}>{t('about_share_poster_qr_hint')}</Text>
            <Text style={styles.posterSafe}>{t('about_share_poster_safe')}</Text>
            <Text style={styles.posterLink}>{GITHUB_RELEASE}</Text>
            <Text style={styles.posterCopyright}>© 2024-2026 RedMagicBox</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Image
          source={require('../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.appName}>{t('app_name')}</Text>
        <Text style={styles.version}>v{APP_VERSION}</Text>

        <TouchableOpacity
          style={styles.shareBtn}
          onPress={handleShare}
          activeOpacity={0.7}
          disabled={sharing}>
          {sharing ? (
            <ActivityIndicator color={Colors.buttonText} />
          ) : (
            <Text style={styles.shareBtnText}>{t('about_share_btn')}</Text>
          )}
        </TouchableOpacity>

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
  posterHidden: {
    position: 'absolute',
    left: -9999,
    top: -9999,
    width: 750,
    height: 1334,
  },
  posterBg: {
    width: 750,
    height: 1334,
    position: 'absolute',
  },
  posterOverlay: {
    flex: 1,
    backgroundColor: 'rgba(8,8,16,0.55)',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 160,
    paddingBottom: 100,
  },
  posterTop: {
    alignItems: 'center',
  },
  posterLogo: {
    width: 88,
    height: 88,
    marginBottom: 28,
  },
  posterTitle: {
    fontSize: 42,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -1,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  posterSubtitle: {
    fontSize: 22,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    fontWeight: '500',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  posterChallenge: {
    marginTop: 32,
    backgroundColor: 'rgba(230,57,70,0.15)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(230,57,70,0.4)',
    alignItems: 'center',
  },
  posterChallengeTitle: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
  },
  posterChallengeBounty: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 22,
  },
  posterChallengeReward: {
    fontSize: 28,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '900',
    textAlign: 'center',
    marginVertical: 6,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  posterBottom: {
    alignItems: 'center',
  },
  posterQrWrap: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
  },
  posterQr: {
    width: 200,
    height: 200,
    borderRadius: 8,
  },
  posterQrHint: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
    marginBottom: 10,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  posterSafe: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
    marginBottom: 10,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  posterLink: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    paddingHorizontal: 40,
    marginBottom: 16,
  },
  posterCopyright: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  content: { padding: Colors.gap.lg },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: Colors.radius.md,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginBottom: 20,
    shadowColor: 'rgba(230,57,70,0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 6,
  },
  shareBtnText: {
    color: Colors.buttonText,
    fontSize: Colors.font.lg,
    fontWeight: '700',
  },
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
});

export default AboutScreen;
