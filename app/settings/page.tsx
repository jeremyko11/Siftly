'use client'

import { useState, useEffect } from 'react'
import {
  Eye,
  EyeOff,
  Download,
  Check,
  AlertCircle,
  Key,
  Database,
  Info,
  Trash2,
  Shield,
  ExternalLink,
  ChevronDown,
  Zap,
  Copy,
  Coffee,
  Terminal,
  Loader2,
  X,
  Globe,
  Sun,
  Moon,
  Github,
} from 'lucide-react'
import { useI18n } from '@/lib/i18n-context'
import { type Language } from '@/lib/i18n'

const ANTHROPIC_MODELS = [
  { value: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5', description: 'Fast & Cheap' },
  { value: 'claude-sonnet-4-6', label: 'Sonnet 4.6', description: 'Smart & Balanced' },
  { value: 'claude-opus-4-6', label: 'Opus 4.6', description: 'Most Capable' },
]

const OPENAI_MODELS = [
  { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini', description: 'Fast & Cheap' },
  { value: 'gpt-4.1', label: 'GPT-4.1', description: 'Most Capable' },
  { value: 'gpt-4.1-nano', label: 'GPT-4.1 Nano', description: 'Fastest' },
  { value: 'o4-mini', label: 'o4-mini', description: 'Reasoning (mini)' },
  { value: 'o3', label: 'o3', description: 'Reasoning' },
]


interface Toast {
  type: 'success' | 'error'
  message: string
}

function ToastAlert({ toast }: { toast: Toast }) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border ${
        toast.type === 'success'
          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
          : 'bg-red-500/10 text-red-400 border-red-500/20'
      }`}
    >
      {toast.type === 'success' ? <Check size={15} className="shrink-0" /> : <AlertCircle size={15} className="shrink-0" />}
      {toast.message}
    </div>
  )
}

interface SectionProps {
  icon: React.ComponentType<{ size?: number; className?: string }>
  title: string
  description: string
  children: React.ReactNode
  variant?: 'default' | 'danger'
}

function Section({ icon: Icon, title, description, children, variant = 'default' }: SectionProps) {
  const isDanger = variant === 'danger'
  return (
    <div
      className={`bg-zinc-900 rounded-2xl p-6 transition-all duration-200 ${
        isDanger
          ? 'border border-red-700/60 hover:border-red-600/70'
          : 'border border-zinc-800 hover:border-zinc-700'
      }`}
    >
      <div className="flex items-start gap-3 mb-5">
        <div
          className={`p-2.5 rounded-xl shrink-0 ${
            isDanger ? 'bg-red-800/40' : 'bg-indigo-500/10'
          }`}
        >
          <Icon size={16} className={isDanger ? 'text-red-500' : 'text-indigo-400'} />
        </div>
        <div>
          <h2 className={`text-base font-semibold ${isDanger ? 'text-red-400' : 'text-zinc-100'}`}>
            {title}
          </h2>
          <p className="text-sm text-zinc-500 mt-0.5 leading-relaxed">{description}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

function ApiKeyField({
  label,
  placeholder,
  fieldKey,
  hint,
  docHref,
  onToast,
  testProvider,
  ti18n,
}: {
  label: string
  placeholder: string
  fieldKey: 'anthropicApiKey' | 'openaiApiKey'
  hint: string
  docHref: string
  onToast: (t: Toast) => void
  testProvider?: string
  ti18n: ReturnType<typeof useI18n>['t']
}) {
  const [key, setKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [savedMasked, setSavedMasked] = useState<string | null>(null)
  const [testState, setTestState] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle')
  const [testError, setTestError] = useState('')

  // Load existing saved key status on mount
  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d: Record<string, unknown>) => {
        const hasKeyField = fieldKey === 'openaiApiKey' ? 'hasOpenaiKey' : 'hasAnthropicKey'
        const hasKey = d[hasKeyField]
        const masked = d[fieldKey] as string | null
        if (hasKey && masked) setSavedMasked(masked)
      })
      .catch(() => {})
  }, [fieldKey])

  async function handleSave() {
    if (!key.trim()) {
      onToast({ type: 'error', message: ti18n.error })
      return
    }
    setSaving(true)
    setTestState('idle')
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [fieldKey]: key.trim() }),
      })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        throw new Error(data.error ?? ti18n.error)
      }
      setSavedMasked(key.trim().slice(0, 6) + '••••••••' + key.trim().slice(-4))
      setKey('')
      // Auto-test after save
      if (testProvider) void handleTest()
      else onToast({ type: 'success', message: `${label} ${ti18n.saved}` })
    } catch (err) {
      onToast({
        type: 'error',
        message: err instanceof Error ? err.message : ti18n.failedToSaveApiKey,
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove() {
    setRemoving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: fieldKey }),
      })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        throw new Error(data.error ?? ti18n.error)
      }
      setSavedMasked(null)
      setTestState('idle')
      onToast({ type: 'success', message: `${label} ${ti18n.remove}` })
    } catch (err) {
      onToast({ type: 'error', message: err instanceof Error ? err.message : ti18n.failedToRemoveKey })
    } finally {
      setRemoving(false)
    }
  }

  async function handleTest() {
    if (!testProvider) return
    setTestState('testing')
    setTestError('')
    try {
      const res = await fetch('/api/settings/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: testProvider }),
      })
      const data = await res.json() as { working: boolean; error?: string }
      if (data.working) {
        setTestState('ok')
        onToast({ type: 'success', message: `${label} is working` })
      } else {
        setTestState('fail')
        setTestError(data.error ?? 'Key test failed')
      }
    } catch {
      setTestState('fail')
      setTestError('Connection error')
    }
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-2 min-w-0">
        <p className="text-sm font-medium text-zinc-300 shrink-0">{label}</p>
        <div className="flex items-center gap-2 min-w-0 overflow-hidden">
          {savedMasked && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg min-w-0 overflow-hidden">
              <Check size={11} className="shrink-0" /> <span className="shrink-0">Saved:</span> <span className="font-mono truncate">{savedMasked}</span>
            </span>
          )}
          {savedMasked && (
            <button
              onClick={() => void handleRemove()}
              disabled={removing}
              className="shrink-0 text-xs text-red-500/70 hover:text-red-400 transition-colors disabled:opacity-50"
              title="Remove saved key"
            >
              {removing ? ti18n.removing : ti18n.remove}
            </button>
          )}
          {testProvider && savedMasked && testState === 'idle' && (
            <button
              onClick={() => void handleTest()}
              className="shrink-0 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Test
            </button>
          )}
          {testState === 'testing' && (
            <span className="flex items-center gap-1 text-xs text-zinc-400 shrink-0">
              <Loader2 size={11} className="animate-spin" /> {ti18n.testing}
            </span>
          )}
          {testState === 'ok' && (
            <span className="flex items-center gap-1 text-xs text-emerald-400 shrink-0">
              <Check size={11} /> {ti18n.working}
            </span>
          )}
          {testState === 'fail' && (
            <span className="flex items-center gap-1 text-xs text-red-400 shrink-0" title={testError}>
              <X size={11} /> {testError.slice(0, 30) || ti18n.failed}
            </span>
          )}
        </div>
      </div>
      <div className="flex gap-2.5">
        <div className="relative flex-1">
          <input
            type={showKey ? 'text' : 'password'}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void handleSave()}
            placeholder={savedMasked ? ti18n.enterNewKeyToReplace : placeholder}
            className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder:text-zinc-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all duration-200 pr-10 font-mono"
          />
          <button
            type="button"
            onClick={() => setShowKey((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
            aria-label={showKey ? ti18n.hideKey : ti18n.showKey}
          >
            {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
        <button
          onClick={() => void handleSave()}
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors shrink-0"
        >
          {saving ? ti18n.saving : ti18n.save}
        </button>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-600">{hint}</p>
        <a
          href={docHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-400 transition-colors"
        >
          {ti18n.getKey} <ExternalLink size={11} />
        </a>
      </div>
    </div>
  )
}

function ModelSelector({
  models,
  settingKey,
  defaultValue,
  onToast,
  t,
}: {
  models: { value: string; label: string; description: string }[]
  settingKey: 'anthropicModel' | 'openaiModel'
  defaultValue: string
  onToast: (t: Toast) => void
  t: ReturnType<typeof useI18n>['t']
}) {
  const [value, setValue] = useState(defaultValue)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d) => { if (d[settingKey]) setValue(d[settingKey] as string) })
      .catch(() => {})
  }, [settingKey])

  async function handleChange(newVal: string) {
    setValue(newVal)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [settingKey]: newVal }),
      })
      if (!res.ok) throw new Error('Failed')
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      onToast({ type: 'error', message: t.failedToSaveModel })
    }
  }

  const selected = models.find((m) => m.value === value) ?? models[0]

  return (
    <>
      <div className="flex items-center gap-2 mt-2.5">
        <span className="text-xs text-zinc-500 shrink-0">{t.model}</span>
        <div className="relative flex-1">
          <select
            value={value}
            onChange={(e) => void handleChange(e.target.value)}
            className="w-full appearance-none pl-3 pr-8 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
          >
            {models.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label} — {m.description}
              </option>
            ))}
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
        </div>
        {saved && (
          <span className="flex items-center gap-1 text-xs text-emerald-400 shrink-0">
            <Check size={12} /> Saved
          </span>
        )}
        {!saved && selected && (
          <span className="text-xs text-zinc-600 shrink-0 hidden sm:block">{selected.description}</span>
        )}
      </div>
      {value === 'claude-opus-4-6' && (
        <p className="text-xs text-amber-500/80 mt-1.5">
          Opus is slow with 20 parallel workers — consider Sonnet or Haiku for faster bulk categorization.
        </p>
      )}
    </>
  )
}

interface CliStatus {
  available: boolean
  subscriptionType?: string
  expired?: boolean
}

function ClaudeCliStatusBox({ t }: { t: ReturnType<typeof useI18n>['t'] }) {
  const [status, setStatus] = useState<CliStatus | null>(null)

  useEffect(() => {
    fetch('/api/settings/cli-status')
      .then((r) => r.json())
      .then((d: CliStatus) => setStatus(d))
      .catch(() => setStatus({ available: false }))
  }, [])

  if (status === null) return null // loading — don't flash UI

  if (status.available && !status.expired) {
    const tier = status.subscriptionType
      ? status.subscriptionType.charAt(0).toUpperCase() + status.subscriptionType.slice(1)
      : 'CLI'
    return (
      <div className="flex gap-3 p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 mb-5">
        <Check size={15} className="text-emerald-400 shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-emerald-300">
            {t.cliDetected}
          </p>
          <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
            {t.signedInAs} <span className="text-zinc-300">{tier}</span> {t.willUseSubscriptionAutomatically}
          </p>
        </div>
      </div>
    )
  }

  if (status.available && status.expired) {
    return (
      <div className="flex gap-3 p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 mb-5">
        <AlertCircle size={15} className="text-amber-400 shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-amber-300">{t.cliSessionExpired}</p>
          <p className="text-xs text-zinc-500 mt-0.5">
            {t.runCluadeRefresh}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3 p-3.5 rounded-xl bg-zinc-800/60 border border-zinc-700 mb-5">
      <Terminal size={15} className="text-zinc-400 shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-zinc-200">{t.noCliDetected}</p>
        <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
          {t.installClaudeCode}
        </p>
      </div>
    </div>
  )
}

function CodexCliStatusBox({ t }: { t: ReturnType<typeof useI18n>['t'] }) {
  const [status, setStatus] = useState<{ available: boolean; expired?: boolean; planType?: string; authMode?: string } | null>(null)

  useEffect(() => {
    fetch('/api/settings/cli-status')
      .then((r) => r.json())
      .then((d: { codex?: { available: boolean; expired?: boolean; planType?: string; authMode?: string } }) => setStatus(d.codex ?? { available: false }))
      .catch(() => setStatus({ available: false }))
  }, [])

  if (status === null) return null

  if (status.available && !status.expired) {
    const tier = status.planType
      ? status.planType.charAt(0).toUpperCase() + status.planType.slice(1)
      : 'CLI'
    return (
      <div className="flex gap-3 p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 mb-5">
        <Check size={15} className="text-emerald-400 shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-emerald-300">
            Codex CLI detected — no API key needed
          </p>
          <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
            Signed in as <span className="text-zinc-300">{tier}</span> via Codex CLI. Siftly will use your credentials automatically. An API key below will take priority if set.
          </p>
        </div>
      </div>
    )
  }

  if (status.available && status.expired) {
    return (
      <div className="flex gap-3 p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 mb-5">
        <AlertCircle size={15} className="text-amber-400 shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-amber-300">Codex CLI session expired</p>
          <p className="text-xs text-zinc-500 mt-0.5">
            Run <span className="font-mono text-zinc-300">codex</span> in your terminal to refresh, then reload this page.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3 p-3.5 rounded-xl bg-zinc-800/60 border border-zinc-700 mb-5">
      <Terminal size={15} className="text-zinc-400 shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-zinc-200">No Codex CLI detected</p>
        <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
          Install Codex CLI and sign in to skip the API key entirely, or paste your OpenAI API key below.
        </p>
      </div>
    </div>
  )
}

function ProviderToggle({ value, onChange, t }: { value: 'anthropic' | 'openai'; onChange: (v: 'anthropic' | 'openai') => void; t: ReturnType<typeof useI18n>['t'] }) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-800 border border-zinc-700 mb-5">
      <button
        onClick={() => onChange('anthropic')}
        className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
          value === 'anthropic'
            ? 'bg-indigo-600 text-white shadow-sm'
            : 'text-zinc-400 hover:text-zinc-200'
        }`}
      >
        {t.anthropicClaude}
      </button>
      <button
        onClick={() => onChange('openai')}
        className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
          value === 'openai'
            ? 'bg-emerald-600 text-white shadow-sm'
            : 'text-zinc-400 hover:text-zinc-200'
        }`}
      >
        {t.openaiGpt}
      </button>
    </div>
  )
}

function ApiKeySection({ onToast, t }: { onToast: (t: Toast) => void; t: ReturnType<typeof useI18n>['t'] }) {
  const [provider, setProvider] = useState<'anthropic' | 'openai' | null>(null)

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d: { provider?: string }) => {
        setProvider(d.provider === 'openai' ? 'openai' : 'anthropic')
      })
      .catch(() => setProvider('anthropic'))
  }, [])

  async function handleProviderChange(newProvider: 'anthropic' | 'openai') {
    const prev = provider
    setProvider(newProvider)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: newProvider }),
      })
      if (!res.ok) throw new Error('Failed')
      onToast({ type: 'success', message: `${t.switchedTo} ${newProvider === 'openai' ? 'OpenAI' : 'Anthropic'}` })
    } catch {
      setProvider(prev) // revert on failure
      onToast({ type: 'error', message: t.failedToSaveProvider })
    }
  }

  // Don't render until we know the saved provider — avoids flicker
  if (provider === null) {
    return (
      <Section
        icon={Key}
        title={t.aiProvider}
        description={t.aiProviderDescription}
      >
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <Loader2 size={14} className="animate-spin" /> {t.loadingSettings}
        </div>
      </Section>
    )
  }

  return (
    <Section
      icon={Key}
      title={t.aiProvider}
      description={t.aiProviderDescription}
    >
      <ProviderToggle value={provider} onChange={(v) => void handleProviderChange(v)} t={t} />

      {provider === 'anthropic' ? (
        <>
          <ClaudeCliStatusBox t={t} />
          <div className="space-y-5">
            <div>
              <ApiKeyField
                label={t.anthropicClaude}
                placeholder={t.apiKeyPlaceholder}
                fieldKey="anthropicApiKey"
                hint={t.usedForAiCategorization}
                docHref="https://console.anthropic.com"
                onToast={onToast}
                testProvider="anthropic"
                ti18n={t}
              />
              <ModelSelector
                models={ANTHROPIC_MODELS}
                settingKey="anthropicModel"
                defaultValue="claude-haiku-4-5-20251001"
                onToast={onToast}
                t={t}
              />
              <p className="text-xs text-zinc-500 mt-1.5">{t.appliesToAllAiOps}</p>
            </div>
          </div>
        </>
      ) : (
        <>
          <CodexCliStatusBox t={t} />
          <div className="space-y-5">
            <div>
              <ApiKeyField
                label={t.openaiGpt}
                placeholder="sk-..."
                fieldKey="openaiApiKey"
                hint={t.usedForAiCategorization}
                docHref="https://platform.openai.com/api-keys"
                onToast={onToast}
                testProvider="openai"
                ti18n={t}
              />
              <ModelSelector
                models={OPENAI_MODELS}
                settingKey="openaiModel"
                defaultValue="gpt-4.1-mini"
                onToast={onToast}
                t={t}
              />
              <p className="text-xs text-zinc-500 mt-1.5">{t.appliesToAllAiOps}</p>
            </div>
          </div>
        </>
      )}
      <p className="text-xs text-zinc-600 mt-4">{t.keysStoredPlaintext} (<code className="font-mono">prisma/dev.db</code>). {t.doNotExposeDatabase}</p>
    </Section>
  )
}

function ExportButton({
  label,
  href,
  description,
}: {
  label: string
  href: string
  description: string
}) {
  return (
    <button
      onClick={() => {
        window.location.href = href
      }}
      className="flex flex-col items-start gap-1 p-4 rounded-xl bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 hover:border-zinc-600 transition-all duration-200 text-left group w-full"
    >
      <div className="flex items-center gap-2">
        <Download size={14} className="text-zinc-400 group-hover:text-zinc-200 transition-colors" />
        <span className="text-sm font-medium text-zinc-300 group-hover:text-zinc-100 transition-colors">
          {label}
        </span>
      </div>
      <p className="text-xs text-zinc-600">{description}</p>
    </button>
  )
}

function DataSection({ t }: { t: ReturnType<typeof useI18n>['t'] }) {
  return (
    <Section
      icon={Database}
      title={t.dataManagement}
      description={t.dataManagementDescription}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ExportButton
          label={t.exportAsCsv}
          href="/api/export?type=csv"
          description={t.spreadsheetCompatible}
        />
        <ExportButton
          label={t.exportAsJson}
          href="/api/export?type=json"
          description={t.fullDataWithFields}
        />
      </div>
    </Section>
  )
}

function DangerZoneSection({ onToast, t }: { onToast: (t: Toast) => void; t: ReturnType<typeof useI18n>['t'] }) {
  const [confirming, setConfirming] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [cleared, setCleared] = useState(false)

  async function handleClearAll() {
    setClearing(true)
    try {
      const res = await fetch('/api/bookmarks', { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        throw new Error(data.error ?? 'Failed to clear')
      }
      onToast({ type: 'success', message: t.allBookmarksDeleted })
      setConfirming(false)
      setCleared(true)
      setTimeout(() => setCleared(false), 3000)
      window.dispatchEvent(new CustomEvent('siftly:cleared'))
    } catch (err) {
      onToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to clear bookmarks' })
    } finally {
      setClearing(false)
    }
  }

  return (
    <Section
      icon={Shield}
      title={t.dangerZone}
      description={t.dangerZoneDescription}
      variant="danger"
    >
      <div className="flex items-center justify-between p-4 rounded-xl bg-red-900/20 border border-red-800/40">
        <div>
          <p className="text-sm font-medium text-zinc-300">{t.clearAllBookmarks}</p>
          <p className="text-xs text-zinc-500 mt-0.5">{t.permanentlyDeleteBookmarks}</p>
        </div>
        {cleared ? (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
            <Check size={14} />
            {t.cleared}
          </div>
        ) : !confirming ? (
          <button
            onClick={() => setConfirming(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-red-400 bg-red-800/30 hover:bg-red-700/40 border border-red-700/50 hover:border-red-600/60 transition-all"
          >
            <Trash2 size={14} />
            {t.clearAll}
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400 mr-1">{t.areYouSure}</span>
            <button
              onClick={() => setConfirming(false)}
              disabled={clearing}
              className="px-3 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              {t.cancel}
            </button>
            <button
              onClick={() => void handleClearAll()}
              disabled={clearing}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Trash2 size={12} />
              {clearing ? t.deleting : t.yesDeleteAll}
            </button>
          </div>
        )}
      </div>
    </Section>
  )
}

const TECH_STACK = [
  { label: 'Next.js 15', color: 'bg-zinc-800 text-zinc-300 border-zinc-700' },
  { label: 'Prisma + SQLite', color: 'bg-zinc-800 text-zinc-300 border-zinc-700' },
  { label: 'Anthropic / OpenAI', color: 'bg-blue-500/10 text-blue-300 border-blue-500/20' },
  { label: 'React Flow', color: 'bg-zinc-800 text-zinc-300 border-zinc-700' },
  { label: 'Tailwind CSS', color: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20' },
]

const DONATION_ADDRESS = '0xcF10B967a9e422753812004Cd59990f62E360760'

function AboutSection({ t }: { t: ReturnType<typeof useI18n>['t'] }) {
  const [copied, setCopied] = useState(false)

  function copyAddress() {
    void navigator.clipboard.writeText(DONATION_ADDRESS).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <Section icon={Info} title={t.about} description={t.aboutDescription}>
      <p className="text-sm text-zinc-400 leading-relaxed mb-5">
        <strong className="text-zinc-100 font-semibold">Siftly</strong> {t.siftlyAboutDetail}
      </p>

      {/* Builder + support row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Built by */}
        <a
          href="https://x.com/viperr"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50 hover:border-zinc-600 hover:bg-zinc-800 transition-all group flex-1"
        >
          <span className="text-base leading-none">𝕏</span>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-zinc-200 group-hover:text-white transition-colors">@viperr</p>
            <p className="text-[11px] text-zinc-600">{t.builtBy}</p>
          </div>
          <ExternalLink size={12} className="text-zinc-600 group-hover:text-zinc-400 transition-colors ml-auto shrink-0" />
        </a>

        {/* Donate */}
        <div className="flex-1 px-4 py-3 rounded-xl bg-amber-500/8 border border-amber-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Coffee size={13} className="text-amber-400 shrink-0" />
            <span className="text-xs font-semibold text-amber-300">{t.supportDevelopment}</span>
          </div>
          <p className="text-[11px] text-zinc-500 mb-2.5 leading-relaxed">
            {t.ifSiftlySavesYouTime}
          </p>
          <button
            onClick={copyAddress}
            className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-zinc-900/60 border border-amber-500/20 hover:border-amber-500/50 hover:bg-zinc-900 transition-all group"
          >
            <span className="text-[10px] font-mono text-zinc-400 group-hover:text-zinc-200 transition-colors truncate">
              {DONATION_ADDRESS}
            </span>
            {copied
              ? <Check size={13} className="text-emerald-400 shrink-0" />
              : <Copy size={13} className="text-zinc-600 group-hover:text-amber-400 transition-colors shrink-0" />
            }
          </button>
          {copied && (
            <p className="text-[10px] text-emerald-400 mt-1.5 text-center">{t.addressCopied}</p>
          )}
        </div>
      </div>
    </Section>
  )
}

function XOAuthSection({ onToast, t }: { onToast: (t: Toast) => void; t: ReturnType<typeof useI18n>['t'] }) {
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [savedId, setSavedId] = useState<string | null>(null)
  const [savedSecret, setSavedSecret] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d: Record<string, unknown>) => {
        if (d.hasXOAuth && d.xOAuthClientId) setSavedId(d.xOAuthClientId as string)
        if (d.xOAuthClientSecret) setSavedSecret(d.xOAuthClientSecret as string)
      })
      .catch(() => {})
  }, [])

  async function handleSave() {
    if (!clientId.trim()) {
      onToast({ type: 'error', message: `${t.clientId} ${t.error}` })
      return
    }
    setSaving(true)
    try {
      const payload: Record<string, string> = { xOAuthClientId: clientId.trim() }
      if (clientSecret.trim()) payload.xOAuthClientSecret = clientSecret.trim()
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(data.error ?? t.error)
      }
      setSavedId(clientId.trim().slice(0, 6) + '••••' + clientId.trim().slice(-4))
      if (clientSecret.trim()) setSavedSecret(clientSecret.trim().slice(0, 4) + '••••')
      setClientId('')
      setClientSecret('')
      onToast({ type: 'success', message: t.credentialsSaved })
    } catch (err) {
      onToast({ type: 'error', message: err instanceof Error ? err.message : t.failedToSaveOAuth })
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove() {
    try {
      await fetch('/api/settings', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'x_oauth_client_id' }),
      })
      await fetch('/api/settings', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'x_oauth_client_secret' }),
      })
      setSavedId(null)
      setSavedSecret(null)
      onToast({ type: 'success', message: t.credentialsRemoved })
    } catch (err) {
      onToast({ type: 'error', message: err instanceof Error ? err.message : t.failedToRemoveOAuth })
    }
  }

  const callbackUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/import/x-oauth/callback`
    : '/api/import/x-oauth/callback'

  return (
    <Section
      icon={Shield}
      title={t.xOAuth}
      description={t.xOAuthDescription}
    >
      <div className="space-y-4">
        {savedId ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-emerald-500/8 border border-emerald-500/20">
              <div className="flex items-center gap-2.5">
                <Check size={15} className="text-emerald-400 shrink-0" />
                <div className="text-sm">
                  <span className="text-emerald-300">{t.clientId}: </span>
                  <span className="text-zinc-400 font-mono text-xs">{savedId}</span>
                  {savedSecret && (
                    <>
                      <span className="text-zinc-600 mx-2">·</span>
                      <span className="text-emerald-300">{t.clientSecret}: </span>
                      <span className="text-zinc-400 font-mono text-xs">{savedSecret}</span>
                    </>
                  )}
                </div>
              </div>
              <button
                onClick={handleRemove}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                title={t.remove}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2">
              <input
                type="text"
                placeholder={t.clientId}
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 font-mono"
              />
              <input
                type="password"
                placeholder={t.clientSecretOptional}
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 font-mono"
              />
            </div>
            <button
              onClick={handleSave}
              disabled={saving || !clientId.trim()}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Key size={14} />}
              {saving ? t.saving : t.saveOAuthCredentials}
            </button>
          </div>
        )}

        <div className="text-xs text-zinc-600 space-y-1">
          <p>
            {t.getCredentialsFrom}{' '}
            <a href="https://developer.x.com/en/portal/dashboard" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">
              {t.xDeveloperPortal}
            </a>
          </p>
          <p>
            {t.callbackUrl} <code className="bg-zinc-800 px-1.5 py-0.5 rounded font-mono text-zinc-400">{callbackUrl}</code>
          </p>
        </div>
      </div>
    </Section>
  )
}

