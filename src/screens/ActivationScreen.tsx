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
  Modal,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Colors from '../theme/colors';
import { activateWithCode, getActivationState, getRemainingEncrypts } from '../utils/activationState';
import { FREE_ENCRYPT_LIMIT, verifyActivationCodeOnChain, openUrlWithChooser } from '../utils/activation';
import { hapticSuccess, hapticError, hapticLight } from '../utils/haptic';
import { log } from '../utils/logger';
import { t } from '../i18n';
import type { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Activation'>;

type VerifyStep = 'idle' | 'local_check' | 'chain_check' | 'done';

const ActivationScreen: React.FC<Props> = () => {
  const [code, setCode] = useState('');
  const [activated, setActivated] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [loading, setLoading] = useState(false);
  const [verifyStep, setVerifyStep] = useState<VerifyStep>('idle');
  const [recruitModalVisible, setRecruitModalVisible] = useState(false);

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

  const handleGetCode = useCallback(async () => {
    hapticLight();
    const paymentUrl = 'https://redmagicbox.pages.dev/';
    Clipboard.setString(paymentUrl);
    try {
      await openUrlWithChooser(paymentUrl);
    } catch (e) {
      log.error('Activation', `打开选择器失败: ${e}`);
      Alert.alert(t('common_tip'), t('activation_link_copied'));
    }
  }, []);

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
            <View style={styles.recruitCard}>
              <Text style={styles.recruitTitle}>{t('activation_recruit_title')}</Text>
              <View style={styles.recruitCommissionBadge}>
                <Text style={styles.recruitCommissionText}>{t('activation_recruit_commission')}</Text>
              </View>
              <Text style={styles.recruitDesc}>{t('activation_recruit_desc1')}</Text>
              <Text style={styles.recruitDesc}>{t('activation_recruit_desc2')}</Text>
              <TouchableOpacity
                style={styles.recruitContactBtn}
                onPress={() => setRecruitModalVisible(true)}>
                <Text style={styles.recruitContactBtnText}>{t('activation_recruit_contact')}</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
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
                {t('activation_get_code_share_hint')}
              </Text>
            </TouchableOpacity>

            <View style={styles.recruitCard}>
              <Text style={styles.recruitTitle}>{t('activation_recruit_title')}</Text>
              <Text style={styles.recruitSubtitle}>{t('activation_recruit_subtitle')}</Text>
              <View style={styles.recruitCommissionBadge}>
                <Text style={styles.recruitCommissionText}>{t('activation_recruit_commission')}</Text>
              </View>
              <Text style={styles.recruitDesc}>{t('activation_recruit_desc1')}</Text>
              <Text style={styles.recruitDesc}>{t('activation_recruit_desc2')}</Text>
              <View style={styles.recruitDivider} />
              <Text style={styles.recruitBenefit}>{t('activation_recruit_benefit1')}</Text>
              <Text style={styles.recruitBenefit}>{t('activation_recruit_benefit2')}</Text>
              <Text style={styles.recruitBenefit}>{t('activation_recruit_benefit3')}</Text>
              <Text style={styles.recruitBenefit}>{t('activation_recruit_benefit4')}</Text>
              <View style={styles.recruitDivider} />
              <Text style={styles.recruitRequireTitle}>{t('activation_recruit_require_title')}</Text>
              <Text style={styles.recruitRequire}>• {t('activation_recruit_require1')}</Text>
              <Text style={styles.recruitRequire}>• {t('activation_recruit_require2')}</Text>
              <Text style={styles.recruitRequire}>• {t('activation_recruit_require3')}</Text>
              <TouchableOpacity
                style={styles.recruitContactBtn}
                onPress={() => setRecruitModalVisible(true)}>
                <Text style={styles.recruitContactBtnText}>{t('activation_recruit_contact')}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      <Modal
        visible={recruitModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setRecruitModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('activation_recruit_modal_title')}</Text>
            <Text style={styles.modalDesc}>{t('activation_recruit_modal_desc')}</Text>
            <View style={styles.modalDivider} />
            <Text style={styles.modalStepTitle}>{t('activation_recruit_modal_step_title')}</Text>
            <Text style={styles.modalStep}>{t('activation_recruit_modal_step1')}</Text>
            <Text style={styles.modalStep}>{t('activation_recruit_modal_step2')}</Text>
            <Text style={styles.modalStep}>{t('activation_recruit_modal_step3')}</Text>
            <View style={styles.modalDivider} />
            <Text style={styles.modalContactLabel}>{t('activation_recruit_modal_contact_label')}</Text>
            <View style={styles.modalContactCard}>
              <Text style={styles.modalContactIcon}>✈️</Text>
              <View style={styles.modalContactInfo}>
                <Text style={styles.modalContactType}>{t('activation_recruit_modal_telegram')}</Text>
                <Text style={styles.modalContactId}>@redmagicbox</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.modalCopyBtn}
              onPress={() => {
                Clipboard.setString('@redmagicbox');
                hapticSuccess();
                Alert.alert(t('common_success'), t('activation_recruit_modal_copied'));
              }}>
              <Text style={styles.modalCopyBtnText}>{t('activation_recruit_modal_copy')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setRecruitModalVisible(false)}>
              <Text style={styles.modalCloseBtnText}>{t('common_close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    marginTop: 16,
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
    fontSize: Colors.font.lg,
    fontWeight: '700',
  },
  getCodeHint: {
    color: Colors.textSecondary,
    fontSize: Colors.font.xs,
    marginTop: 4,
  },
  recruitCard: {
    backgroundColor: Colors.surface,
    borderRadius: Colors.radius.md,
    padding: 20,
    width: '100%',
    marginTop: 20,
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  recruitTitle: {
    fontSize: Colors.font.lg,
    fontWeight: '900',
    color: '#F59E0B',
    textAlign: 'center',
    marginBottom: 4,
  },
  recruitSubtitle: {
    fontSize: Colors.font.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  recruitCommissionBadge: {
    backgroundColor: '#FEF3C7',
    borderRadius: Colors.radius.md,
    padding: 12,
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  recruitCommissionText: {
    fontSize: Colors.font.lg,
    fontWeight: '900',
    color: '#D97706',
  },
  recruitDesc: {
    fontSize: Colors.font.sm,
    color: Colors.text,
    lineHeight: 20,
    marginBottom: 6,
  },
  recruitDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 10,
  },
  recruitBenefit: {
    fontSize: Colors.font.sm,
    color: Colors.text,
    fontWeight: '600',
    lineHeight: 22,
    marginBottom: 2,
  },
  recruitRequireTitle: {
    fontSize: Colors.font.md,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 6,
  },
  recruitRequire: {
    fontSize: Colors.font.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 2,
  },
  recruitContactBtn: {
    backgroundColor: '#F59E0B',
    borderRadius: Colors.radius.md,
    padding: 14,
    alignItems: 'center',
    marginTop: 14,
  },
  recruitContactBtnText: {
    color: '#FFF',
    fontSize: Colors.font.md,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderRadius: Colors.radius.md,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  modalTitle: {
    fontSize: Colors.font.lg,
    fontWeight: '900',
    color: '#F59E0B',
    textAlign: 'center',
    marginBottom: 10,
  },
  modalDesc: {
    fontSize: Colors.font.sm,
    color: Colors.text,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 4,
  },
  modalDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  modalStepTitle: {
    fontSize: Colors.font.md,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 6,
  },
  modalStep: {
    fontSize: Colors.font.sm,
    color: Colors.text,
    lineHeight: 22,
    marginBottom: 2,
  },
  modalContactLabel: {
    fontSize: Colors.font.md,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  modalContactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Colors.radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F59E0B',
    marginBottom: 14,
  },
  modalContactIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  modalContactInfo: {
    flex: 1,
  },
  modalContactType: {
    fontSize: Colors.font.xs,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  modalContactId: {
    fontSize: Colors.font.lg,
    fontWeight: '900',
    color: '#F59E0B',
  },
  modalCopyBtn: {
    backgroundColor: '#F59E0B',
    borderRadius: Colors.radius.md,
    padding: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  modalCopyBtnText: {
    color: '#FFF',
    fontSize: Colors.font.md,
    fontWeight: '700',
  },
  modalCloseBtn: {
    borderRadius: Colors.radius.md,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalCloseBtnText: {
    color: Colors.textSecondary,
    fontSize: Colors.font.md,
    fontWeight: '600',
  },
});

export default ActivationScreen;
