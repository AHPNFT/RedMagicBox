import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Colors from '../theme/colors';
import { hapticLight, hapticSuccess, hapticError } from '../utils/haptic';
import { saveUser, verifyUser, setSession } from '../utils/user';
import { checkPasswordStrength } from '../utils/crypto';
import { log } from '../utils/logger';
import { t } from '../i18n';
import type { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const getStrengthInfo = (pwd: string) => {
    const strength = checkPasswordStrength(pwd);
    switch (strength) {
      case 'weak':
        return { label: t('login_strength_weak'), color: Colors.error, bg: Colors.errorBg };
      case 'medium':
        return { label: t('login_strength_medium'), color: Colors.warning, bg: Colors.warningBg };
      case 'strong':
        return { label: t('login_strength_strong'), color: Colors.success, bg: Colors.successBg };
      default:
        return {
          label: '',
          color: Colors.textHint,
          bg: Colors.surfaceVariant,
        };
    }
  };

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) return t('login_err_min_length');
    if (!/[a-z]/.test(pwd)) return t('login_err_need_lowercase');
    if (!/[A-Z]/.test(pwd)) return t('login_err_need_uppercase');
    if (!/\d/.test(pwd)) return t('login_err_need_digit');
    return null;
  };

  const handleLogin = useCallback(async () => {
    hapticLight();
    log.touch('Login', `tap login | user: ${username.trim() || '(empty)'}`);
    if (!username.trim()) {
      Alert.alert(t('common_tip'), t('login_err_empty_username'));
      return;
    }
    if (password.length < 8) {
      Alert.alert(t('common_tip'), t('login_err_short_password'));
      return;
    }
    const success = await verifyUser(username.trim(), password);
    if (success) {
      await setSession(username.trim(), password);
      hapticSuccess();
      log.info('Login', `login success: ${username.trim()}`);
      navigation.replace('Home');
    } else {
      hapticError();
      log.warn('Login', `login failed: ${username.trim()}`);
      Alert.alert(t('login_err_login_failed'), t('login_err_wrong_credentials'));
    }
  }, [username, password, navigation]);

  const handleRegister = useCallback(async () => {
    hapticLight();
    log.touch('Login', `tap register | user: ${username.trim() || '(empty)'}`);
    if (!username.trim()) {
      Alert.alert(t('common_tip'), t('login_err_empty_username'));
      return;
    }
    const pwdError = validatePassword(password);
    if (pwdError) {
      Alert.alert(t('login_err_weak_password'), pwdError);
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert(t('common_tip'), t('login_err_password_mismatch'));
      return;
    }
    try {
      await saveUser(username.trim(), password);
      await setSession(username.trim(), password);
      hapticSuccess();
      log.info('Login', `register success: ${username.trim()}`);
      navigation.replace('Home');
    } catch (e: any) {
      hapticError();
      log.error('Login', `register failed: ${e.message || 'unknown'}`);
      Alert.alert(t('login_err_register_failed'), e.message || t('login_err_unknown'));
    }
  }, [username, password, confirmPassword, navigation]);

  const strengthInfo = isRegister ? getStrengthInfo(password) : null;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>
          {isRegister ? t('login_register_title') : t('login_title')}
        </Text>
        <Text style={styles.subtitle}>
          {isRegister ? t('login_register_subtitle') : t('login_subtitle')}
        </Text>

        <View style={styles.card}>
          <Text style={styles.label}>{t('login_username_label')}</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder={t('login_username_placeholder')}
            placeholderTextColor={Colors.textHint}
            autoCapitalize="none"
          />

          <Text style={styles.label}>
            {t('login_password_label')}
          </Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder={t('login_password_placeholder')}
            placeholderTextColor={Colors.textHint}
            secureTextEntry
          />

          {isRegister && password.length > 0 && strengthInfo && (
            <View
              style={[
                styles.strengthBadge,
                { backgroundColor: strengthInfo.bg },
              ]}>
              <Text
                style={[
                  styles.strengthText,
                  { color: strengthInfo.color },
                ]}>
                {t('login_strength_label')}{strengthInfo.label}
              </Text>
            </View>
          )}

          {isRegister && (
            <>
              <Text style={styles.label}>{t('login_confirm_password_label')}</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder={t('login_confirm_password_placeholder')}
                placeholderTextColor={Colors.textHint}
                secureTextEntry
              />
            </>
          )}
        </View>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={isRegister ? handleRegister : handleLogin}>
          <Text style={styles.primaryBtnText}>
            {isRegister ? t('login_btn_register') : t('login_btn_login')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.switchBtn}
          onPress={() => {
            log.touch('Login', `switch mode: ${isRegister ? 'register->login' : 'login->register'}`);
            setIsRegister(!isRegister);
          }}>
          <Text style={styles.switchBtnText}>
            {isRegister ? t('login_switch_to_login') : t('login_switch_to_register')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  content: {
    padding: Colors.gap.lg,
    flexGrow: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: Colors.font.xxl,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: Colors.font.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
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
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  strengthBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 16,
  },
  strengthText: { fontSize: Colors.font.sm, fontWeight: '600' },
  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Colors.radius.md,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryBtnText: {
    color: Colors.buttonText,
    fontSize: Colors.font.lg,
    fontWeight: '700',
  },
  switchBtn: { padding: 12, alignItems: 'center' },
  switchBtnText: {
    color: Colors.primary,
    fontSize: Colors.font.md,
    fontWeight: '600',
  },
});

export default LoginScreen;
