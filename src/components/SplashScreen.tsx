import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ImageBackground } from 'react-native';
import { checkRoot } from '../utils/rootDetection';
import { t } from '../i18n';

const SPLASH_IMG = require('../assets/hongmo.jpg');
const APP_VERSION = '3.9.38';

interface SplashScreenProps {
  onFinish: (rooted: boolean) => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [rooted, setRooted] = useState(false);
  const [fadeAnim, setFadeAnim] = useState(0);

  useEffect(() => {
    const timer = async () => {
      const isRooted = await checkRoot();
      setRooted(isRooted);
      setFadeAnim(1);

      setTimeout(() => {
        onFinish(isRooted);
      }, 2500);
    };

    timer();
  }, []);

  return (
    <ImageBackground source={SPLASH_IMG} resizeMode="cover" style={styles.container}>
      <View style={styles.overlay} />
      <View style={styles.content}>
        <Text style={[styles.title, { opacity: fadeAnim }]}>
          {t('splash_title')}
        </Text>
        {t('splash_title_en') ? (
          <Text style={[styles.titleEn, { opacity: fadeAnim }]}>
            {t('splash_title_en')}
          </Text>
        ) : null}
        <Text style={[styles.subtitle, { opacity: fadeAnim }]}>
          {t('splash_subtitle')}
        </Text>
        {t('splash_subtitle_en') ? (
          <Text style={[styles.subtitleEn, { opacity: fadeAnim }]}>
            {t('splash_subtitle_en')}
          </Text>
        ) : null}
        {rooted && (
          <View style={styles.rootBadge}>
            <Text style={styles.rootBadgeText}>{t('splash_root_warning')}</Text>
          </View>
        )}
      </View>
      <View style={styles.footer}>
        <Text style={[styles.footerText, { opacity: fadeAnim }]}>
          {t('splash_footer')}
        </Text>
        {t('splash_footer_en') ? (
          <Text style={[styles.footerEnText, { opacity: fadeAnim }]}>
            {t('splash_footer_en')}
          </Text>
        ) : null}
        <Text style={[styles.versionText, { opacity: fadeAnim }]}>
          v{APP_VERSION}
        </Text>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: 2,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  titleEn: {
    fontSize: 14,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 28,
    letterSpacing: 1,
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  subtitleEn: {
    fontSize: 12,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  rootBadge: {
    marginTop: 30,
    backgroundColor: 'rgba(255,59,48,0.3)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.6)',
  },
  rootBadgeText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    marginBottom: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  footerEnText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 0.5,
    marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  versionText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 12,
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});

export default SplashScreen;
