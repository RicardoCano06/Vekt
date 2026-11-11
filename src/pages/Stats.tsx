import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChartNoAxesColumn, Trophy } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/lib/toast-context'
import ErrorState from '@/components/ErrorState'
import PageHeader from '@/components/PageHeader'
import { ProgressChart } from '@/components/ProgressChart'
import { useCountUp } from '@/hooks/useCountUp'
import { formatShortDate, formatWeight } from '@/lib/format'
import {
  fetchExerciseProgress,
  fetchPRs,
  fetchSessions,
  fetchStreak,
  fetchWeeklyVolumeSeries,
} from '@/lib/db'
import type { ExerciseProgressEntry, PR, Streak, WeeklyVolumePoint } from '@/lib/db'
import type { Session } from '@/lib/types'
import { useLang } from '@/lib/lang-context'
import { displayName } from '@/lib/i18n'

const GROUP_COLORS = [
  '#a78bfa',
  '#f59e0b',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#f43f5e',
]

export default function Stats() {
  const { user } = useAuth()
  const { lang, t } = useLang()
  const [streak, setStreak] = useState<Streak | null>(null)
  const [volume, setVolume] = useState<WeeklyVolumePoint[]>([])
  const [prs, setPrs] = useState<PR[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    if (!user) return
    setLoading(true)
    setError(null)
    Promise.all([
      fetchStreak(user.id),
      fetchWeeklyVolumeSeries(user.id),
      fetchPRs(user.id),
      fetchSessions(user.id),
    ])
      .then(([s, v, p, ses]) => {
        setStreak(s)
        setVolume(v)
        setPrs(p)
        setSessions(ses)
      })
      .catch((e) => {
        console.error(e)
        setError(t('stats.loadError'))
      })
      .finally(() => setLoading(false))
  }, [user, t])

  useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect
    load()
  }, [load])

  if (!user) return null

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        index="05"
        eyebrow={t('stats.eyebrow')}
        title={t('stats.title')}
        description={t('stats.subtitle')}
      />

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : loading ? (
        <div role="status" aria-busy="true" aria-live="polite" className="mt-5 space-y-3">
          <span className="sr-only">{t('common.loading')}</span>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="shimmer h-20 rounded-2xl bg-surface" />
            <div className="shimmer h-20 rounded-2xl bg-surface" />
          </div>
          <div className="shimmer h-48 rounded-2xl bg-surface" />
          <div className="shimmer h-32 rounded-2xl bg-surface" />
        </div>
      ) : (
        <>
          <section className="mt-5 grid grid-cols-2 gap-2.5">
            <StreakCard label={t('stats.currentStreak')} value={streak?.current ?? null} />
            <StreakCard label={t('stats.bestStreak')} value={streak?.best ?? null} />
          </section>

          <TrainingHeatmap sessions={sessions} />

          <VolumeChart volume={volume} lang={lang} t={t} />

          <section className="mt-6">
            <h2 className="font-display text-sm font-semibold text-high">{t('stats.prs')}</h2>
            {prs.length === 0 ? (
              <div className="mt-2 flex items-center gap-3 rounded-xl border border-dashed border-edge2 p-4">
                <Trophy aria-hidden="true" strokeWidth={1.8} className="h-5 w-5 shrink-0 text-dim3" />
                <p className="text-sm text-dim">{t('stats.noPrs')}</p>
              </div>
            ) : (
              <div className="ui-card mt-2 divide-y divide-edge overflow-hidden">
                {prs.map((pr) => (
                  <Link
                    key={pr.exerciseId}
                    to={`/ejercicios/${pr.exerciseId}`}
                    viewTransition
                    className="flex items-center gap-3 px-3 py-3 transition-colors hover:bg-surface2/60 sm:px-4"
                  >
                    {pr.imageUrl ? (
                      <img
                        src={pr.imageUrl}
                        alt=""
                        width={40}
                        height={40}
                        style={{ viewTransitionName: `exercise-${pr.exerciseId}` }}
                        className="h-10 w-10 shrink-0 rounded-lg object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span className="h-10 w-10 shrink-0 rounded-lg bg-surface2" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-high">
                        {displayName(pr, lang)}
                      </p>
                      <p className="mt-0.5 text-[11px] text-dim2">
                        {t(pr.sessions === 1 ? 'stats.maxOne' : 'stats.maxMany', {
                          n: formatWeight(pr.maxWeight, lang),
                          s: pr.sessions,
                        })}
                      </p>
                      <PrSparkline values={pr.spark} />
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-mono text-sm font-semibold tabular-nums text-strong">
                        {formatWeight(pr.maxOneRm, lang)} kg
                      </p>
                      <p className="mt-0.5 text-[10px] text-dim2">{t('stats.estOneRm')}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <ExerciseEvolution prs={prs} lang={lang} t={t} />
        </>
      )}
    </div>
  )
}

function StreakCard({ label, value }: { label: string; value: number | null }) {
  const displayValue = useCountUp(value ?? 0)
  return (
    <div className="ui-card p-4">
      <p className="font-display text-[28px] font-semibold leading-none tabular-nums text-strong">
        {value === null ? '—' : displayValue}
      </p>
      <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-dim2">{label}</p>
    </div>
  )
}

function VolumeChart({
  volume,
  lang,
  t,
}: {
  volume: WeeklyVolumePoint[]
  lang: 'es' | 'en'
  t: (key: string, vars?: Record<string, string | number>) => string
}) {
  const weeks = useMemo(() => {
    const now = new Date()
    const day = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() + (day === 0 ? -6 : 1 - day))
    monday.setHours(0, 0, 0, 0)
    const out: { weekStart: string; groups: Map<string, number> }[] = []
    for (let i = 7; i >= 0; i--) {
      const ws = new Date(monday.getTime() - i * 7 * 86400000)
      out.push({ weekStart: ws.toISOString(), groups: new Map() })
    }
    for (const p of volume) {
      const w = out.find((x) => x.weekStart === p.weekStart)
      if (w) w.groups.set(p.group, (w.groups.get(p.group) ?? 0) + p.sets)
    }
    return out
  }, [volume])

  const groups = useMemo(() => {
    const totals = new Map<string, number>()
    for (const p of volume) {
      const t = totals.get(p.group) ?? 0
      totals.set(p.group, t + p.sets)
    }
    return [...totals.entries()].sort((a, b) => b[1] - a[1])
  }, [volume])

  const maxWeekTotal = Math.max(1, ...weeks.map((w) => [...w.groups.values()].reduce((a, b) => a + b, 0)))
  const W = 300
  const H = 110

  return (
    <section className="mt-6">
      <h2 className="font-display text-sm font-semibold text-high">
        {t('stats.weeklyVolume')}
      </h2>
      {groups.length === 0 ? (
        <div className="mt-2 flex items-center gap-3 rounded-xl border border-dashed border-edge2 p-4">
          <ChartNoAxesColumn
            aria-hidden="true"
            strokeWidth={1.8}
            className="h-5 w-5 shrink-0 text-dim3"
          />
          <p className="text-sm text-dim">{t('stats.noVolume')}</p>
        </div>
      ) : (
        <>
          <div className="ui-card mt-2 p-4">
            <svg
              viewBox={`0 0 ${W} ${H}`}
              role="img"
              aria-label={t('stats.weeklyVolume')}
              className="w-full"
            >
              <title>{t('stats.weeklyVolume')}</title>
              {weeks.map((w, i) => {
                const colW = W / weeks.length
                const x = i * colW + colW * 0.18
                const bw = colW * 0.64
                let y = H - 8
                const segs: { x: number; y: number; h: number; color: string }[] = []
                for (const [gi, [gname]] of groups.entries()) {
                  const sets = w.groups.get(gname) ?? 0
                  if (sets === 0) continue
                  const h = (sets / maxWeekTotal) * (H - 18)
                  y -= h
                  segs.push({ x, y, h, color: GROUP_COLORS[gi % GROUP_COLORS.length] })
                }
                const total = [...w.groups.values()].reduce((a, b) => a + b, 0)
                return (
                  <g key={w.weekStart}>
                    <title>
                      {formatShortDate(w.weekStart, lang)}: {total} {t('dash.setsShort')}
                    </title>
                    {segs.map((s, si) => (
                      <rect
                        key={s.y}
                        x={s.x}
                        y={s.y}
                        width={bw}
                        height={s.h}
                        rx={2}
                        fill={s.color}
                        className="chart-bar"
                        style={{ animationDelay: `${i * 35 + si * 25}ms` }}
                      />
                    ))}
                  </g>
                )
              })}
            </svg>
            <ul className="sr-only">
              {weeks.map((w) => {
                const total = [...w.groups.values()].reduce((a, b) => a + b, 0)
                return (
                  <li key={w.weekStart}>
                    {formatShortDate(w.weekStart, lang)}: {total} {t('dash.setsShort')}
                  </li>
                )
              })}
            </ul>
            <div className="mt-2 flex justify-between text-xs text-dim2">
              <span>{formatShortDate(weeks[0].weekStart, lang)}</span>
              <span>{t('stats.currentWeek', { date: formatShortDate(weeks[7].weekStart, lang) })}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5">
              {groups.map(([gname, total], gi) => (
                <span key={gname} className="flex items-center gap-1.5 text-xs text-soft">
                  <span
                    className="h-2.5 w-2.5 rounded-sm"
                    style={{ backgroundColor: GROUP_COLORS[gi % GROUP_COLORS.length] }}
                  />
                  {t(`group.${gname}`)} · {total}
                </span>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  )
}

function ExerciseEvolution({
  prs,
  lang,
  t,
}: {
  prs: PR[]
  lang: 'es' | 'en'
  t: (key: string, vars?: Record<string, string | number>) => string
}) {
  const { user } = useAuth()
  const { pushToast } = useToast()
  const [params, setParams] = useSearchParams()
  const exerciseId = params.get('ejercicio') ?? ''
  const [seriesByExercise, setSeriesByExercise] = useState<
    Record<string, ExerciseProgressEntry[]>
  >({})

  const series = exerciseId ? seriesByExercise[exerciseId] : undefined
  const loading = exerciseId !== '' && series === undefined

  useEffect(() => {
    if (!exerciseId || !user) return
    let cancelled = false
    fetchExerciseProgress(user.id, exerciseId)
      .then((res) => {
        if (!cancelled) setSeriesByExercise((m) => ({ ...m, [exerciseId]: res }))
      })
      .catch((err) => {
        console.error(err)
        if (!cancelled) pushToast('error', t('stats.evolutionError'))
      })
    return () => {
      cancelled = true
    }
  }, [exerciseId, user, pushToast, t])

  const selected = prs.find((p) => p.exerciseId === exerciseId)

  return (
    <section className="mt-6">
      <h2 className="font-display text-sm font-semibold text-high">{t('stats.evolution')}</h2>
      {prs.length === 0 ? null : (
        <>
          <select
            name="ejercicio"
            aria-label={t('stats.evolution')}
            value={exerciseId}
            onChange={(e) => {
              const next = new URLSearchParams(params)
              if (e.target.value) next.set('ejercicio', e.target.value)
              else next.delete('ejercicio')
              setParams(next, { replace: true })
            }}
            className="ui-input mt-2 text-sm"
          >
            <option value="">{t('stats.pickExercise')}</option>
            {prs.map((p) => (
              <option key={p.exerciseId} value={p.exerciseId}>
                {displayName(p, lang)}
              </option>
            ))}
          </select>

          {loading && <p className="mt-3 text-sm text-dim">{t('stats.loading')}</p>}

          {!loading && series && series.length < 2 && (
            <p className="mt-2 rounded-xl border border-dashed border-edge2 p-4 text-sm text-dim">
              {t('stats.needTwo')}
            </p>
          )}

          {!loading && series && series.length >= 2 && selected && (
            <div className="ui-card mt-3 p-4">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <p className="text-base font-semibold tracking-tight tabular-nums text-strong">
                    {formatWeight(selected.maxWeight, lang)} kg
                  </p>
                  <p className="mt-0.5 text-[10px] text-dim2">{t('stats.maxWeight')}</p>
                </div>
                <div>
                  <p className="text-base font-semibold tracking-tight tabular-nums text-strong">
                    {formatWeight(selected.maxOneRm, lang)} kg
                  </p>
                  <p className="mt-0.5 text-[10px] text-dim2">{t('stats.estOneRm2')}</p>
                </div>
                <div>
                  <p className="text-base font-semibold tracking-tight tabular-nums text-strong">
                    {selected.sessions}
                  </p>
                  <p className="mt-0.5 text-[10px] text-dim2">{t('stats.sessions')}</p>
                </div>
              </div>
              <ProgressChart series={series} />
            </div>
          )}
        </>
      )}
    </section>
  )
}

function PrSparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null
  const W = 56
  const H = 18
  const pad = 2
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * W
      const y = H - pad - ((value - min) / span) * (H - pad * 2)
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      aria-hidden="true"
      className="mt-1 h-[18px] w-14 text-emerald-400"
    >
      <polyline
        points={points}
        pathLength={1}
        className="chart-line"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function localDayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`
}

function heatLevel(minutes: number): string {
  if (minutes <= 0) return 'bg-surface2'
  if (minutes < 45) return 'bg-emerald-500/20'
  if (minutes < 75) return 'bg-emerald-500/40'
  if (minutes < 105) return 'bg-emerald-500/60'
  return 'bg-emerald-400'
}

function TrainingHeatmap({ sessions }: { sessions: Session[] }) {
  const { lang, t } = useLang()
  const locale = lang === 'en' ? 'en-US' : 'es-AR'

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const mondayOffset = (today.getDay() + 6) % 7
  const start = new Date(today)
  start.setDate(today.getDate() - mondayOffset - 11 * 7)

  const minutesByDay = new Map<string, number>()
  for (const session of sessions) {
    const day = new Date(session.started_at)
    const key = localDayKey(day)
    minutesByDay.set(key, (minutesByDay.get(key) ?? 0) + (session.duration_minutes ?? 30))
  }

  const todayKey = localDayKey(today)
  const cells = Array.from({ length: 84 }, (_, i) => {
    const date = new Date(start)
    date.setDate(start.getDate() + i)
    const key = localDayKey(date)
    return { key, date, minutes: minutesByDay.get(key) ?? 0 }
  })
  const startTime = start.getTime()
  const totalSessions = sessions.filter(
    (session) => new Date(session.started_at).getTime() >= startTime,
  ).length

  return (
    <section className="mt-5">
      <div className="ui-card p-4">
        <h2 className="font-display text-sm font-semibold text-high">
          {t('stats.consistency')}
        </h2>

        <div className="mt-3 overflow-x-auto pb-1">
          <div
            aria-hidden="true"
            className="grid w-max grid-flow-col grid-rows-7 gap-1"
          >
            {cells.map((cell) => {
              const dateLabel = new Intl.DateTimeFormat(locale, {
                day: 'numeric',
                month: 'short',
              }).format(cell.date)
              return (
                <span
                  key={cell.key}
                  title={`${dateLabel}: ${cell.minutes} min`}
                  className={`h-3 w-3 rounded-[2px] ${heatLevel(cell.minutes)} ${
                    cell.key === todayKey ? 'ring-1 ring-inset ring-emerald-400/70' : ''
                  }`}
                />
              )
            })}
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.08em] text-dim2">
          <span>{t('stats.heatmapSummary', { n: totalSessions })}</span>
          <span className="flex items-center gap-1">
            {t('stats.less')}
            {[0, 1, 2, 3, 4].map((level) => (
              <span
                key={level}
                aria-hidden="true"
                className={`h-2.5 w-2.5 rounded-[2px] ${
                  level === 0
                    ? 'bg-surface2'
                    : level === 1
                      ? 'bg-emerald-500/20'
                      : level === 2
                        ? 'bg-emerald-500/40'
                        : level === 3
                          ? 'bg-emerald-500/60'
                          : 'bg-emerald-400'
                }`}
              />
            ))}
            {t('stats.more')}
          </span>
        </div>
      </div>
    </section>
  )
}