function BirdCliSection({ onToast, t }: { onToast: (t: Toast) => void; t: ReturnType<typeof useI18n>['t'] }) {
  const [authToken, setAuthToken] = useState('')
  const [ct0, setCt0] = useState('')
  const [savedToken, setSavedToken] = useState<string | null>(null)
  const [savedCt0, setSavedCt0] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d: Record<string, unknown>) => {
        if (d.hasBirdCredentials) {
          setSavedToken('********')
          setSavedCt0('********')
        }
      })
      .catch(() => {})
  }, [])

  async function handleSave() {
    if (!authToken.trim() || !ct0.trim()) {
      onToast({ type: 'error', message: `${t.birdAuthToken} & ${t.birdCt0} ${t.error}` })
      return
    }
    setSaving(true)
    try {
      const res1 = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ xBirdAuthToken: authToken.trim() }),
      })
      if (!res1.ok) throw new Error('Failed to save auth_token')
      const res2 = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ xBirdCt0: ct0.trim() }),
      })
      if (!res2.ok) throw new Error('Failed to save ct0')
      setSavedToken(authToken.trim().slice(0, 6) + '••••••••' + authToken.trim().slice(-4))
      setSavedCt0(ct0.trim().slice(0, 4) + '••••••••' + ct0.trim().slice(-4))
      setAuthToken('')
      setCt0('')
      onToast({ type: 'success', message: t.birdCredentialsSaved })
    } catch (err) {
      onToast({ type: 'error', message: err instanceof Error ? err.message : t.error })
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove() {
    setRemoving(true)
    try {
      await fetch('/api/settings', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'x_bird_auth_token' }),
      })
      await fetch('/api/settings', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'x_bird_ct0' }),
      })
      setSavedToken(null)
      setSavedCt0(null)
      onToast({ type: 'success', message: t.credentialsRemoved })
    } catch (err) {
      onToast({ type: 'error', message: err instanceof Error ? err.message : t.error })
    } finally {
      setRemoving(false)
    }
  }

  return (
    <Section
      icon={Terminal}
      title={t.birdCli}
      description={t.birdCliDescription}
    >
      <div className="space-y-4">
        {savedToken ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-emerald-500/8 border border-emerald-500/20">
              <div className="flex items-center gap-2.5">
                <Check size={15} className="text-emerald-400 shrink-0" />
                <div className="text-sm">
                  <span className="text-emerald-300">{t.birdAuthToken}: </span>
                  <span className="text-zinc-400 font-mono text-xs">{savedToken}</span>
                  <span className="text-zinc-600 mx-2">·</span>
                  <span className="text-emerald-300">{t.birdCt0}: </span>
                  <span className="text-zinc-400 font-mono text-xs">{savedCt0}</span>
                </div>
              </div>
              <button
                onClick={() => void handleRemove()}
                disabled={removing}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                title={t.remove}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2">
              <input
                type="password"
                placeholder={t.birdAuthToken}
                value={authToken}
                onChange={(e) => setAuthToken(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 font-mono"
              />
              <p className="text-xs text-zinc-600 -mt-1">{t.birdAuthTokenHint}</p>
              <input
                type="password"
                placeholder={t.birdCt0}
                value={ct0}
                onChange={(e) => setCt0(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 font-mono"
              />
              <p className="text-xs text-zinc-600 -mt-1">{t.birdCt0Hint}</p>
            </div>
            <button
              onClick={() => void handleSave()}
              disabled={saving || !authToken.trim() || !ct0.trim()}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Key size={14} />}
              {saving ? t.saving : t.save}
            </button>
          </div>
        )}
      </div>
    </Section>
  )
}

function GithubPatSection({ onToast, t }: { onToast: (t: Toast) => void; t: ReturnType<typeof useI18n>['t'] }) {
  const [pat, setPat] = useState('')
  const [showPat, setShowPat] = useState(false)
  const [savedPat, setSavedPat] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d: Record<string, unknown>) => {
        if (d.hasGithubToken && d.githubPersonalAccessToken) {
          setSavedPat((d.githubPersonalAccessToken as string).slice(0, 6) + '••••••••' + (d.githubPersonalAccessToken as string).slice(-4))
        }
      })
      .catch(() => {})
  }, [])

  async function handleSave() {
    if (!pat.trim()) {
      onToast({ type: 'error', message: `${t.githubPat} ${t.error}` })
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ githubPersonalAccessToken: pat.trim() }),
      })
      if (!res.ok) throw new Error('Failed to save')
      setSavedPat(pat.trim().slice(0, 6) + '••••••••' + pat.trim().slice(-4))
      setPat('')
      onToast({ type: 'success', message: `${t.githubPat} ${t.saved}` })
    } catch (err) {
      onToast({ type: 'error', message: err instanceof Error ? err.message : t.error })
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove() {
    setRemoving(true)
    try {
      await fetch('/api/settings', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'github_personal_access_token' }),
      })
      setSavedPat(null)
      onToast({ type: 'success', message: `${t.githubPat} ${t.remove}` })
    } catch (err) {
      onToast({ type: 'error', message: err instanceof Error ? err.message : t.error })
    } finally {
      setRemoving(false)
    }
  }

  return (
    <Section
      icon={Github}
      title={t.githubPat}
      description={t.githubPatDescription}
    >
      <div className="space-y-4">
        {savedPat ? (
          <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-emerald-500/8 border border-emerald-500/20">
            <div className="flex items-center gap-2.5">
              <Check size={15} className="text-emerald-400 shrink-0" />
              <span className="text-sm text-zinc-400 font-mono text-xs">{savedPat}</span>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="https://github.com/settings/tokens/new?scopes=repo&description=Siftly"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                {t.getKey} <ExternalLink size={10} />
              </a>
              <button
                onClick={() => void handleRemove()}
                disabled={removing}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                title={t.remove}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-2.5">
              <div className="relative flex-1">
                <input
                  type={showPat ? 'text' : 'password'}
                  value={pat}
                  onChange={(e) => setPat(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && void handleSave()}
                  placeholder="ghp_..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder:text-zinc-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all duration-200 pr-10 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPat((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showPat ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <button
                onClick={() => void handleSave()}
                disabled={saving || !pat.trim()}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors shrink-0"
              >
                {saving ? t.saving : t.save}
              </button>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-zinc-600">{t.githubPatHint}</p>
              <a
                href="https://github.com/settings/tokens/new?scopes=repo&description=Siftly"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-400 transition-colors"
              >
                {t.getKey} <ExternalLink size={11} />
              </a>
            </div>
          </div>
        )}
      </div>
    </Section>
  )
}

