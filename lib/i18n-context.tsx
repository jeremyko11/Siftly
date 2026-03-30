'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { type Language, type Translations, getCurrentLanguage, getTranslations } from '@/lib/i18n'

interface I18nContextType {
  language: Language
  t: Translations
  setLanguage: (lang: Language) => void
}

const I18nContext = createContext<I18nContextType | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en')
  const [t, setT] = useState<Translations>(getTranslations('en'))

  useEffect(() => {
    const lang = getCurrentLanguage()
    setLanguageState(lang)
    setT(getTranslations(lang))
  }, [])

  useEffect(() => {
    function handleLanguageChange(e: CustomEvent<Language>) {
      setLanguageState(e.detail)
      setT(getTranslations(e.detail))
    }
    window.addEventListener('siftly:language-change', handleLanguageChange as EventListener)
    return () => window.removeEventListener('siftly:language-change', handleLanguageChange as EventListener)
  }, [])

  function setLanguage(lang: Language) {
    setLanguageState(lang)
    setT(getTranslations(lang))
    localStorage.setItem('siftly-language', lang)
    window.dispatchEvent(new CustomEvent('siftly:language-change', { detail: lang }))
  }

  return (
    <I18nContext.Provider value={{ language, t, setLanguage }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    // Fallback for SSR
    return {
      language: 'en' as Language,
      t: getTranslations('en'),
      setLanguage: () => {}
    }
  }
  return context
}
