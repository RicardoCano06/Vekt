import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import SyncStatus from '@/components/SyncStatus'
import HeaderStatus from '@/components/HeaderStatus'
import ThemeToggle from '@/components/ThemeToggle'
import LanguageToggle from '@/components/LanguageToggle'
import ScrollToTop from '@/components/ScrollToTop'
import { useLang } from '@/lib/lang-context'
import { useConfirm } from '@/lib/use-confirm'
import { logout } from '@/lib/auth'

const mainLinks = [
  { to: '/', key: 'nav.home', end: true, index: '01' },
  { to: '/rutinas', key: 'nav.routines', index: '02' },
  { to: '/ejercicios', key: 'nav.exercises', index: '03' },
  { to: '/historial', key: 'nav.history', index: '04' },
  { to: '/perfil', key: 'nav.profile', index: '06' },
]

const desktopLinks = [
  ...mainLinks.slice(0, 4),
  { to: '/estadisticas', key: 'nav.stats', index: '05' },
  mainLinks[4],
]

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-5 w-5"
    >
      {children}
    </svg>
  )
}

const HomeIcon = (
  <Icon>
    <path d="M3 10.5 12 3l9 7.5V21h-5.5v-6h-7v6H3z" />
  </Icon>
)
const DumbbellIcon = (
  <Icon>
    <path d="M6.5 6.5v11M17.5 6.5v11M3 9v6M21 9v6M6.5 12h11" />
  </Icon>
)
const ListIcon = (
  <Icon>
    <path d="M8 6h13M8 12h13M8 18h13" />
    <path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
  </Icon>
)
const ClockIcon = (
  <Icon>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Icon>
)
const ChartIcon = (
  <Icon>
    <path d="M3 20h18M5 20v-6M11 20V8M17 20v-10" />
  </Icon>
)
const UserIcon = (
  <Icon>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-3.9 3.6-6 8-6s8 2.1 8 6" />
  </Icon>
)

const icons: Record<string, ReactNode> = {
  '/': HomeIcon,
  '/ejercicios': DumbbellIcon,
  '/rutinas': ListIcon,
  '/historial': ClockIcon,
  '/estadisticas': ChartIcon,
  '/perfil': UserIcon,
}

function Brand() {
  return (
    <Link
      to="/"
      aria-label="Vekt"
      className="inline-flex items-center gap-2 text-strong"
    >
      <span className="font-display text-[15px] font-semibold tracking-[-0.06em]">
        VEKT
      </span>
      <span aria-hidden="true" className="h-1.5 w-1.5 rotate-45 bg-emerald-400" />
    </Link>
  )
}

function BottomNav() {
  const [keyboardOpen, setKeyboardOpen] = useState(false)
  const { t } = useLang()

  // En iOS Safari un elemento fixed queda flotando sobre el teclado y tapa el
  // campo enfocado. Ocultamos la barra mientras haya un control editable activo.
  useEffect(() => {
    const isEditable = (target: EventTarget | null) =>
      target instanceof Element && !!target.closest('input, textarea, select')
    const onFocusIn = (event: FocusEvent) => setKeyboardOpen(isEditable(event.target))
    const onFocusOut = (event: FocusEvent) => setKeyboardOpen(isEditable(event.relatedTarget))
    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('focusout', onFocusOut)
    return () => {
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('focusout', onFocusOut)
    }
  }, [])

  return (
    <nav
      aria-label={t('nav.mobile')}
      className={`dock fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 transition-transform duration-200 ease-out md:hidden ${
        keyboardOpen ? 'pointer-events-none translate-y-full' : ''
      }`}
    >
      <div className="grid h-16 grid-cols-5">
        {mainLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              `relative flex flex-col items-center justify-center gap-1 font-mono text-[9px] font-medium uppercase tracking-[0.06em] transition-colors duration-150 ${
                isActive ? 'text-emerald-400' : 'text-dim2 hover:text-high'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute top-0 h-0.5 w-7 origin-left animate-line bg-emerald-400"
                  />
                )}
                {icons[link.to]}
                <span className="max-w-full truncate px-1 leading-none">{t(link.key)}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

export default function Layout() {
  const location = useLocation()
  const { t } = useLang()
  const { ask, dialog } = useConfirm()

  const isTrainRoute = location.pathname.startsWith('/entrenar/')

  return (
    <div className="min-h-dvh bg-bg md:flex">
      <ScrollToTop />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-high focus:shadow-lg"
      >
        {t('common.skipToContent')}
      </a>

      <header className="sticky top-0 z-30 flex h-12 items-center gap-1 border-b border-edge bg-bg px-4 md:hidden">
        <Brand />
        <div className="ml-auto flex items-center gap-1">
          <Link
            to="/estadisticas"
            aria-label={t('nav.stats')}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-dim2 transition-colors hover:bg-surface2 hover:text-high"
          >
            {ChartIcon}
          </Link>
          <HeaderStatus />
        </div>
      </header>

      <nav
        aria-label={t('nav.primary')}
        className="hidden shrink-0 md:sticky md:top-0 md:flex md:h-dvh md:w-60 md:flex-col md:border-r md:border-edge md:bg-bg md:px-3 md:py-5"
      >
        <div className="px-3 pb-7">
          <Brand />
          <p className="mt-0.5 text-[11px] text-dim2">{t('nav.tagline')}</p>
        </div>

        <div className="flex flex-col gap-0.5">
          {desktopLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `relative flex min-h-10 items-center gap-3 rounded-sm px-3 text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? 'bg-surface2 text-strong'
                    : 'text-dim hover:bg-surface hover:text-high'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className="w-5 font-mono text-[9px] text-dim3">{link.index}</span>
                  <span className={isActive ? 'text-emerald-400' : 'text-dim2'}>
                    {icons[link.to]}
                  </span>
                  {t(link.key)}
                </>
              )}
            </NavLink>
          ))}
        </div>

        <div className="mt-auto flex flex-col gap-1 pt-8">
          <div className="flex items-center gap-1 px-3 pb-2">
            <LanguageToggle subtle />
            <ThemeToggle subtle />
          </div>
          <button
            type="button"
            onClick={() =>
              ask({
                title: t('profile.logoutTitle'),
                message: t('profile.logoutMessage'),
                confirmLabel: t('profile.logout'),
                danger: true,
                onConfirm: () => logout(),
              })
            }
            className="flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-dim transition-colors duration-150 hover:bg-red-500/10 hover:text-red-400"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="h-5 w-5"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            {t('profile.logout')}
          </button>
        </div>
      </nav>

      <main
        id="main"
        tabIndex={-1}
        className="mx-auto w-full max-w-[1180px] flex-1 px-4 pb-28 pt-5 md:px-8 md:py-8"
      >
        <div key={location.pathname} className="page-enter">
          <Outlet />
        </div>
      </main>

      {!isTrainRoute && <BottomNav />}

      <div className="fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] left-3 z-40 md:bottom-6 md:left-auto md:right-6">
        {!isTrainRoute && <SyncStatus />}
      </div>
      {dialog}
    </div>
  )
}
