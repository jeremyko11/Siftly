'use client'

import { useState, useEffect } from 'react'
import { Globe } from 'lucide-react'
import { type Language, getCurrentLanguage, translations } from '@/lib/i18n'

interface LanguageToggleProps {
  className?: string
}

export default function LanguageToggle({ className = '' }: LanguageToggleProps) {
  const [lang, setLang] = useState<Language>('en')
  const [showDropdown, setShowDropdown] = useState(false)

  useEffect(() => {
    setLang(getCurrentLanguage())
  }, [])

  function toggleLanguage(newLang: Language) {
    setLang(newLang)
    localStorage.setItem('siftly-language', newLang)
    // 触发事件让其他组件更新
    window.dispatchEvent(new CustomEvent('siftly:language-change', { detail: newLang }))
    setShowDropdown(false)
    // 刷新页面以应用新语言
    window.location.reload()
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-all text-xs"
        title={translations[lang].language}
      >
        <Globe size={14} />
        <span className="text-[11px] font-medium uppercase">{lang}</span>
      </button>

      {showDropdown && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute right-0 top-full mt-1 z-50 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl overflow-hidden min-w-[100px]">
            <button
              onClick={() => toggleLanguage('en')}
              className={`w-full px-3 py-2 text-left text-xs hover:bg-zinc-700 transition-colors flex items-center justify-between ${
                lang === 'en' ? 'text-blue-400' : 'text-zinc-300'
              }`}
            >
              English
              {lang === 'en' && <span className="text-blue-400">✓</span>}
            </button>
            <button
              onClick={() => toggleLanguage('zh')}
              className={`w-full px-3 py-2 text-left text-xs hover:bg-zinc-700 transition-colors flex items-center justify-between ${
                lang === 'zh' ? 'text-blue-400' : 'text-zinc-300'
              }`}
            >
              中文
              {lang === 'zh' && <span className="text-blue-400">✓</span>}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
