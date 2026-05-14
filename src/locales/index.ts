import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './en.json'
import fr from './fr.json'
import pt from './pt.json'

export type supportedLngs = 'en' | 'fr' | 'pt'

type ISupportedLanguageType = {
  [key in supportedLngs]: string;
}

export const SupportedLanguages: ISupportedLanguageType = {
  en: 'English',
  fr: 'Français',
  pt: 'Português'
}

const resources = {
  en: {
    translations: en
  },
  fr: {
    translations: fr
  },
  pt: {
    translations: pt
  }
}

const LANG_STORAGE_KEY = 'op.portal.lang'

const getInitialLanguage = (): supportedLngs => {
  if (typeof window === 'undefined') return 'en'
  const saved = window.localStorage.getItem(LANG_STORAGE_KEY)
  if (saved === 'en' || saved === 'fr' || saved === 'pt') return saved
  return 'en'
}

declare module 'react-i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translations'
    resources: typeof resources['en']
  }
}

i18n.use(initReactI18next).init({
  compatibilityJSON: 'v3',
  fallbackLng: 'en',
  lng: getInitialLanguage(),
  resources,
  defaultNS: 'translations',
  supportedLngs: ['en', 'fr', 'pt']
})

i18n.on('languageChanged', (lng) => {
  if (typeof window === 'undefined') return
  if (lng === 'en' || lng === 'fr' || lng === 'pt') {
    window.localStorage.setItem(LANG_STORAGE_KEY, lng)
    document.documentElement.setAttribute('lang', lng)
  }
})

export default i18n
