'use client'

import { useState, useEffect } from 'react'
import { Globe, Sun, Moon } from 'lucide-react'
import { useI18n } from '@/lib/i18n-context'
import { type Language } from '@/lib/i18n'

export default function LanguageSection() {
  const { language, setLanguage, t } = useI18n()

  return (
    <div className="space-y-3">
      {/* Language Selector */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-300">{t.language}</p>
          <p className="text-xs text-zinc-500 mt-0.5">{t.languageDescription}</p>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-800 border border-zinc-700">
          <button
            onClick={() => setLanguage('en')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              language === 'en'
                ? 'bg-indigo-600 text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            English
          </button>
          <button
            onClick={() => setLanguage('zh')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              language === 'zh'
                ? 'bg-indigo-600 text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            中文
          </button>
        </div>
      </div>

      {/* Theme Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-300">{t.theme}</p>
          <p className="text-xs text-zinc-500 mt-0.5">{t.themeDescription}</p>
        </div>
        <ThemeToggle />
      </div>
    </div>
  )
}

function ThemeToggle() {
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains('light') === false
    setIsDark(isDarkMode)
  }, [])

  function toggleTheme() {
    const html = document.documentElement
    if (html.classList.contains('light')) {
      html.classList.remove('light')
      localStorage.setItem('theme', 'dark')
      setIsDark(true)
    } else {
      html.classList.add('light')
      localStorage.setItem('theme', 'light')
      setIsDark(false)
    }
  }

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 hover:border-zinc-600 transition-all"
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? <Sun size={14} className="text-zinc-400" /> : <Moon size={14} className="text-zinc-400" />}
      <span className="text-xs text-zinc-400">{isDark ? '深色' : '浅色'}</span>
    </button>
  )
}
