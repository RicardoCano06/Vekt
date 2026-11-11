import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '@/components/PageHeader'
import { useCountUp } from '@/hooks/useCountUp'
import { formatWeight } from '@/lib/format'
import { useAuth } from '@/lib/auth-context'
import {
  countSessionsSince,
  fetchActiveSession,
  fetchBodyMetrics,
  fetchSuggestedSession,
  fetchWeeklyMuscleVolume,
} from '@/lib/db'
import type { MuscleVolume, SuggestedSession } from '@/lib/db'
import type { Session } from '@/lib/types'
import { useLang } from '@/lib/lang-context'

const TARGET_SETS = 10
const WEEK_MS = 7 * 24 * 60 * 60 * 1000

function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`shimmer relative overflow-hidden rounded-2xl border border-edge bg-surface ${className}`} />
  )
}

function Icon({ children }: { children: React.ReactNode }) {
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

const PlayIcon = (
  <Icon>
    <path d="M6 4v16l14-8z" />
  </Icon>
)

export default function Dashboard() {
  const { user } = useAuth()
  const { lang, t } = useLang()
  const [volume, setVolume] = useState<MuscleVolume[]>([])
  const [prevVolume, setPrevVolume] = useState<MuscleVolume[]>([])
  const [sessionsCount, setSessionsCount] = useState(0)
  const [prevSessionsCount, setPrevSessionsCount] = useState(0)
  const [next, setNext] = useState<SuggestedSession | null>(null)
  const [activeSession, setActiveSession] = useState<Session | null>(null)
  const [lastWeight, setLastWeight] = useState<{ weight: number; date: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const loadingRef = useRef(false)

  const weekStart = useMemo(() => {
    const now = new Date()
    const day = now.getDay()
    const diff = day === 0 ? -6 : 1 - day
    const monday = new Date(now)
    monday.setDate(now.getDate() + diff)
    monday.setHours(0, 0, 0, 0)
    return monday
  }, [])

  const lastWeekStart = useMemo(
    () => new Date(weekStart.getTime() - WEEK_MS),
    [weekStart],
  )

  const load = useCallback(async () => {
      if (!user || loadingRef.current) return
      loadingRef.current = true
      try {
        const [v, pv, s, ps, n, act, metrics] = await Promise.all([
          fetchWeeklyMuscleVolume(user.id, weekStart.toISOString()),
          fetchWeeklyMuscleVolume(user.id, lastWeekStart.toISOString()),
          countSessionsSince(user.id, weekStart.toISOString()),
          countSessionsSince(user.id, lastWeekStart.toISOString()),
          fetchSuggestedSession(user.id),
          fetchActiveSession(user.id),
          fetchBodyMetrics(user.id, 1),
        ])
        setVolume(v)
        setPrevVolume(pv)
        setSessionsCount(s)
        setPrevSessionsCount(ps)
        setNext(n)
        setActiveSession(act)
        setLastWeight(
          metrics[0]?.weight_kg != null
            ? { weight: metrics[0].weight_kg, date: metrics[0].date }
            : null,
        )
      } catch (err) {
        console.error(err)
      } finally {
        loadingRef.current = false
        setLoading(false)
      }
    },
    [user, weekStart, lastWeekStart],
  )

  useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect
    void load()
  }, [load])

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void load()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [load])

  const totalSets = volume.reduce((acc, m) => acc + m.sets, 0)
  const prevTotalSets = prevVolume.reduce((acc, m) => acc + m.sets, 0)
  const todayStr = new Date().toISOString().slice(0, 10)

  const nextDayId = activeSession?.day_id ?? next?.dayId ?? null

  const lastTrainedLabel = (iso: string | null) => {
    if (!iso) return t('dash.neverTrained')
    // eslint-disable-next-line react/purity
    const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
    if (days <= 0) return t('dash.trainedToday')
    if (days === 1) return t('dash.lastTrainYesterday')
    const relative = new Intl.RelativeTimeFormat(lang === 'en' ? 'en-US' : 'es-AR', {
      numeric: 'auto',
    }).format(-days, 'day')
    return t('dash.lastTrainRelative', { relative })
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        index="01"
        eyebrow={t('nav.home')}
        title={t('dash.summary')}
        description={t('common.week', {
          date: weekStart.toLocaleDateString(lang === 'en' ? 'en-US' : 'es-AR', {
            day: 'numeric',
            month: 'long',
          }),
        })}
        action={
          lastWeight ? (
            <Link
              to="/perfil"
              className="block rounded-sm border border-edge bg-surface px-2.5 py-1.5 text-right font-mono text-[10px] leading-tight text-dim2 transition-colors hover:border-emerald-500/40 hover:text-high"
            >
              <span className="block text-sm font-medium text-soft">
                {formatWeight(lastWeight.weight, lang)}
                <span className="ml-0.5 text-dim2">kg</span>
              </span>
              <span className="block">
                {lastWeight.date === todayStr ? t('dash.todayTag') : t('dash.lastWeightLabel')}
              </span>
            </Link>
          ) : undefined
        }
      />

      {loading ? (
        <div role="status" aria-busy="true" aria-live="polite" className="space-y-4">
          <span className="sr-only">{t('common.loading')}</span>
          <Skeleton className="h-28" />
          <div className="grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
          <Skeleton className="h-72" />
        </div>
      ) : (
        <div className="space-y-4">
          {nextDayId ? (
            <section className="ui-card ui-card-cut border-l-2 border-l-emerald-500 p-4 sm:p-5">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                  {activeSession ? t('dash.sessionActive') : t('dash.suggestion')}
                </span>
              </div>
              <h2 className="mt-3 font-display text-[24px] font-semibold leading-[0.98] tracking-[-0.04em] text-strong">
                {activeSession
                  ? next?.dayId === activeSession.day_id
                    ? next.dayName
                    : t('dash.resumeWhere')
                  : next?.dayName}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-dim">
                {activeSession
                  ? t('dash.activeSessionNote')
                  : `${next?.routineName} · ${lastTrainedLabel(next?.lastTrainedAt ?? null)}`}
              </p>
              <Link
                to={`/entrenar/${nextDayId}`}
                className="ui-button-primary mt-5 w-full sm:w-auto"
              >
                {PlayIcon}
                {activeSession ? t('dash.resume') : t('dash.train')}
              </Link>
            </section>
          ) : (
            <section className="ui-card p-4 sm:p-5">
              <h2 className="font-semibold text-strong">{t('dash.noSuggested')}</h2>
              <p className="mt-1 text-sm text-dim">{t('dash.noSuggestedHint')}</p>
              <Link to="/rutinas" className="ui-button-primary mt-4 w-full sm:w-auto">
                {t('dash.goRoutines')}
              </Link>
            </section>
          )}

          {sessionsCount === 0 ? (
            <div className="rounded-2xl border border-dashed border-edge2 px-5 py-8 text-center">
              <p className="font-medium text-high">{t('dash.noTrainWeek')}</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-dim">{t('dash.noTrainWeekHint')}</p>
            </div>
          ) : (
            <>
              <div className="ui-card ui-card-cut grid grid-cols-3 divide-x divide-edge">
                <StatCard
                  label={t('dash.sessionsDone')}
                  value={sessionsCount}
                  delta={sessionsCount - prevSessionsCount}
                />
                <StatCard
                  label={t('dash.totalSets')}
                  value={totalSets}
                  delta={totalSets - prevTotalSets}
                />
                <StatCard label={t('dash.groupsWorked')} value={volume.length} />
              </div>

              <section className="ui-card">
                <div className="px-4 pb-1 pt-4 sm:px-5">
                  <h2 className="font-display text-base font-semibold text-strong">{t('dash.volumeByGroup')}</h2>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-dim2">
                    {t('dash.targetHint', { n: TARGET_SETS })}
                  </p>
                </div>
                {volume.length === 0 ? (
                  <p className="px-4 pb-4 pt-2 text-sm text-dim sm:px-5">{t('dash.noVolume')}</p>
                ) : (
                  <ul className="grid gap-x-8 px-4 pb-2 pt-1 sm:grid-cols-2 sm:px-5">
                    {volume.map((m, index) => {
                      const pct = Math.min(100, (m.sets / TARGET_SETS) * 100)
                      const reached = m.sets >= TARGET_SETS
                      return (
                        <li key={m.group_name} className="border-b border-edge/60 py-3 last:border-0">
                          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                            <span className="flex items-baseline gap-2 font-medium capitalize text-high">
                              <span className="font-mono text-[10px] text-dim3">
                                {String(index + 1).padStart(2, '0')}
                              </span>
                              {t(`group.${m.group_name}`)}
                            </span>
                            <span
                              className={`shrink-0 tabular-nums ${
                                reached ? 'text-emerald-400' : 'text-amber-400'
                              }`}
                            >
                              {m.sets}/{TARGET_SETS}
                            </span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-surface2">
                            <div
                              className={`chart-bar-h h-full w-full rounded-full ${
                                reached ? 'bg-emerald-500' : 'bg-amber-400'
                              }`}
                              style={{ transform: `scaleX(${pct / 100})` }}
                            />
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </section>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  delta,
}: {
  label: string
  value: number
  delta?: number
}) {
  const { t } = useLang()
  const displayValue = useCountUp(value)
  return (
    <div className="min-w-0 p-3 sm:p-3.5">
      <p className="truncate font-mono text-[10px] uppercase leading-tight tracking-[0.08em] text-dim2">{label}</p>
      <p className="mt-1.5 font-display text-[26px] font-semibold leading-none tabular-nums text-strong">
        {displayValue}
      </p>
      {delta !== undefined && delta !== 0 && (
        <p
          className={`mt-1 text-[10px] font-medium ${
            delta > 0 ? 'text-emerald-400' : 'text-red-400'
          }`}
        >
          <span aria-hidden="true">{delta > 0 ? '▲' : '▼'}</span> {Math.abs(delta)}{' '}
          {t('dash.vsPrev')}
        </p>
      )}
    </div>
  )
}