import { useState } from 'react'
import { Link } from 'react-router-dom'
import SwipeRow from '@/components/SwipeRow'
import TrashIcon from '@/components/TrashIcon'
import { PencilIcon } from '@/components/icons'
import { useConfirm } from '@/lib/use-confirm'
import { useToast } from '@/lib/toast-context'
import { displayName } from '@/lib/i18n'
import { useLang } from '@/lib/lang-context'
import type { RoutineDay, RoutineExercise } from '@/lib/types'

interface DayCardProps {
  day: RoutineDay
  onUpdateDay: (patch: Partial<Pick<RoutineDay, 'name'>>) => void
  onDelete: () => void
  onRemoveExercise: (re: RoutineExercise) => void
  onUpdateExercise: (
    re: RoutineExercise,
    patch: Partial<Pick<RoutineExercise, 'sets' | 'reps' | 'rest_seconds' | 'superset_group'>>,
  ) => void
  onToggleSuperset: (re: RoutineExercise, index: number) => void
  onOpenOverlay: (day: RoutineDay) => void
}

export default function DayCard({
  day,
  onUpdateDay,
  onDelete,
  onRemoveExercise,
  onUpdateExercise,
  onToggleSuperset,
  onOpenOverlay,
}: DayCardProps) {
  const { ask, dialog } = useConfirm()
  const { pushToast } = useToast()
  const { t } = useLang()
  const [editingName, setEditingName] = useState(false)
  const [name, setName] = useState(day.name ?? '')
  const [busy, setBusy] = useState(false)

  async function saveName() {
    setEditingName(false)
    if (busy) return
    setBusy(true)
    try {
      if (name.trim() && name !== day.name) await onUpdateDay({ name: name.trim() })
    } catch (err) {
      console.error(err)
      pushToast('error', t('day.renameError'))
    } finally {
      setBusy(false)
    }
  }

  const exCount = day.exercises?.length ?? 0

  return (
    <section className="ui-card relative overflow-hidden">
      <div className="px-4 pb-3 pt-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {editingName ? (
              <input
                autoFocus
                name="day-name"
                aria-label={t('day.rename')}
                autoComplete="off"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={saveName}
                onKeyDown={(e) => e.key === 'Enter' && saveName()}
                className="ui-input h-10 text-base font-semibold"
              />
            ) : (
              <button
                type="button"
                onClick={() => {
                  setName(day.name ?? '')
                  setEditingName(true)
                }}
                className="flex w-full items-center gap-2 text-left"
                title={t('day.rename')}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface2 text-[11px] font-semibold text-dim">
                  {day.day_number}
                </span>
                <h3 className="break-words text-base font-semibold text-strong">
                  {day.name ?? t('day.number', { n: day.day_number })}
                </h3>
                <PencilIcon className="h-3 w-3 shrink-0 text-dim2" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() =>
              ask({
                title: t('day.deleteTitle'),
                message: t('day.deleteMessage', {
                  name: day.name ?? day.day_number,
                }),
                confirmLabel: t('day.delete'),
                danger: true,
                onConfirm: onDelete,
              })
            }
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-dim2 transition-colors hover:bg-red-500/10 hover:text-red-400"
            title={t('day.deleteTitle')}
            aria-label={t('day.deleteTitle')}
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {exCount > 0 ? (
        <ul className="divide-y divide-edge">
          {(day.exercises ?? []).map((re, index) => (
            <ExerciseRow
              key={re.id}
              item={re}
              canPair={index < exCount - 1}
              onRemove={() => onRemoveExercise(re)}
              onUpdate={(patch) => onUpdateExercise(re, patch)}
              onToggleSuperset={() => onToggleSuperset(re, index)}
            />
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
          <svg
            viewBox="0 0 48 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
            className="h-10 w-20 text-dim3"
          >
            <rect x="2" y="4" width="8" height="16" rx="2" />
            <rect x="38" y="4" width="8" height="16" rx="2" />
            <rect x="10" y="9" width="28" height="6" rx="1" />
          </svg>
          <p className="text-sm font-medium text-soft">{t('day.emptyTitle')}</p>
          <p className="text-xs text-dim2">{t('day.emptyHint')}</p>
          <button
            type="button"
            onClick={() => onOpenOverlay(day)}
            className="mt-2 flex min-h-10 w-full max-w-xs items-center justify-center gap-1.5 rounded-lg border border-dashed border-edge2 px-4 text-sm font-medium text-dim transition-colors hover:bg-surface2 hover:text-soft"
          >
            <span className="text-base leading-none">+</span> {t('day.addExercises')}
          </button>
        </div>
      )}

      {exCount > 0 && (
        <div className="px-3 pb-3 pt-1">
          <button
            type="button"
            onClick={() => onOpenOverlay(day)}
            className="flex min-h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-edge2 text-sm font-medium text-dim transition-colors hover:bg-surface2 hover:text-soft"
          >
            <span className="text-base leading-none">+</span> {t('day.addExercise')}
          </button>
        </div>
      )}

      <div className="border-t border-edge px-4 py-3">
        <span className="text-[11px] text-dim2">
          {t('day.count', {
            n: exCount,
            noun: exCount === 1 ? t('day.exerciseOne') : t('day.exercisesMany'),
          })}
        </span>

        {exCount > 0 && (
          <Link to={`/entrenar/${day.id}`} className="ui-button-primary mt-2.5 w-full">
            {t('day.startTraining')}
          </Link>
        )}
      </div>

      {dialog}
    </section>
  )
}

interface ExerciseRowProps {
  item: RoutineExercise
  canPair: boolean
  onRemove: () => void
  onUpdate: (
    patch: Partial<Pick<RoutineExercise, 'sets' | 'reps' | 'rest_seconds' | 'superset_group'>>,
  ) => void
  onToggleSuperset: () => void
}

function ExerciseRow({ item, canPair, onRemove, onUpdate, onToggleSuperset }: ExerciseRowProps) {
  const { pushToast } = useToast()
  const { lang, t } = useLang()
  const [sets, setSets] = useState(item.sets)
  const [reps, setReps] = useState(item.reps ?? '')
  const [rest, setRest] = useState(item.rest_seconds)
  const [saved, setSaved] = useState(false)

  const ex = item.exercise

  const save = async (
    patch: Partial<Pick<RoutineExercise, 'sets' | 'reps' | 'rest_seconds'>>,
  ) => {
    try {
      await onUpdate(patch)
      setSaved(true)
      setTimeout(() => setSaved(false), 1200)
    } catch (err) {
      console.error(err)
      pushToast('error', t('day.saveError'))
    }
  }

  return (
    <SwipeRow actionLabel={t('day.removeAction')} onAction={onRemove} bgClass="bg-surface">
      <li className="flex items-start gap-2.5 px-3 py-2.5">
        {ex?.image_url && (
          <img
            src={ex.image_url}
            alt=""
            width={36}
            height={36}
            loading="lazy"
            className="mt-0.5 h-9 w-9 shrink-0 rounded-lg object-cover"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <Link
              to={`/ejercicios/${ex?.id}`}
              className="line-clamp-2 text-[13px] font-medium text-high hover:text-emerald-400"
            >
              {ex ? displayName(ex, lang) : t('day.exercise')}
            </Link>
            <div className="flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                onClick={onToggleSuperset}
                disabled={item.superset_group == null && !canPair}
                aria-label={
                  item.superset_group != null
                    ? t('day.removeSuperset')
                    : t('day.makeSuperset')
                }
                aria-pressed={item.superset_group != null}
                className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm transition-colors disabled:opacity-30 ${
                  item.superset_group != null
                    ? 'bg-surface2 text-soft'
                    : 'text-dim2 hover:bg-surface2 hover:text-soft'
                }`}
                title={
                  item.superset_group != null
                    ? t('day.removeSuperset')
                    : t('day.makeSuperset')
                }
              >
                ↔
              </button>
              <button
                type="button"
                onClick={onRemove}
                aria-label={t('day.removeExercise')}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-sm text-dim2 transition-colors hover:bg-red-500/10 hover:text-red-400"
                title={t('day.removeExercise')}
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            <input
              type="number"
              name="sets"
              inputMode="numeric"
              autoComplete="off"
              min={1}
              aria-label={t('day.sets')}
              value={sets}
              onChange={(e) => setSets(Number(e.target.value))}
              onBlur={() => sets !== item.sets && save({ sets })}
              className="h-8 w-10 rounded-md border border-edge bg-bg px-1 text-center text-xs tabular-nums outline-none focus:border-emerald-500"
            />
            <span className="whitespace-nowrap text-[11px] text-dim2">{t('day.setsShort')}</span>
            <span className="text-dim4">·</span>
            <input
              type="text"
              name="reps"
              aria-label={t('day.reps')}
              autoComplete="off"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              onBlur={() => reps !== item.reps && save({ reps })}
              className="h-8 w-10 rounded-md border border-edge bg-bg px-1 text-center text-xs tabular-nums outline-none focus:border-emerald-500"
            />
            <span className="whitespace-nowrap text-[11px] text-dim2">{t('day.repsShort')}</span>
            <span className="text-dim4">·</span>
            <input
              type="number"
              name="rest"
              inputMode="numeric"
              autoComplete="off"
              min={0}
              step={15}
              aria-label={t('day.rest')}
              value={rest}
              onChange={(e) => setRest(Number(e.target.value))}
              onBlur={() => rest !== item.rest_seconds && save({ rest_seconds: rest })}
              className="h-8 w-11 rounded-md border border-edge bg-bg px-1 text-center text-xs tabular-nums outline-none focus:border-emerald-500"
            />
            <span className="whitespace-nowrap text-[11px] text-dim2">{t('day.sec')}</span>
            <span role="status" aria-live="polite" className="text-xs text-emerald-400">
              {saved ? '✓' : ''}
              <span className="sr-only">{saved ? t('common.saved') : ''}</span>
            </span>
          </div>
        </div>
      </li>
    </SwipeRow>
  )
}
