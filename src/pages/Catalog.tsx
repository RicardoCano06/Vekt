import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import BottomSheet from '@/components/BottomSheet'
import ExerciseCard from '@/components/ExerciseCard'
import ErrorState from '@/components/ErrorState'
import PageHeader from '@/components/PageHeader'
import { muscleGroupOrder, categories } from '@/lib/catalog'
import { fetchEquipment, fetchExercises, fetchMuscles } from '@/lib/db'
import type { Equipment, Exercise, Muscle } from '@/lib/types'
import { localizedName } from '@/lib/i18n'
import { useLang } from '@/lib/lang-context'
import { SearchIcon } from '@/components/icons'

export default function Catalog() {
  const [params, setParams] = useSearchParams()
  const { lang, t } = useLang()
  const search = params.get('q') ?? ''
  const group = params.get('grupo') ?? ''
  const kind = params.get('equipo') ?? ''
  const category = params.get('categoria') ?? ''

  const [muscles, setMuscles] = useState<Muscle[]>([])
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [searchInput, setSearchInput] = useState(search)
  const [filtersOpen, setFiltersOpen] = useState(false)

  useEffect(() => {
    fetchMuscles().then(setMuscles).catch(console.error)
    fetchEquipment().then(setEquipment).catch(console.error)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      const next = new URLSearchParams(params)
      if (searchInput.trim()) next.set('q', searchInput.trim())
      else next.delete('q')
      setParams(next, { replace: true })
    }, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput])

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    fetchExercises({ search, group, equipmentKind: kind, category }, 0)
      .then((res) => {
        setExercises(res.exercises)
        setTotal(res.total)
      })
      .catch((err) => {
        console.error(err)
        setError(t('catalog.loadError'))
      })
      .finally(() => setLoading(false))
  }, [search, group, kind, category, t])

  useEffect(() => {
    setPage(0)
    load()
  }, [load])

  const loadMore = useCallback(async () => {
    const next = page + 1
    const res = await fetchExercises({ search, group, equipmentKind: kind, category }, next)
    setExercises((prev) => [...prev, ...res.exercises])
    setTotal(res.total)
    setPage(next)
  }, [page, search, group, kind, category])

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next)
  }

  const hasFilters = !!(search || group || kind || category)

  const clearFilters = () => {
    setParams(new URLSearchParams())
    setSearchInput('')
  }

  const muscleName = useCallback(
    (id: number) =>
      localizedName(muscles.find((m) => m.id === id)?.name ?? '—', lang),
    [muscles, lang],
  )

  const kinds = [...new Set(equipment.map((e) => e.kind))]

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        index="02"
        eyebrow={t('nav.exercises')}
        title={t('catalog.title')}
        description={
          loading
            ? t('common.loading')
            : hasFilters
              ? t('catalog.count', { n: total })
              : t('catalog.availableCount', { n: total })
        }
      />

      <div className="sticky top-12 z-20 -mx-4 space-y-2.5 border-b border-edge bg-bg px-4 pb-3 pt-2 md:top-0 md:-mx-8 md:px-8">
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-dim2"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="search"
              name="q"
              aria-label={t('catalog.search')}
              autoComplete="off"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t('catalog.searchPlaceholder')}
              className="ui-input pl-10"
            />
          </div>
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            aria-label={t('catalog.filters')}
            className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-edge bg-surface text-dim2 transition-colors hover:text-high md:hidden"
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
              <path d="M4 6h16M7 12h10M10 18h4" />
            </svg>
            {(kind || category) && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[9px] font-semibold text-neutral-950">
                {(kind ? 1 : 0) + (category ? 1 : 0)}
              </span>
            )}
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label={t('catalog.filters')}>
          <button
            type="button"
            aria-pressed={!group}
            onClick={() => setFilter('grupo', '')}
            className={`flex min-h-10 items-center whitespace-nowrap rounded-lg border px-3 text-xs font-medium transition-colors ${
              !group
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                : 'border-edge bg-surface text-dim hover:text-high'
            }`}
          >
            {t('catalog.all')}
          </button>
          {muscleGroupOrder.map((g) => (
            <button
              key={g}
              type="button"
              aria-pressed={group === g}
              onClick={() => setFilter('grupo', group === g ? '' : g)}
              className={`flex min-h-10 items-center whitespace-nowrap rounded-lg border px-3 text-xs font-medium transition-colors ${
                group === g
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                  : 'border-edge bg-surface text-dim hover:text-high'
              }`}
            >
              {t(`group.${g}`)}
            </button>
          ))}
        </div>

        <div className="hidden grid-cols-2 gap-2 md:grid">
          <select
            name="equipment"
            aria-label={t('catalog.equipment')}
            value={kind}
            onChange={(e) => setFilter('equipo', e.target.value)}
            className="h-10 min-w-0 rounded-lg border border-edge bg-surface px-2 text-xs text-soft outline-none focus:border-emerald-500"
          >
            <option value="">{t('catalog.allEquipment')}</option>
            {kinds.map((k) => (
              <option key={k} value={k}>
                {t(`eqkind.${k}`)}
              </option>
            ))}
          </select>
          <select
            name="category"
            aria-label={t('catalog.category')}
            value={category}
            onChange={(e) => setFilter('categoria', e.target.value)}
            className="h-10 min-w-0 rounded-lg border border-edge bg-surface px-2 text-xs text-soft outline-none focus:border-emerald-500"
          >
            <option value="">{t('catalog.allCategories')}</option>
            {Object.entries(categories).map(([key]) => (
              <option key={key} value={key}>
                {t(`cat.${key}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : loading ? (
        <div
          role="status"
          aria-busy="true"
          aria-live="polite"
          className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
        >
          <span className="sr-only">{t('common.loading')}</span>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="ui-card overflow-hidden">
              <div className="shimmer aspect-square bg-surface2" />
              <div className="space-y-2 p-2.5">
                <div className="shimmer h-3 w-3/4 rounded bg-surface2" />
                <div className="shimmer h-2.5 w-1/2 rounded bg-surface2" />
              </div>
            </div>
          ))}
        </div>
      ) : exercises.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-edge2 px-5 py-12 text-center">
          <SearchIcon className="mx-auto h-8 w-8 text-dim3" />
          <p className="mt-3 font-medium text-high">{t('catalog.noResults')}</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-dim">{t('catalog.noResultsHint')}</p>
          {hasFilters && (
            <button type="button" onClick={clearFilters} className="ui-button-secondary mt-4">
              {t('catalog.clearFilters')}
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {exercises.map((exercise) => (
              <ExerciseCard
                key={exercise.id}
                exercise={exercise}
                muscleName={muscleName}
              />
            ))}
          </div>
          {exercises.length < total && (
            <div className="mt-6 text-center">
              <button type="button" onClick={loadMore} className="ui-button-secondary">
                {t('catalog.loadMore', { n: exercises.length, m: total })}
              </button>
            </div>
          )}
        </>
      )}

      {filtersOpen && (
        <BottomSheet title={t('catalog.filters')} onClose={() => setFiltersOpen(false)}>
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-dim">
                {t('catalog.equipment')}
              </span>
              <select
                value={kind}
                onChange={(e) => setFilter('equipo', e.target.value)}
                className="ui-input text-sm"
              >
                <option value="">{t('catalog.allEquipment')}</option>
                {kinds.map((k) => (
                  <option key={k} value={k}>
                    {t(`eqkind.${k}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-dim">
                {t('catalog.category')}
              </span>
              <select
                value={category}
                onChange={(e) => setFilter('categoria', e.target.value)}
                className="ui-input text-sm"
              >
                <option value="">{t('catalog.allCategories')}</option>
                {Object.entries(categories).map(([key]) => (
                  <option key={key} value={key}>
                    {t(`cat.${key}`)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button
            type="button"
            onClick={() => {
              clearFilters()
              setFiltersOpen(false)
            }}
            className="ui-button-secondary mt-4 w-full"
          >
            {t('catalog.clearFilters')}
          </button>
        </BottomSheet>
      )}
    </div>
  )
}