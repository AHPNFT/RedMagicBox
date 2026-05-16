import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
  Clipboard,
  Linking,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Colors from '../theme/colors';
import { activateWithCode, getActivationState, getRemainingEncrypts } from '../utils/activationState';
import { FREE_ENCRYPT_LIMIT, verifyActivationCodeOnChain, getPaymentInfo, getActivationCodeByBuyer } from '../utils/activation';
import type { PaymentInfo, PaymentTokenInfo } from '../utils/activation';
import { hapticSuccess, hapticError, hapticLight } from '../utils/haptic';
import { log } from '../utils/logger';
import { t } from '../i18n';
import type { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Activation'>;

type VerifyStep = 'idle' | 'local_check' | 'chain_check' | 'done';
type TabMode = 'code' | 'purchase';

const ActivationScreen: React.FC<Props> = () => {
  const [code, setCode] = useState('');
  const [activated, setActivated] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [loading, setLoading] = useState(false);
  const [verifyStep, setVerifyStep] = useState<VerifyStep>('idle');
  const [tabMode, setTabMode] = useState<TabMode>('code');
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [buyerAddress, setBuyerAddress] = useState('');
  const [checkingCode, setCheckingCode] = useState(false);

  useEffect(() => {
    getActivationState().then((s) => setActivated(s.activated));
    getRemainingEncrypts().then((r) => setRemaining(r));
  }, []);

  const handleActivate = useCallback(async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      Alert.alert(t('common_tip'), t('activation_need_code'));
      return;
    }
    hapticLight();
    setLoading(true);
    setVerifyStep('local_check');
    log.info('Activation', `尝试激活: ${trimmed.slice(0, 4)}-****`);

    const result = await activateWithCode(trimmed);

    if (!result.success) {
      setLoading(false);
      setVerifyStep('idle');
      hapticError();
      log.error('Activation', `激活失败: ${result.message}`);
      Alert.alert(t('activation_fail_title'), result.message);
      return;
    }

    setVerifyStep('chain_check');

    const chainResult = await verifyActivationCodeOnChain(trimmed);

    if (chainResult === 'verified') {
      setLoading(false);
      setVerifyStep('done');
      hapticSuccess();
      setActivated(true);
      log.info('Activation', '超级加密模式已激活（链上验证通过）');
      Alert.alert(t('activation_success_title'), t('activation_success_chain_msg'));
    } else if (chainResult === 'not_found') {
      setLoading(false);
      setVerifyStep('idle');
      hapticError();
      log.warn('Activation', '链上验证未通过：激活码非合约生成');
      Alert.alert(t('activation_chain_fail_title'), t('activation_chain_fail_msg'));
    } else {
      setLoading(false);
      setVerifyStep('idle');
      hapticSuccess();
      setActivated(true);
      log.info('Activation', '超级加密模式已激活（链上验证跳过）');
      Alert.alert(
        t('activation_success_title'),
        t('activation_chain_skip_msg')
      );
    }
  }, [code]);

  const handleGetCode = useCallback(() => {
    hapticLight();
    const url = 'https://redmagicbox.pages.dev/';
    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert(t('common_tip'), t('activation_get_code_hint'));
      }
    });
  }, []);

  const loadPaymentInfo = useCallback(async () => {
    setPaymentLoading(true);
    try {
      const info = await getPaymentInfo();
      setPaymentInfo(info);
    } catch (e) {
      log.error('Activation', `获取支付信息失败: ${e}`);
    } finally {
      setPaymentLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tabMode === 'purchase' && !paymentInfo) {
      loadPaymentInfo();
    }
  }, [tabMode]);

  const handleCopyAddress = useCallback((address: string) => {
    hapticLight();
    Clipboard.setString(address);
    Alert.alert(t('common_tip'), t('activation_address_copied'));
  }, []);

  const handleCheckCode = useCallback(async () => {
    const addr = buyerAddress.trim();
    if (!addr || !addr.startsWith('0x') || addr.length !== 42) {
      Alert.alert(t('common_tip'), t('activation_invalid_address'));
      return;
    }
    hapticLight();
    setCheckingCode(true);
    try {
      const code = await getActivationCodeByBuyer(addr);
      if (code) {
        setCode(code);
        setTabMode('code');
        hapticSuccess();
        Alert.alert(t('activation_code_found_title'), t('activation_code_found_msg'));
      } else {
        hapticError();
        Alert.alert(t('activation_code_not_found_title'), t('activation_code_not_found_msg'));
      }
    } catch (e) {
      log.error('Activation', `查询激活码失败: ${e}`);
      Alert.alert(t('common_tip'), t('activation_check_error'));
    } finally {
      setCheckingCode(false);
    }
  }, [buyerAddress]);

  const formatCode = (text: string) => {
    const raw = text.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 16);
    const parts = [raw.slice(0, 4), raw.slice(4, 8), raw.slice(8, 12), raw.slice(12, 16)];
    return parts.filter(Boolean).join('-');
  };

  const getVerifyText = () => {
    switch (verifyStep) {
      case 'local_check':
        return t('activation_step_local');
      case 'chain_check':
        return t('activation_step_chain');
      case 'done':
        return t('activation_step_done');
      default:
        return t('activation_btn');
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>{activated ? '🚀' : '⚡'}</Text>
        </View>

        <Text style={styles.title}>
          {activated ? t('activation_title_activated') : t('activation_title_unactivated')}
        </Text>

        {activated ? (
          <>
            <View style={styles.activatedCard}>
              <Text style={styles.activatedTitle}>{t('activation_activated_title')}</Text>
              <Text style={styles.activatedText}>
                {t('activation_activated_feature1')}{'\n'}
                {t('activation_activated_feature2')}{'\n'}
                {t('activation_activated_feature3')}
              </Text>
            </View>
            <View style={styles.warningCard}>
              <Text style={styles.warningText}>{t('activation_code_warning')}</Text>
              <Text style={styles.saveHintText}>{t('activation_code_save_hint')}</Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.tabRow}>
              <TouchableOpacity
                style={[styles.tab, tabMode === 'code' && styles.tabActive]}
                onPress={() => setTabMode('code')}>
                <Text style={[styles.tabText, tabMode === 'code' && styles.tabTextActive]}>
                  {t('activation_tab_code')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, tabMode === 'purchase' && styles.tabActive]}
                onPress={() => setTabMode('purchase')}>
                <Text style={[styles.tabText, tabMode === 'purchase' && styles.tabTextActive]}>
                  {t('activation_tab_purchase')}
                </Text>
              </TouchableOpacity>
            </View>

            {tabMode === 'code' ? (
              <>
            <View style={styles.challengeCard}>
              <Text style={styles.challengeTitle}>{t('activation_challenge_title')}</Text>
              <Text style={styles.challengeText}>
                {t('activation_challenge_text')}{'\n\n'}
                {t('activation_challenge_bounty')}{'\n'}
                {t('activation_challenge_desc')}{'\n'}
                <Text style={styles.challengeReward}>{t('activation_challenge_reward')}</Text>{'\n'}
                {t('activation_challenge_suffix')}
              </Text>
            </View>

            <View style={styles.modeCompare}>
              <View style={[styles.modeCard, styles.modeFree]}>
                <Text style={styles.modeCardTitle}>{t('activation_mode_free')}</Text>
                <Text style={styles.modeCardPrice}>{t('activation_mode_free_price')}</Text>
                <Text style={styles.modeCardFeature}>{t('activation_mode_free_feature1').replace('{limit}', String(FREE_ENCRYPT_LIMIT))}</Text>
                <Text style={styles.modeCardFeature}>{t('activation_mode_free_feature2')}</Text>
                <Text style={styles.modeCardFeatureDim}>{t('activation_mode_free_feature3')}</Text>
              </View>
              <View style={[styles.modeCard, styles.modePro]}>
                <Text style={styles.modeCardBadge}>{t('activation_mode_pro_badge')}</Text>
                <Text style={styles.modeCardTitlePro}>{t('activation_mode_pro')}</Text>
                <Text style={styles.modeCardPricePro}>{t('activation_mode_pro_price')}</Text>
                <Text style={styles.modeCardPriceSub}>{t('activation_mode_pro_price_sub')}</Text>
                <Text style={styles.modeCardFeaturePro}>{t('activation_mode_pro_feature1')}</Text>
                <Text style={styles.modeCardFeaturePro}>{t('activation_mode_pro_feature2')}</Text>
                <Text style={styles.modeCardFeaturePro}>{t('activation_mode_pro_feature3')}</Text>
              </View>
            </View>

            <View style={styles.limitCard}>
              <Text style={styles.limitTitle}>{t('activation_remaining_title')}</Text>
              <Text style={styles.limitCount}>
                {remaining} / {FREE_ENCRYPT_LIMIT}
              </Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${(remaining / FREE_ENCRYPT_LIMIT) * 100}%` },
                  ]}
                />
              </View>
            </View>

            <View style={styles.inputCard}>
              <Text style={styles.label}>{t('activation_input_label')}</Text>
              <TextInput
                style={styles.codeInput}
                value={code}
                onChangeText={(t_val) => setCode(formatCode(t_val))}
                placeholder={t('activation_input_placeholder')}
                placeholderTextColor={Colors.textHint}
                autoCapitalize="characters"
                maxLength={19}
                autoFocus
              />
              <Text style={styles.hint}>
                {t('activation_input_hint')}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.activateBtn, loading && styles.activateBtnDisabled]}
              onPress={handleActivate}
              disabled={loading}>
              {loading ? (
                <View style={styles.btnRow}>
                  <ActivityIndicator size="small" color="#FFF" />
                  <Text style={styles.activateBtnText}>{getVerifyText()}</Text>
                </View>
              ) : (
                <Text style={styles.activateBtnText}>{t('activation_btn')}</Text>
              )}
            </TouchableOpacity>

            {loading && verifyStep === 'chain_check' && (
              <View style={styles.chainHintCard}>
                <Text style={styles.chainHintText}>{t('activation_chain_hint')}</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.getCodeBtn}
              onPress={handleGetCode}>
              <Text style={styles.getCodeBtnText}>
                {t('activation_get_code')}
              </Text>
              <Text style={styles.getCodeHint}>
                {t('activation_get_code_hint')}
              </Text>
            </TouchableOpacity>
              </>
            ) : (
              <>
            {paymentLoading ? (
              <View style={styles.paymentLoadingCard}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.paymentLoadingText}>{t('activation_payment_loading')}</Text>
              </View>
            ) : paymentInfo ? (
              <>
                <View style={styles.paymentInfoCard}>
                  <Text style={styles.paymentInfoTitle}>{t('activation_payment_title')}</Text>
                  <Text style={styles.paymentInfoDesc}>{t('activation_payment_desc')}</Text>
                </View>

                {paymentInfo.bnbPrice > 0 && (
                  <View style={styles.paymentMethodCard}>
                    <View style={styles.paymentMethodHeader}>
                      <Text style={styles.paymentMethodSymbol}>BNB</Text>
                      <Text style={styles.paymentMethodPrice}>{paymentInfo.bnbPrice} BNB</Text>
                    </View>
                    <Text style={styles.paymentMethodNetwork}>{t('activation_network_bsc')}</Text>
                  </View>
                )}

                {paymentInfo.tokens.map((token) => (
                  <View key={token.address} style={styles.paymentMethodCard}>
                    <View style={styles.paymentMethodHeader}>
                      <Text style={styles.paymentMethodSymbol}>{token.symbol}</Text>
                      <Text style={styles.paymentMethodPrice}>{token.price} {token.symbol}</Text>
                    </View>
                    <Text style={styles.paymentMethodNetwork}>{t('activation_network_bsc')}</Text>
                  </View>
                ))}

                <View style={styles.walletCard}>
                  <Text style={styles.walletLabel}>{t('activation_payment_wallet')}</Text>
                  <View style={styles.walletRow}>
                    <Text style={styles.walletAddress} numberOfLines={1} ellipsizeMode="middle">
                      {paymentInfo.adminWallet}
                    </Text>
                    <TouchableOpacity
                      style={styles.copyBtn}
                      onPress={() => handleCopyAddress(paymentInfo.adminWallet)}>
                      <Text style={styles.copyBtnText}>{t('activation_copy')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.stepsCard}>
                  <Text style={styles.stepsTitle}>{t('activation_payment_steps')}</Text>
                  <Text style={styles.stepsText}>
                    {t('activation_payment_step1')}{'\n'}
                    {t('activation_payment_step2')}{'\n'}
                    {t('activation_payment_step3')}
                  </Text>
                </View>

                <View style={styles.inputCard}>
                  <Text style={styles.label}>{t('activation_buyer_address_label')}</Text>
                  <TextInput
                    style={styles.addressInput}
                    value={buyerAddress}
                    onChangeText={setBuyerAddress}
                    placeholder={t('activation_buyer_address_placeholder')}
                    placeholderTextColor={Colors.textHint}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.activateBtn, checkingCode && styles.activateBtnDisabled]}
                  onPress={handleCheckCode}
                  disabled={checkingCode}>
                  {checkingCode ? (
                    <View style={styles.btnRow}>
                      <ActivityIndicator size="small" color="#FFF" />
                      <Text style={styles.activateBtnText}>{t('activation_checking')}</Text>
                    </View>
                  ) : (
                    <Text style={styles.activateBtnText}>{t('activation_check_code')}</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.paymentLoadingCard}>
                <Text style={styles.paymentLoadingText}>{t('activation_payment_load_fail')}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={loadPaymentInfo}>
                  <Text style={styles.retryBtnText}>{t('activation_retry')}</Text>
                </TouchableOpacity>
              </View>
            )}
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Colors.gap.lg, alignItems: 'center', paddingTop: 30 },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  icon: { fontSize: 36 },
  title: {
    fontSize: Colors.font.xxl,
    fontWeight: '900',
    color: Colors.text,
    marginBottom: 20,
  },
  activatedCard: {
    backgroundColor: Colors.successBg,
    borderRadius: Colors.radius.md,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.success,
  },
  activatedTitle: {
    fontSize: Colors.font.lg,
    fontWeight: '700',
    color: Colors.success,
    marginBottom: 12,
  },
  activatedText: {
    fontSize: Colors.font.md,
    color: Colors.textSecondary,
    textAlign: 'left',
    lineHeight: 24,
  },
  warningCard: {
    backgroundColor: '#FFF3CD',
    borderRadius: Colors.radius.md,
    padding: 16,
    width: '100%',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#FFC107',
  },
  warningText: {
    fontSize: Colors.font.sm,
    color: '#856404',
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '600',
  },
  saveHintText: {
    fontSize: Colors.font.xs,
    color: '#0d6efd',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 8,
    fontWeight: '500',
  },
  challengeCard: {
    backgroundColor: Colors.surface,
    borderRadius: Colors.radius.md,
    padding: 20,
    width: '100%',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  challengeTitle: {
    fontSize: Colors.font.lg,
    fontWeight: '900',
    color: Colors.primary,
    marginBottom: 10,
    textAlign: 'center',
  },
  challengeText: {
    fontSize: Colors.font.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  challengeReward: {
    fontSize: Colors.font.lg,
    fontWeight: '900',
    color: Colors.primary,
  },
  modeCompare: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginBottom: 16,
  },
  modeCard: {
    flex: 1,
    borderRadius: Colors.radius.md,
    padding: 16,
    borderWidth: 1,
    position: 'relative',
  },
  modeFree: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
  },
  modePro: {
    backgroundColor: Colors.surface,
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  modeCardBadge: {
    position: 'absolute',
    top: -10,
    right: 8,
    backgroundColor: Colors.primary,
    color: '#FFF',
    fontSize: Colors.font.xs,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  modeCardTitle: {
    fontSize: Colors.font.md,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  modeCardTitlePro: {
    fontSize: Colors.font.md,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 4,
  },
  modeCardPrice: {
    fontSize: Colors.font.lg,
    fontWeight: '900',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  modeCardPricePro: {
    fontSize: Colors.font.lg,
    fontWeight: '900',
    color: Colors.primary,
    marginBottom: 2,
  },
  modeCardPriceSub: {
    fontSize: Colors.font.xs,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  modeCardFeature: {
    fontSize: Colors.font.xs,
    color: Colors.textHint,
    marginBottom: 3,
  },
  modeCardFeatureDim: {
    fontSize: Colors.font.xs,
    color: Colors.border,
    marginBottom: 3,
    textDecorationLine: 'line-through',
  },
  modeCardFeaturePro: {
    fontSize: Colors.font.xs,
    color: Colors.text,
    fontWeight: '600',
    marginBottom: 3,
  },
  limitCard: {
    backgroundColor: Colors.surface,
    borderRadius: Colors.radius.md,
    padding: 16,
    width: '100%',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  limitTitle: {
    fontSize: Colors.font.sm,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  limitCount: {
    fontSize: Colors.font.xl,
    fontWeight: '900',
    color: Colors.warning,
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    width: '100%',
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    backgroundColor: Colors.warning,
    borderRadius: 3,
  },
  inputCard: {
    backgroundColor: Colors.surface,
    borderRadius: Colors.radius.md,
    padding: 20,
    width: '100%',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  label: {
    fontSize: Colors.font.sm,
    color: Colors.textSecondary,
    marginBottom: 8,
    fontWeight: '600',
  },
  codeInput: {
    backgroundColor: Colors.surfaceVariant,
    borderRadius: Colors.radius.sm,
    padding: 14,
    fontSize: Colors.font.lg,
    color: Colors.text,
    fontWeight: '700',
    letterSpacing: 2,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  hint: {
    fontSize: Colors.font.xs,
    color: Colors.textHint,
    marginTop: 8,
    textAlign: 'center',
  },
  activateBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Colors.radius.md,
    padding: 16,
    width: '100%',
    alignItems: 'center',
  },
  activateBtnDisabled: { opacity: 0.5 },
  activateBtnText: {
    color: Colors.buttonText,
    fontSize: Colors.font.lg,
    fontWeight: '700',
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  chainHintCard: {
    backgroundColor: Colors.surface,
    borderRadius: Colors.radius.md,
    padding: 14,
    width: '100%',
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: 'center',
  },
  chainHintText: {
    fontSize: Colors.font.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  getCodeBtn: {
    marginTop: 12,
    padding: 14,
    width: '100%',
    alignItems: 'center',
    borderRadius: Colors.radius.md,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: 'transparent',
  },
  getCodeBtnText: {
    color: Colors.primary,
    fontSize: Colors.font.md,
    fontWeight: '700',
  },
  getCodeHint: {
    color: Colors.textSecondary,
    fontSize: Colors.font.sm,
    marginTop: 6,
    textAlign: 'center',
  },
  tabRow: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: 16,
    borderRadius: Colors.radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  tabActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: Colors.font.md,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: '#FFF',
  },
  paymentLoadingCard: {
    backgroundColor: Colors.surface,
    borderRadius: Colors.radius.md,
    padding: 32,
    width: '100%',
    alignItems: 'center',
  },
  paymentLoadingText: {
    fontSize: Colors.font.sm,
    color: Colors.textSecondary,
    marginTop: 12,
  },
  paymentInfoCard: {
    backgroundColor: Colors.surface,
    borderRadius: Colors.radius.md,
    padding: 20,
    width: '100%',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: 'center',
  },
  paymentInfoTitle: {
    fontSize: Colors.font.lg,
    fontWeight: '900',
    color: Colors.primary,
    marginBottom: 8,
  },
  paymentInfoDesc: {
    fontSize: Colors.font.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  paymentMethodCard: {
    backgroundColor: Colors.surface,
    borderRadius: Colors.radius.md,
    padding: 16,
    width: '100%',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  paymentMethodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentMethodSymbol: {
    fontSize: Colors.font.lg,
    fontWeight: '900',
    color: Colors.primary,
  },
  paymentMethodPrice: {
    fontSize: Colors.font.md,
    fontWeight: '700',
    color: Colors.text,
  },
  paymentMethodNetwork: {
    fontSize: Colors.font.xs,
    color: Colors.textHint,
    marginTop: 4,
  },
  walletCard: {
    backgroundColor: Colors.surface,
    borderRadius: Colors.radius.md,
    padding: 16,
    width: '100%',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  walletLabel: {
    fontSize: Colors.font.sm,
    color: Colors.textSecondary,
    marginBottom: 8,
    fontWeight: '600',
  },
  walletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  walletAddress: {
    flex: 1,
    fontSize: Colors.font.sm,
    color: Colors.text,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  copyBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Colors.radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  copyBtnText: {
    color: '#FFF',
    fontSize: Colors.font.xs,
    fontWeight: '700',
  },
  stepsCard: {
    backgroundColor: '#FFF3CD',
    borderRadius: Colors.radius.md,
    padding: 16,
    width: '100%',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFC107',
  },
  stepsTitle: {
    fontSize: Colors.font.md,
    fontWeight: '700',
    color: '#856404',
    marginBottom: 8,
  },
  stepsText: {
    fontSize: Colors.font.sm,
    color: '#856404',
    lineHeight: 22,
  },
  addressInput: {
    backgroundColor: Colors.surfaceVariant,
    borderRadius: Colors.radius.sm,
    padding: 14,
    fontSize: Colors.font.sm,
    color: Colors.text,
    fontWeight: '600',
    fontFamily: 'monospace',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  retryBtn: {
    marginTop: 12,
    backgroundColor: Colors.primary,
    borderRadius: Colors.radius.md,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  retryBtnText: {
    color: '#FFF',
    fontSize: Colors.font.md,
    fontWeight: '700',
  },
});

export default ActivationScreen;
