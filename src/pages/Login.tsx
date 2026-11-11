import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { Navigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { useLang } from '@/lib/lang-context'
import { DEMO_EMAIL, DEMO_PASSWORD, enterLocalDemo, purgeDemoLocal } from '@/lib/demo'
import { resetDemoData } from '@/lib/demoData'
import { DEMO_LOCAL_EVENT } from '@/lib/auth'

const iconClass = 'h-[18px] w-[18px]'
const EnvelopeIcon = <Mail aria-hidden="true" strokeWidth={1.8} className={iconClass} />
const LockIcon = <Lock aria-hidden="true" strokeWidth={1.8} className={iconClass} />
const EyeIcon = <Eye aria-hidden="true" strokeWidth={1.8} className={iconClass} />
const EyeSlashIcon = <EyeOff aria-hidden="true" strokeWidth={1.8} className={iconClass} />

export default function Login() {
  const { user, loading } = useAuth()
  const { t } = useLang()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)

  if (loading) {
    return (
      <div role="status" aria-live="polite" className="flex min-h-dvh items-center justify-center gap-3 bg-bg">
        <div aria-hidden="true" className="h-8 w-8 animate-spin rounded-full border-2 border-edge2 border-t-emerald-500" />
        <span className="sr-only">{t('common.loading')}</span>
      </div>
    )
  }

  if (user) return <Navigate to="/" replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setSubmitting(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
          setError(translateError(error.message, t))
          emailRef.current?.focus()
        }
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) {
          setError(translateError(error.message, t))
          emailRef.current?.focus()
        } else {
          setMessage(t('login.accountCreated'))
        }
      }
    } finally {
      setSubmitting(false)
    }
  }

  // Acceso Demo Sandbox (1-Click):
  //   1) Purga local (incluye deleteDatabase('vekt-local')) -> lienzo en blanco.
  //   2) Si el despliegue configuró VITE_DEMO_PASSWORD, intenta el sign-in con
  //      la cuenta demo; si no hay password configurada o Supabase falla,
  //   3) cae al modo "Demo Puramente Local" (datos 100% en el dispositivo).
  async function handleDemo() {
    setError(null)
    setMessage(null)
    setSubmitting(true)
    await purgeDemoLocal()
    resetDemoData()
    try {
      if (!DEMO_PASSWORD) throw new Error('demo sin password configurada')
      const { error } = await supabase.auth.signInWithPassword({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
      })
      if (error) throw error
    } catch {
      enterLocalDemo()
      window.dispatchEvent(new CustomEvent(DEMO_LOCAL_EVENT))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-dvh bg-bg lg:grid lg:grid-cols-[1.05fr_minmax(0,1fr)]">
      <section className="relative hidden min-h-dvh flex-col justify-between overflow-hidden border-r border-edge px-10 py-10 lg:flex">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-dim2">
          <span className="h-1.5 w-1.5 rotate-45 bg-emerald-400" aria-hidden="true" />
          {t('login.system')} / 001
        </div>

        <div className="relative max-w-xl">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-28 h-64 w-64 rotate-45 border border-edge/70"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 top-10 h-24 w-24 rotate-45 border border-emerald-500/25"
          />
          <h1 className="relative font-display text-[clamp(5rem,9vw,8.5rem)] font-semibold leading-[0.78] tracking-[-0.08em] text-strong">
            VEKT<span className="text-emerald-400">.</span>
          </h1>
          <p className="relative mt-7 max-w-md text-[15px] leading-relaxed text-soft">
            {t('login.pitch')}
          </p>
          <div className="relative mt-6 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[10px] uppercase tracking-[0.12em] text-dim2">
            <span>01 / Registro</span>
            <span>02 / Volumen</span>
            <span>03 / Progreso</span>
          </div>
        </div>

        <div className="flex items-end justify-between gap-4 font-mono text-[10px] uppercase tracking-[0.16em] text-dim3">
          <span>{t('login.tagline')}</span>
          <span aria-hidden="true" className="h-px w-24 bg-emerald-500/40" />
        </div>
      </section>

      <section className="flex min-h-dvh flex-col justify-center px-5 py-10 sm:px-10">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-7 lg:hidden">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-dim2">
              <span className="h-1.5 w-1.5 rotate-45 bg-emerald-400" aria-hidden="true" />
              {t('login.system')} / 001
            </div>
            <h1 className="mt-3 font-display text-5xl font-semibold leading-[0.82] tracking-[-0.07em] text-strong">
              VEKT<span className="text-emerald-400">.</span>
              <span className="sr-only">{t('login.title')}</span>
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-dim">{t('login.pitch')}</p>
          </div>

          <div className="ui-card ui-card-cut animate-rise p-4 sm:p-5">
          <div
            role="group"
            aria-label={t('login.mode')}
            className="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-surface2 p-1"
          >
            {(['login', 'register'] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                onClick={() => {
                  setMode(m)
                  setError(null)
                  setMessage(null)
                }}
                className={`min-h-9 rounded-md text-sm font-medium transition-colors duration-150 ${
                  mode === m
                    ? 'bg-surface text-strong shadow-sm'
                    : 'text-dim2 hover:text-high'
                }`}
              >
                {m === 'login' ? t('login.signIn') : t('login.signUp')}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-dim">
                {t('login.email')}
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-dim2">
                  {EnvelopeIcon}
                </span>
                <input
                  ref={emailRef}
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  aria-invalid={!!error}
                  aria-describedby={error ? 'login-error' : undefined}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="ui-input pl-10"
                  placeholder="tu@email.com"
                />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-dim">
                {t('login.password')}
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-dim2">
                  {LockIcon}
                </span>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  aria-invalid={!!error}
                  aria-describedby={error ? 'login-error' : undefined}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="ui-input pl-10 pr-11"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                  aria-pressed={showPassword}
                  className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-dim2 transition-colors hover:text-high"
                >
                  {showPassword ? EyeSlashIcon : EyeIcon}
                </button>
              </div>
            </div>

            {error && (
              <p
                id="login-error"
                role="alert"
                className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400"
              >
                {error}
              </p>
            )}
            {message && (
              <p
                role="status"
                aria-live="polite"
                className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400"
              >
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="ui-button-primary w-full"
            >
              {submitting ? t('dialog.busy') : mode === 'login' ? t('login.signIn') : t('login.createAccount')}
            </button>
          </form>

          <div className="my-4 flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-edge" />
            <span className="text-[11px] text-dim3">{t('login.or')}</span>
            <span className="h-px flex-1 bg-edge" />
          </div>

          <button
            type="button"
            data-testid="demo-login"
            disabled={submitting}
            onClick={handleDemo}
            className="ui-button-secondary w-full"
          >
            {t('login.demo')}
          </button>
        </div>

          <p className="mt-3 text-center text-[11px] leading-relaxed text-dim3">
            {t('login.demoHint')}
          </p>
        </div>
      </section>
    </div>
  )
}

function translateError(
  message: string,
  t: (key: string) => string,
): string {
  if (message.toLowerCase().includes('invalid login credentials'))
    return t('login.err.invalidCredentials')
  if (message.toLowerCase().includes('email not confirmed'))
    return t('login.err.emailNotConfirmed')
  if (message.toLowerCase().includes('already registered'))
    return t('login.err.alreadyRegistered')
  if (message.toLowerCase().includes('password should be at least'))
    return t('login.err.passwordShort')
  return message
}