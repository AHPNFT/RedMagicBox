import { NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import zh from '../i18n/zh';
import zhTW from '../i18n/zh-TW';
import en from '../i18n/en';
import ja from '../i18n/ja';
import ko from '../i18n/ko';

const LANG_KEY = 'hongmo_lang';
const DEFAULT_LANG = 'zh-TW';

const LANG_MAP: Record<string, Record<string, string>> = { zh, 'zh-TW': zhTW, en, ja, ko };

export const LANG_OPTIONS: { code: string; label: string; flag: string }[] = [
  { code: 'zh-TW', label: '繁體中文', flag: '🇹🇼' },
  { code: 'zh', label: '简体中文', flag: '🇨🇳' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
];

const TRADITIONAL_LOCALES = ['zh-TW', 'zh-HK', 'zh-Hant', 'zh_MO', 'zh_TW', 'zh_HK', 'zh_Hant'];

function isTraditionalChinese(locale: string): boolean {
  const lower = locale.toLowerCase().replace('_', '-');
  return TRADITIONAL_LOCALES.some(
    (tl) => lower.startsWith(tl.toLowerCase()),
  );
}

function detectSystemLanguage(): string {
  try {
    if (Platform.OS === 'android') {
      const locale = NativeModules.I18nManager.localeIdentifier;
      if (locale) {
        if (locale.startsWith('zh')) {
          return isTraditionalChinese(locale) ? 'zh-TW' : 'zh';
        }
        if (locale.startsWith('ja')) return 'ja';
        if (locale.startsWith('ko')) return 'ko';
      }
    }
  } catch {}
  return DEFAULT_LANG;
}

let currentLang: string = DEFAULT_LANG;

function t(key: string): string {
  const dict = LANG_MAP[currentLang] || LANG_MAP[DEFAULT_LANG];
  return dict[key] || LANG_MAP[DEFAULT_LANG][key] || LANG_MAP.en[key] || key;
}

function getLang(): string {
  return currentLang;
}

async function initLang(): Promise<string> {
  try {
    const saved = await AsyncStorage.getItem(LANG_KEY);
    if (saved && LANG_MAP[saved]) {
      currentLang = saved;
    } else {
      currentLang = detectSystemLanguage();
    }
  } catch {
    currentLang = detectSystemLanguage();
  }
  return currentLang;
}

async function setLang(code: string): Promise<void> {
  if (!LANG_MAP[code]) return;
  currentLang = code;
  await AsyncStorage.setItem(LANG_KEY, code);
}

export { t, getLang, initLang, setLang };
