import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/lib/toast-context'
import { fetchExportData, fetchSessionSetsWithExercises, fetchSessions } from '@/lib/db'
import ErrorState from '@/components/ErrorState'
import PageHeader from '@/components/PageHeader'
import { ClockIcon } from '@/components/icons'
import type { ExportRow } from '@/lib/db'
import type { Session, SessionSet } from '@/lib/types'
import { useLang } from '@/lib/lang-context'
import { displayName } from '@/lib/i18n'
import { formatDuration, formatWeight } from '@/lib/format'

type SessionWithMeta = Session & {
  routine_days: { name: string | null; day_number: number } | null
  routines: { name: string } | null
}

function feelingEmoji(f: number | null) {
  if (f === null) return '—'
  if (f >= 9) return '😁'
  if (f >= 7) return '🙂'
  if (f >= 5) return '😐'
  return '😩'
}

function feelingLabel(f: number | null, t: (key: string) => string): string | null {
  if (f === null) return null
  if (f >= 9) return t('train.feelGreat')
  if (f >= 7) return t('train.feelGood')
  if (f >= 5) return t('train.feelOkay')
  return t('train.feelVeryHard')
}

function escapeCell(value: string): string {
  return /[";\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

function buildCSV(rows: ExportRow[], t: (key: string) => string, lang: 'es' | 'en'): string {
  const header = [
    t('history.csvHeader.Fecha'),
    t('history.csvHeader.Hora'),
    t('history.csvHeader.Rutina'),
    t('history.csvHeader.Dia'),
    t('history.csvHeader.Ejercicio'),
    t('history.csvHeader.Serie'),
    t('history.csvHeader.Peso_kg'),
    t('history.csvHeader.Reps'),
    t('history.csvHeader.RPE'),
    t('history.csvHeader.Sensacion'),
    t('history.csvHeader.Duracion_min'),
  ]
  const locale = lang === 'en' ? 'en-US' : 'es-AR'
  const lines = [header.join(';')]
  for (const r of rows) {
    const date = new Date(r.started_at)
    lines.push(
      [
        date.toLocaleDateString(locale),
        date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }),
        r.routine_name ?? '',
        r.day_name ?? '',
        (lang === 'en' && r.exercise_name_en ? r.exercise_name_en : r.exercise_name) ?? '',
        r.set_number ?? '',
        r.weight_kg ?? '',
        r.reps ?? '',
        r.rpe ?? '',
        r.feeling ?? '',
        r.duration_minutes ?? '',
      ]
        .map((v) => escapeCell(String(v)))
        .join(';'),
    )
  }
  return lines.join('\n')
}

function groupBy<T>(items: T[], key: (item: T) => string): Record<string, T[]> {
  const groups: Record<string, T[]> = {}
  for (const item of items) {
    const k = key(item)
    ;(groups[k] ??= []).push(item)
  }
  return groups
}

function dateHeaderKey(iso: string): string {
  return iso.slice(0, 10)
}

