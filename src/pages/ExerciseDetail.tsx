import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '@/lib/auth-context'
import ErrorState from '@/components/ErrorState'
import { DumbbellIcon } from '@/components/icons'
import { ProgressChart } from '@/components/ProgressChart'
import { formatShortDate } from '@/lib/format'
import { fetchExerciseDetail, fetchExerciseProgress } from '@/lib/db'
import type { ExerciseProgressEntry } from '@/lib/db'
import type { Equipment, Exercise, Muscle } from '@/lib/types'
import { displayName, localizedName } from '@/lib/i18n'
import { useLang } from '@/lib/lang-context'

export default function ExerciseDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const { lang, t } = useLang()
  const [detail, setDetail] = useState<{
    exercise: Exercise
    muscles: Muscle[]
    equipment: Equipment | null
  } | null>(null)
  const [progress, setProgress] = useState<ExerciseProgressEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const loading = !id || !detail || detail.exercise.id !== id

  const loadDetail = useCallback(() => {
    if (!id) return
    setError(null)
    fetchExerciseDetail(id)
      .then(setDetail)
      .catch((err) => {
        console.error(err)
        setError(t('detail.loadError'))
      })
  }, [id, t])

  useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect
    loadDetail()
  }, [loadDetail])

  useEffect(() => {
    if (!id || !user) return
    let cancelled = false
    fetchExerciseProgress(user.id, id)
      .then((list) => {
        if (!cancelled) setProgress(list)
      })
      .catch(console.error)
    return () => {
      cancelled = true
    }
  }, [id, user])

  if (error) {
    return <ErrorState message={error} onRetry={loadDetail} />
  }

  if (loading) {
    return (
      <div role="status" aria-busy="true" aria-live="polite" className="space-y-4">
        <span className="sr-only">{t('common.loading')}</span>
        <div className="shimmer h-4 w-24 rounded bg-surface2" />
        <div className="shimmer aspect-video rounded-2xl bg-surface2" />
        <div className="shimmer h-8 w-2/3 rounded bg-surface2" />
        <div className="shimmer h-4 w-1/3 rounded bg-surface2" />
      </div>
    )
  }

  const { exercise, muscles, equipment } = detail!

  if (!exercise) {
    return (
      <div className="mt-16 text-center">
        <div aria-hidden="true" className="text-5xl">🤔</div>
        <p className="mt-4 font-medium">{t('detail.notFound')}</p>
        <Link
          to="/ejercicios"
          className="mt-4 inline-block text-sm text-emerald-400 hover:underline"
        >
          {t('detail.backCatalog')}
        </Link>
      </div>
    )
  }

  const primary = muscles.find((m) => m.id === exercise.muscle_primary)
  const secondary = muscles.filter((m) => m.id !== exercise.muscle_primary)
  const instructions =
    (lang === 'es' && exercise.instructions_es?.length
      ? exercise.instructions_es
      : exercise.instructions) ?? []

  const perSession = new Map<string, ExerciseProgressEntry>()
  for (const entry of progress ?? []) {
    const prev = perSession.get(entry.session_id)
    const prevWeight = prev?.weight_kg ?? 0
    const entryWeight = entry.weight_kg ?? 0
    if (
      !prev ||
      entryWeight > prevWeight ||
      (entryWeight === prevWeight && (entry.reps ?? 0) > (prev.reps ?? 0))
    ) {
      perSession.set(entry.session_id, entry)
    }
  }
  const series = [...perSession.values()]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-12)
  const maxWeight = Math.max(0, ...(progress ?? []).map((e) => e.weight_kg ?? 0))
  const maxOneRm = Math.max(
    0,
    ...(progress ?? [])
      .filter((e) => e.weight_kg && e.reps && e.reps > 1)
      .map((e) => e.weight_kg! * (1 + e.reps! / 30)),
  )

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="mb-3 flex items-center justify-between gap-3">
        <Link
          to="/ejercicios"
          className="inline-flex items-center gap-1 text-xs font-medium text-dim2 transition-colors hover:text-high"
        >
          ← {t('catalog.title')}
        </Link>
        <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-dim2">
          <span className="text-emerald-400">07</span>
          <span aria-hidden="true" className="h-px w-5 origin-left animate-line bg-edge2" />
          <span>{t('nav.exercises')}</span>
        </div>
      </div>

      <div className="lg:grid lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:items-start lg:gap-8">
        <div className="aspect-video w-full overflow-hidden rounded-xl border border-edge bg-surface2 lg:aspect-square">
          {exercise.image_url ? (
            <img
              src={exercise.image_url}
              alt={displayName(exercise, lang)}
              width={800}
              height={450}
              fetchPriority="high"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-dim2">
              <DumbbellIcon className="h-10 w-10" />
            </div>
          )}
        </div>

        <div className="mt-5 min-w-0 lg:mt-0">
          <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.03em] text-strong sm:text-3xl">
            {displayName(exercise, lang)}
          </h1>
          {exercise.name_en && exercise.name_en !== exercise.name && (
            <p className="mt-1 text-sm text-dim2">
              {lang === 'en' ? exercise.name : exercise.name_en}
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-1.5">
            {exercise.category && (
              <span className="rounded-md bg-surface2 px-2 py-1 text-[11px] font-medium text-soft">
                {t(`cat.${exercise.category}`)}
              </span>
            )}
            {equipment && (
              <span className="rounded-md bg-surface2 px-2 py-1 text-[11px] font-medium text-soft">
                {localizedName(equipment.name, lang)}
              </span>
            )}
            {exercise.level && (
              <span className="rounded-md bg-surface2 px-2 py-1 text-[11px] font-medium text-soft">
                {t(`level.${exercise.level}`)}
              </span>
            )}
            {exercise.force && (
              <span className="rounded-md bg-surface2 px-2 py-1 text-[11px] font-medium text-soft">
                {t(`force.${exercise.force}`)}
              </span>
            )}
          </div>

          <section className="mt-6">
            <h2 className="font-display text-sm font-semibold text-high">{t('detail.musclesWorked')}</h2>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {primary && (
                <span className="rounded-md bg-emerald-500/10 px-2 py-1 text-[11px] font-medium text-emerald-400">
                  {t('common.principal', { name: localizedName(primary.name, lang) })}
                </span>
              )}
              {secondary.map((m) => (
                <span
                  key={m.id}
                  className="rounded-md bg-surface2 px-2 py-1 text-[11px] text-soft"
                >
                  {localizedName(m.name, lang)}
                </span>
              ))}
              {!primary && secondary.length === 0 && (
                <span className="text-sm text-dim2">{t('detail.noMuscleData')}</span>
              )}
            </div>
          </section>
        </div>
      </div>

      <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)] lg:items-start">
        {instructions.length > 0 && (
          <section>
            <h2 className="font-display text-sm font-semibold text-high">{t('detail.howTo')}</h2>
            <ol className="mt-3 space-y-3">
              {instructions.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm leading-relaxed text-soft">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-surface2 text-[10px] font-semibold text-dim">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {progress && (
          <section className="ui-card p-4">
            <h2 className="font-display text-sm font-semibold text-high">{t('detail.yourProgress')}</h2>
            {progress.length === 0 ? (
              <p className="mt-2 text-sm text-dim">{t('detail.noProgress')}</p>
            ) : (
              <>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <Stat label={t('detail.maxWeight')} value={maxWeight ? `${maxWeight} kg` : '—'} />
                  <Stat label={t('detail.estOneRm')} value={maxOneRm ? `${maxOneRm.toFixed(1)} kg` : '—'} />
                  <Stat label={t('detail.sessions')} value={String(perSession.size)} />
                </div>

                {series.length >= 2 && <ProgressChart series={series} />}

                <ul className="mt-3 divide-y divide-edge/60">
                  {[...perSession.values()]
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .slice(0, 6)
                    .map((e) => (
                      <li key={e.session_id} className="flex items-center justify-between gap-3 py-2 text-[13px]">
                        <span className="shrink-0 text-dim2">{formatShortDate(e.date, lang)}</span>
                        <span className="text-right font-medium text-soft">
                          {e.weight_kg ? `${e.weight_kg} kg` : t('detail.bodyweight')} × {e.reps ?? '—'}
                          {e.rpe ? ` · RPE ${e.rpe}` : ''}
                        </span>
                      </li>
                    ))}
                </ul>
              </>
            )}
          </section>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-surface2 px-2 py-2">
      <p className="truncate font-mono text-sm font-semibold tabular-nums text-strong">{value}</p>
      <p className="mt-0.5 truncate text-[10px] text-dim2">{label}</p>
    </div>
  )
}