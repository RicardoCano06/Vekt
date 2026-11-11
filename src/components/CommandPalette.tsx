import { useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ChartNoAxesColumn,
  Clock,
  CornerDownLeft,
  Dumbbell,
  House,
  List,
  Search,
  UserRound,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useModalFocus } from '@/hooks/useModalFocus'
import { useLang } from '@/lib/lang-context'

interface Command {
  id: string
  label: string
  to: string
  icon: LucideIcon
}

function Palette({ onClose }: { onClose: () => void }) {
  const { t } = useLang()
  const navigate = useNavigate()
  const baseId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)

  useModalFocus({ onClose, panelRef, initialFocusRef: inputRef })

  const commands: Command[] = [
    { id: 'home', label: t('nav.home'), to: '/', icon: House },
    { id: 'routines', label: t('nav.routines'), to: '/rutinas', icon: List },
    { id: 'exercises', label: t('nav.exercises'), to: '/ejercicios', icon: Dumbbell },
    { id: 'history', label: t('nav.history'), to: '/historial', icon: Clock },
    { id: 'stats', label: t('nav.stats'), to: '/estadisticas', icon: ChartNoAxesColumn },
    { id: 'profile', label: t('nav.profile'), to: '/perfil', icon: UserRound },
  ]

  const normalized = query.trim().toLowerCase()
  const filtered = commands.filter((command) => command.label.toLowerCase().includes(normalized))
  const results: Command[] = normalized
    ? [
        {
          id: 'search',
          label: t('command.search', { q: query.trim() }),
          to: `/ejercicios?q=${encodeURIComponent(query.trim())}`,
          icon: Search,
        },
        ...filtered,
      ]
    : filtered

  const selectedIndex = results.length === 0 ? -1 : Math.min(index, results.length - 1)

  function move(delta: number) {
    if (results.length === 0) return
    setIndex((current) => {
      const next = Math.min(Math.max(current + delta, 0), results.length - 1)
      return next
    })
  }

  function open(command: Command) {
    onClose()
    navigate(command.to)
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/65 px-4 pb-4 pt-[12vh] backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${baseId}-title`}
        tabIndex={-1}
        className="ui-card ui-card-cut w-full max-w-xl overflow-hidden shadow-[0_28px_80px_-30px_rgba(0,0,0,0.9)]"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={`${baseId}-title`} className="sr-only">
          {t('command.title')}
        </h2>

        <div className="flex items-center gap-2 border-b border-edge px-4">
          <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-dim2" strokeWidth={1.8} />
          <input
            ref={inputRef}
            role="combobox"
            aria-expanded="true"
            aria-controls={`${baseId}-list`}
            aria-activedescendant={
              selectedIndex >= 0 ? `${baseId}-option-${selectedIndex}` : undefined
            }
            aria-autocomplete="list"
            name="command"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setIndex(0)
            }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault()
                move(1)
              } else if (event.key === 'ArrowUp') {
                event.preventDefault()
                move(-1)
              } else if (event.key === 'Enter' && selectedIndex >= 0) {
                event.preventDefault()
                open(results[selectedIndex])
              }
            }}
            placeholder={t('command.placeholder')}
            className="h-14 flex-1 bg-transparent text-sm text-strong outline-none placeholder:text-dim3"
          />
          <kbd className="rounded border border-edge bg-surface2 px-1.5 py-0.5 font-mono text-[9px] text-dim2">
            esc
          </kbd>
        </div>

        <div
          id={`${baseId}-list`}
          role="listbox"
          aria-label={t('command.title')}
          className="max-h-[min(22rem,50dvh)] overflow-y-auto p-2"
        >
          {results.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-dim2">{t('command.empty')}</p>
          ) : (
            results.map((command, i) => {
              const Icon = command.icon
              const active = i === selectedIndex
              return (
                <button
                  key={command.id}
                  id={`${baseId}-option-${i}`}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onMouseEnter={() => setIndex(i)}
                  onClick={() => open(command)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                    active
                      ? 'bg-surface2 text-strong'
                      : 'text-dim hover:bg-surface2/60 hover:text-high'
                  }`}
                >
                  <Icon
                    aria-hidden="true"
                    strokeWidth={1.8}
                    className={active ? 'h-4 w-4 text-emerald-400' : 'h-4 w-4 text-dim2'}
                  />
                  <span className="min-w-0 flex-1 truncate">{command.label}</span>
                  {active && (
                    <CornerDownLeft aria-hidden="true" className="h-3.5 w-3.5 text-dim2" />
                  )}
                </button>
              )
            })
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-edge px-4 py-2 font-mono text-[9px] uppercase tracking-[0.08em] text-dim3">
          <span>↑↓ {t('command.navigate')}</span>
          <span>↵ {t('command.open')}</span>
          <span>esc {t('command.close')}</span>
          <span className="ml-auto normal-case tracking-normal text-dim2">⌘K</span>
        </div>
      </div>
    </div>
  )
}

export default function CommandPalette({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  if (!open) return null
  return createPortal(<Palette onClose={onClose} />, document.body)
}