export default function SettingsPage() {
  const [toast, setToast] = useState<Toast | null>(null)
  const { t, language, setLanguage } = useI18n()

  function showToast(t: Toast) {
    setToast(t)
    setTimeout(() => setToast(null), 4000)
  }

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto">

      {/* Page Header */}
      <div className="mb-8">
        <p className="text-xs text-zinc-500 uppercase tracking-widest font-medium mb-1">{t.configuration}</p>
        <h1 className="text-2xl font-bold text-zinc-100">{t.settingsTitle}</h1>
        <p className="text-zinc-400 mt-1 text-sm">{t.settingsDescription}</p>
      </div>

      {/* Toast */}
      {toast && (
        <div className="mb-6">
          <ToastAlert toast={toast} />
        </div>
      )}

      <div className="space-y-4">
        {/* Appearance Section - Language & Theme */}
        <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 hover:border-zinc-700 transition-all">
          <div className="flex items-start gap-3 mb-5">
            <div className="p-2.5 rounded-xl bg-indigo-500/10">
              <Globe size={16} className="text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-100">{t.appearance}</h2>
              <p className="text-sm text-zinc-500 mt-0.5">{t.languageDescription}</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Language Selector */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-300">{t.language}</p>
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
              </div>
              <ThemeToggle />
            </div>
          </div>
        </div>

        <ApiKeySection onToast={showToast} t={t} />
        <XOAuthSection onToast={showToast} t={t} />
        <BirdCliSection onToast={showToast} t={t} />
        <GithubPatSection onToast={showToast} t={t} />
        <DataSection t={t} />
        <DangerZoneSection onToast={showToast} t={t} />
        <AboutSection t={t} />
      </div>
    </div>
  )
}

function ThemeToggle() {
  const { t } = useI18n()
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
    >
      {isDark ? <Sun size={14} className="text-zinc-400" /> : <Moon size={14} className="text-zinc-400" />}
      <span className="text-xs text-zinc-400">{isDark ? t.darkMode : t.lightMode}</span>
    </button>
  )
}
