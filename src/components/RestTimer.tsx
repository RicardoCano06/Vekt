import { useEffect, useRef, useState } from 'react'
import { useRestTimer } from '@/components/TimerContext'
import { useLang } from '@/lib/lang-context'

const QUICK_OPTIONS = [60, 90, 120, 180]

export default function RestTimer() {
  const { running, remaining, total, start, extend, stop, finished } = useRestTimer()
  const { t } = useLang()
  const [announcement, setAnnouncement] = useState('')
  const lastFinished = useRef(finished)

  useEffect(() => {
    if (finished === lastFinished.current) return
    lastFinished.current = finished
    setAnnouncement(t('rest.finished'))
    const timer = window.setTimeout(() => setAnnouncement(''), 5000)
    return () => window.clearTimeout(timer)
  }, [finished, t])

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0')
  const ss = String(remaining % 60).padStart(2, '0')
  const progress = total > 0 ? remaining / total : 0
  const urgent = running && remaining <= 10

  return (
    <div className="rounded-xl border border-edge bg-surface px-3 py-2.5">
      <span className="sr-only" role="status" aria-live="polite">
        {announcement}
      </span>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-medium text-dim2">{t('rest.title')}</p>
          <div className="mt-0.5 flex items-baseline gap-2">
            <p
              className={
                running
                  ? `font-mono text-lg font-semibold tabular-nums ${urgent ? 'text-rose-400' : 'text-strong'}`
                  : 'text-sm font-medium text-soft'
              }
            >
              {running ? `${mm}:${ss}` : t('rest.ready')}
            </p>
            {running && (
              <span className="text-[11px] text-dim2">
                {urgent ? t('rest.working') : t('rest.resting')}
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {!running ? (
            QUICK_OPTIONS.map((seconds) => (
              <button
                key={seconds}
                type="button"
                onClick={() => start(seconds)}
                className="min-h-9 rounded-lg bg-surface2 px-2.5 font-mono text-[11px] font-medium text-soft transition-colors hover:bg-surface3 hover:text-strong"
              >
                {seconds / 60}m
              </button>
            ))
          ) : (
            <>
              <button
                type="button"
                onClick={extend}
                className="min-h-9 rounded-lg bg-surface2 px-2.5 text-[11px] font-medium text-soft transition-colors hover:bg-surface3 hover:text-strong"
              >
                +30s
              </button>
              <button
                type="button"
                onClick={stop}
                className="min-h-9 rounded-lg bg-surface2 px-2.5 text-[11px] font-medium text-soft transition-colors hover:bg-rose-500/15 hover:text-rose-400"
              >
                {t('rest.stop')}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-surface2">
        <div
          className={`h-full origin-left rounded-full transition-transform duration-300 ease-linear ${
            urgent ? 'bg-rose-400' : 'bg-emerald-500'
          }`}
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>
    </div>
  )
}