function formatDateHeader(key: string, t: (k: string) => string, lang: 'es' | 'en'): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const date = new Date(key + 'T00:00:00')
  const diffDays = Math.round((today.getTime() - date.getTime()) / 86400000)
  if (diffDays === 0) return t('common.today')
  if (diffDays === 1) return t('common.yesterday')
  return date.toLocaleDateString(lang === 'en' ? 'en-US' : 'es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export default function History() {
  const { user } = useAuth()
  const { pushToast } = useToast()
  const { lang, t } = useLang()
  const [params, setParams] = useSearchParams()
  const openIds = (params.get('sesion') ?? '').split(',').filter(Boolean)
  const [sessions, setSessions] = useState<SessionWithMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  const load = useCallback(() => {
    if (!user) return
    setError(null)
    setLoading(true)
    fetchSessions(user.id)
      .then(setSessions)
      .catch((err) => {
        console.error(err)
        setError(t('history.loadError'))
      })
      .finally(() => setLoading(false))
  }, [user, t])

  useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect
    load()
  }, [load])

  const toggleSession = useCallback(
    (id: string) => {
      const next = new URLSearchParams(params)
      const current = new Set((next.get('sesion') ?? '').split(',').filter(Boolean))
      if (current.has(id)) current.delete(id)
      else current.add(id)
      if (current.size > 0) next.set('sesion', [...current].join(','))
      else next.delete('sesion')
      setParams(next, { replace: true })
    },
    [params, setParams],
  )

  async function handleExport() {
    if (!user || exporting) return
    setExporting(true)
    try {
      const rows = await fetchExportData(user.id)
      const csv = buildCSV(rows, t, lang)
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `vekt-historial-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
      pushToast('error', t('history.exportError'))
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader
        index="04"
        eyebrow={t('nav.history')}
        title={t('history.title')}
        description={
          sessions.length > 0
            ? sessions.length === 1
              ? t('history.subtitleOne', { n: sessions.length })
              : t('history.subtitleMany', { n: sessions.length })
            : t('history.subtitleEmpty')
        }
        action={
          sessions.length > 0 ? (
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              className="ui-button-secondary h-9 shrink-0 px-3 text-xs"
            >
              {exporting ? t('history.exporting') : t('history.export')}
            </button>
          ) : undefined
        }
      />

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : loading ? (
        <div role="status" aria-busy="true" aria-live="polite" className="space-y-2">
          <span className="sr-only">{t('common.loading')}</span>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="shimmer h-16 rounded-2xl bg-surface" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-edge2 px-5 py-10 text-center">
          <ClockIcon className="mx-auto h-8 w-8 text-dim3" />
          <p className="mt-3 font-medium text-high">{t('history.empty')}</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-dim">{t('history.emptyHint')}</p>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(
            groupBy(sessions, (s) => dateHeaderKey(s.started_at)),
          )
            .sort(([a], [b]) => (a < b ? 1 : -1))
            .map(([dateKey, daySessions]) => (
              <div key={dateKey}>
                <p className="pb-1.5 pl-1 text-[11px] font-medium uppercase tracking-[0.08em] text-dim2">
                  {formatDateHeader(dateKey, t, lang)}
                </p>
                <div className="space-y-2">
                  {daySessions.map((session) => (
                    <SessionCard
                      key={session.id}
                      session={session}
                      open={openIds.includes(session.id)}
                      onToggle={() => toggleSession(session.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

function SessionCard({
  session,
  open,
  onToggle,
}: {
  session: SessionWithMeta
  open: boolean
  onToggle: () => void
}) {
  const { pushToast } = useToast()
  const { lang, t, locale } = useLang()
  const [sets, setSets] = useState<
    (SessionSet & { exercises: { id: string; name: string; image_url: string | null } })[]
  >([])
  const [loadingSets, setLoadingSets] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!open || loaded) return
    let cancelled = false
    // eslint-disable-next-line react/set-state-in-effect
    setLoadingSets(true)
    fetchSessionSetsWithExercises(session.id)
      .then((rows) => {
        if (cancelled) return
        setSets(rows)
        setLoaded(true)
      })
      .catch((err) => {
        console.error(err)
        if (!cancelled) pushToast('error', t('history.setsLoadError'))
      })
      .finally(() => {
        if (!cancelled) setLoadingSets(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, loaded, session.id, pushToast, t])

  const date = new Date(session.started_at)
  const dayName =
    session.routine_days?.name ??
    (session.routine_days ? t('day.number', { n: session.routine_days.day_number }) : '')
  const duration = session.duration_minutes
    ? formatDuration(session.duration_minutes, locale)
    : '—'
  const feeling = feelingLabel(session.feeling, t)

  return (
    <div className="ui-card overflow-hidden [contain-intrinsic-size:auto_80px] [content-visibility:auto]">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={`session-panel-${session.id}`}
        className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-surface2/40 sm:px-4"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-high">
            {dayName}
            {session.routines?.name && (
              <span className="ml-1.5 text-[11px] font-normal text-dim2">
                {session.routines.name}
              </span>
            )}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-dim2">
            {date.toLocaleDateString(locale, {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}{' '}
            · {date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-[11px]">
          <span className="flex items-center gap-1 text-dim2">
            <ClockIcon /> {duration}
          </span>
          {feeling ? (
            <span role="img" aria-label={feeling} className="w-5 text-center text-base">
              {feelingEmoji(session.feeling)}
            </span>
          ) : (
            <span aria-hidden="true" className="w-5 text-center text-base">
              {feelingEmoji(session.feeling)}
            </span>
          )}
          <span
            aria-hidden="true"
            className={`text-dim2 transition-transform ${open ? 'rotate-180' : ''}`}
          >
            ▾
          </span>
        </div>
      </button>

      {open && (
        <div id={`session-panel-${session.id}`} className="border-t border-edge bg-bg/30">
          {loadingSets ? (
            <p role="status" className="px-3 py-5 text-center text-xs text-dim2 sm:px-4">
              {t('history.loadingSets')}
            </p>
          ) : sets.length === 0 ? (
            <p className="px-3 py-5 text-center text-xs text-dim2 sm:px-4">
              {t('history.noSets')}
            </p>
          ) : (
            <div className="divide-y divide-edge/60">
              {Object.entries(groupBy(sets, (s) => s.exercise_id)).map(([exerciseId, rows]) => {
                const ex = (rows ?? [])[0]?.exercises
                return (
                  <div key={exerciseId} className="px-3 py-2.5 sm:px-4">
                    <div className="flex items-center gap-2">
                      {ex?.image_url && (
                        <img
                          src={ex.image_url}
                          alt=""
                          width={28}
                          height={28}
                          loading="lazy"
                          className="h-7 w-7 rounded-md object-cover"
                        />
                      )}
                      <p className="min-w-0 truncate text-[13px] font-medium text-soft">
                        {ex ? displayName(ex, lang) : t('history.exercise')}
                      </p>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {rows.map((s) => (
                        <span
                          key={s.id}
                          className={`rounded-md px-1.5 py-0.5 font-mono text-[11px] tabular-nums ${
                            s.completed
                              ? 'bg-surface2 text-soft'
                              : 'bg-surface2 text-dim2 line-through'
                          }`}
                        >
                          {s.weight_kg !== null
                            ? `${formatWeight(s.weight_kg, lang)} kg × ${s.reps ?? '-'}`
                            : t('history.repsOnly', { n: s.reps ?? '-' })}
                          {s.rpe !== null && ` · RPE ${s.rpe}`}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {session.notes && (
            <p className="border-t border-edge px-3 py-2.5 text-xs text-dim sm:px-4">
              <span aria-hidden="true">📝</span>{' '}
              <span className="break-words">{session.notes}</span>
            </p>
          )}
        </div>
      )}
    </div>
  )
}