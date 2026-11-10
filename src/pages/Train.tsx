import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate, useParams } from 'react-router-dom'
import BottomSheet from '@/components/BottomSheet'
import ErrorState from '@/components/ErrorState'
import RestTimer from '@/components/RestTimer'
import TrashIcon from '@/components/TrashIcon'
import { ClockIcon } from '@/components/icons'
import { RestTimerProvider } from '@/components/TimerContext'
import { useWakeLock } from '@/hooks/useWakeLock'
import { useConfirm } from '@/lib/use-confirm'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/lib/toast-context'
import {
  deleteSession,
  deleteSessionSet,
  fetchDayDetail,
  fetchSessionSets,
  findActiveSession,
  finishSession,
  startSession,
  upsertSessionSet,
} from '@/lib/db'
import { enqueue, genId } from '@/lib/sync'
import type { RoutineDay, RoutineExercise, Session, SessionSet } from '@/lib/types'
import { displayName } from '@/lib/i18n'
import { formatDuration } from '@/lib/format'
import { useLang } from '@/lib/lang-context'

const RPE_OPTIONS = ['', '5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10']
const FEELINGS = [
  { value: 2, label: '😩', textKey: 'train.feelVeryHard' },
  { value: 5, label: '😐', textKey: 'train.feelOkay' },
  { value: 7, label: '🙂', textKey: 'train.feelGood' },
  { value: 9, label: '😁', textKey: 'train.feelGreat' },
]

export default function Train() {
  const { dayId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { pushToast } = useToast()
  const { ask, dialog } = useConfirm()
  const { t, locale } = useLang()

  const [day, setDay] = useState<RoutineDay | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [setsByEx, setSetsByEx] = useState<Record<string, SessionSet[]>>({})
  const [loading, setLoading] = useState(true)
  const [savedMap, setSavedMap] = useState<Record<string, boolean>>({})
  const [savingMap, setSavingMap] = useState<Record<string, boolean>>({})
  const [loadError, setLoadError] = useState<string | null>(null)
  const pending = useRef<Map<string, { row: SessionSet; timer?: number }>>(new Map())
  const [showFinish, setShowFinish] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [elapsedMinutes, setElapsedMinutes] = useState(0)
  const [active, setActive] = useState<{ exerciseId: string; index: number } | null>(null)
  const [noteTarget, setNoteTarget] = useState<{ exerciseId: string; index: number } | null>(null)
  const [noteText, setNoteText] = useState('')
  const activeInitRef = useRef(false)

  useWakeLock(session !== null)

  const load = useCallback(() => {
    if (!user || !dayId) return
    let cancelled = false
    setLoadError(null)
    setLoading(true)
    ;(async () => {
      try {
        const dayRes = await fetchDayDetail(dayId)
        let sess = await findActiveSession(user.id, dayId)
        if (!sess) sess = await startSession(user.id, dayId)
        if (cancelled) return
        setDay(dayRes)
        setSession(sess)

        const existing = await fetchSessionSets(sess.id)
        if (cancelled) return

        const map: Record<string, SessionSet[]> = {}
        for (const re of dayRes.exercises ?? []) {
          let rows = existing.filter((s) => s.exercise_id === re.exercise_id)
          if (rows.length === 0) {
            rows = Array.from({ length: re.sets }, (_, i) => ({
              id: genId(),
              session_id: sess.id,
              exercise_id: re.exercise_id,
              set_number: i + 1,
              weight_kg: null,
              reps: null,
              rpe: null,
              completed: false,
              notes: null,
            }))
          }
          map[re.exercise_id] = rows
        }
        if (cancelled) return
        setSetsByEx(map)
      } catch (err) {
        console.error(err)
        setLoadError(t('train.loadError'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user, dayId, t])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!session) return
    // eslint-disable-next-line react/purity
    const start = new Date(session.started_at).getTime()
    const update = () => {
      // eslint-disable-next-line react/purity
      setElapsedMinutes(Math.max(0, Math.floor((Date.now() - start) / 60000)))
    }
    update()
    const t = setInterval(update, 30000)
    return () => clearInterval(t)
  }, [session])

  function findFirstPending(updated: Record<string, SessionSet[]> = setsByEx): {
    exerciseId: string
    index: number
  } | null {
    for (const re of day?.exercises ?? []) {
      const rows = updated[re.exercise_id] ?? []
      const idx = rows.findIndex((s) => !s.completed)
      if (idx >= 0) return { exerciseId: re.exercise_id, index: idx }
    }
    return null
  }

  function persistActive(a: { exerciseId: string; index: number } | null) {
    if (!session) return
    try {
      localStorage.setItem(`gymtrack-active-set-${session.id}`, JSON.stringify(a))
    } catch {
      // almacenamiento no disponible: la fila activa se re-deriva al cargar
    }
  }

  function activateSet(exerciseId: string, index: number) {
    const next = { exerciseId, index }
    setActive(next)
    persistActive(next)
  }

  useEffect(() => {
    if (!session || activeInitRef.current || Object.keys(setsByEx).length === 0) return
    activeInitRef.current = true
    let saved: { exerciseId: string; index: number } | null = null
    try {
      saved = JSON.parse(localStorage.getItem(`gymtrack-active-set-${session.id}`) ?? 'null')
    } catch {
      saved = null
    }
    const valid =
      saved &&
      setsByEx[saved.exerciseId]?.[saved.index] &&
      !setsByEx[saved.exerciseId][saved.index].completed
    setActive(valid ? saved : findFirstPending())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, setsByEx])

  function openNote(exerciseId: string, index: number) {
    setNoteText(setsByEx[exerciseId][index]?.notes ?? '')
    setNoteTarget({ exerciseId, index })
  }

  function saveNote() {
    if (!noteTarget) return
    void updateSet(noteTarget.exerciseId, noteTarget.index, {
      notes: noteText.trim() || null,
    })
    setNoteTarget(null)
  }

  function updateSet(
    exerciseId: string,
    index: number,
    patch: Partial<SessionSet>,
  ) {
    const rows = setsByEx[exerciseId]
    const row = { ...rows[index], ...patch }
    const rowsUpdated = rows.map((s, i) => (i === index ? row : s))
    setSetsByEx((prev) => ({ ...prev, [exerciseId]: rowsUpdated }))
    if (patch.completed === true) {
      navigator.vibrate?.(30)
      const nextIndex = rowsUpdated.findIndex((s, i) => i !== index && !s.completed)
      const next =
        nextIndex >= 0
          ? { exerciseId, index: nextIndex }
          : findFirstPending({ ...setsByEx, [exerciseId]: rowsUpdated })
      setActive(next)
      persistActive(next)
    }
    // Solo estado local en cada tecla; la red se difiere con debounce.
    schedulePersist(exerciseId, index, row)
  }

  function schedulePersist(exerciseId: string, index: number, row: SessionSet) {
    const key = `${exerciseId}-${index}`
    setSavingMap((prev) => ({ ...prev, [key]: true }))
    const prevEntry = pending.current.get(key)
    if (prevEntry?.timer) clearTimeout(prevEntry.timer)
    const timer = window.setTimeout(() => {
      void flush(key)
    }, 800)
    pending.current.set(key, { row, timer })
  }

  async function flush(key: string) {
    const entry = pending.current.get(key)
    if (!entry?.row) return
    pending.current.delete(key)
    try {
      await upsertSessionSet(entry.row)
      setSavedMap((prev) => ({ ...prev, [key]: true }))
      setSavingMap((p) => ({ ...p, [key]: false }))
      window.setTimeout(() => setSavedMap((p) => ({ ...p, [key]: false })), 1200)
    } catch (err) {
      console.error(err)
      enqueue('session_set_upsert', { ...entry.row })
      setSavingMap((p) => ({ ...p, [key]: false }))
    }
  }

  function commitSet(exerciseId: string, index: number) {
    const key = `${exerciseId}-${index}`
    const entry = pending.current.get(key)
    if (entry?.timer) {
      clearTimeout(entry.timer)
      void flush(key)
    }
  }

  function flushAll() {
    pending.current.forEach((entry) => {
      if (entry.timer) clearTimeout(entry.timer)
      if (entry.row) enqueue('session_set_upsert', { ...entry.row })
    })
    pending.current.clear()
    setSavingMap({})
  }

  function cancelPending() {
    pending.current.forEach((entry) => {
      if (entry.timer) clearTimeout(entry.timer)
    })
    pending.current.clear()
    setSavingMap({})
  }

  useEffect(() => {
    const flushAllOnHide = () => {
      if (document.visibilityState === 'hidden') flushAll()
    }
    document.addEventListener('visibilitychange', flushAllOnHide)
    window.addEventListener('pagehide', flushAllOnHide)
    return () => {
      document.removeEventListener('visibilitychange', flushAllOnHide)
      window.removeEventListener('pagehide', flushAllOnHide)
      flushAll()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function deleteSet(exerciseId: string, index: number) {
    const row = setsByEx[exerciseId][index]
    const rowsUpdated = setsByEx[exerciseId].filter((_, i) => i !== index)
    setSetsByEx((prev) => ({ ...prev, [exerciseId]: rowsUpdated }))
    if (active?.exerciseId === exerciseId && active.index === index) {
      const next = findFirstPending({ ...setsByEx, [exerciseId]: rowsUpdated })
      setActive(next)
      persistActive(next)
    }
    try {
      await deleteSessionSet(row.id)
      pushToast('success', t('train.setDeleted'))
    } catch (err) {
      console.error(err)
      pushToast('error', t('train.setDeleteError'))
      throw err
    }
  }

  async function handleFinish(feeling: number | null) {
    if (!session || finishing) return
    setFinishing(true)
    try {
      flushAll()
      await finishSession(
        session.id,
        Math.max(1, Math.round(elapsedMinutes)),
        feeling,
      )
      pushToast('success', t('train.saved'))
      navigate('/historial')
    } catch (err) {
      console.error(err)
      setFinishing(false)
    }
  }

  async function handleDiscard() {
    if (!session) return
    cancelPending()
    try {
      await deleteSession(session.id)
      pushToast('info', t('train.discarded'))
      navigate('/rutinas')
    } catch (err) {
      console.error(err)
      pushToast('error', t('train.discardError'))
    }
  }

  if (loading) {
    return (
      <div role="status" aria-busy="true" aria-live="polite" className="space-y-4">
        <span className="sr-only">{t('common.loading')}</span>
        <div className="shimmer h-8 w-1/2 rounded-lg bg-surface2" />
        <div className="shimmer h-6 w-40 rounded-lg bg-surface2" />
        <div className="shimmer h-48 rounded-2xl bg-surface2" />
        <div className="shimmer h-48 rounded-2xl bg-surface2" />
      </div>
    )
  }

  if (loadError) {
    return <ErrorState title={t('train.loadErrorTitle')} message={loadError} onRetry={load} />
  }

  if (!day || !session) {
    return (
      <div className="mt-16 text-center">
        <div className="text-5xl">🤔</div>
        <p className="mt-4 font-medium">{t('train.notFound')}</p>
        <Link
          to="/rutinas"
          className="mt-4 inline-block text-sm text-emerald-400 hover:underline"
        >
          {t('train.backRoutines')}
        </Link>
      </div>
    )
  }

  const allDone =
    Object.values(setsByEx).flat().length > 0 &&
    Object.values(setsByEx).flat().every((s) => s.completed)

  const supersets = new Map<number, RoutineExercise[]>()
  for (const re of day.exercises ?? []) {
    if (re.superset_group != null) {
      const group = supersets.get(re.superset_group) ?? []
      group.push(re)
      supersets.set(re.superset_group, group)
    }
  }

  return (
    <RestTimerProvider>
      <div className="mx-auto w-full max-w-4xl">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              to="/rutinas"
              className="inline-flex items-center gap-1 text-xs font-medium text-dim2 transition-colors hover:text-high"
            >
              ← {t('nav.routines')}
            </Link>
            <div className="mt-3 flex items-center gap-2 font-mono text-[9px] font-medium uppercase tracking-[0.16em] text-dim2">
              <span className="text-emerald-400">08</span>
              <span aria-hidden="true" className="h-px w-5 origin-left animate-line bg-edge2" />
              <span className="text-emerald-400">{t('train.activeSession')}</span>
            </div>
            <h1 className="mt-1 break-words text-[26px] font-semibold leading-tight tracking-[-0.03em] text-strong sm:text-3xl">
              {day.name ?? t('day.number', { n: day.day_number })}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-dim2">
              {day.weekday && (
                <span className="rounded-md bg-surface2 px-2 py-0.5 text-soft">
                  {day.weekday.charAt(0).toUpperCase() + day.weekday.slice(1)}
                </span>
              )}
              <span className="inline-flex items-center gap-1 tabular-nums">
                <ClockIcon />
                {formatDuration(elapsedMinutes, locale)}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              ask({
                title: t('train.discardTitle'),
                message: t('train.discardMessage'),
                confirmLabel: t('train.discard'),
                danger: true,
                onConfirm: handleDiscard,
              })
            }
            className="shrink-0 rounded-lg border border-edge bg-surface px-3 py-2 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10"
          >
            {t('train.discard')}
          </button>
        </div>

        <div className="mt-4">{!active && <RestTimer />}</div>

        <div className="mt-5 space-y-3">
          {(day.exercises ?? []).map((re) => {
            if (re.superset_group != null) {
              const group = supersets.get(re.superset_group)
              if (!group || group[0].exercise_id !== re.exercise_id) return null
              return (
                <section
                  key={`ss-${re.superset_group}`}
                  className="ui-card overflow-hidden"
                >
                  <div className="flex items-center justify-between gap-3 border-b border-edge px-3 py-2">
                    <span className="text-[11px] font-medium text-emerald-400">
                      {t('train.superset')}
                    </span>
                    <span className="truncate text-[10px] text-dim2">
                      {t('train.supersetHint')}
                    </span>
                  </div>
                  <div className="grid gap-px bg-edge/60 sm:grid-cols-2">
                    {group.map((g) => (
                      <ExerciseBlock
                        key={g.exercise_id}
                        re={g}
                        rows={setsByEx[g.exercise_id] ?? []}
                        savedMap={savedMap}
                        savingMap={savingMap}
                        onUpdateSet={(i, patch) => updateSet(g.exercise_id, i, patch)}
                        onDeleteSet={(i) => deleteSet(g.exercise_id, i)}
                        onNoteSet={(i) => openNote(g.exercise_id, i)}
                        onCommit={(i) => commitSet(g.exercise_id, i)}
                        onActivateSet={(i) => activateSet(g.exercise_id, i)}
                        activeIndex={
                          active?.exerciseId === g.exercise_id ? active.index : undefined
                        }
                        timer={
                          active?.exerciseId === g.exercise_id ? <RestTimer /> : undefined
                        }
                        bare
                      />
                    ))}
                  </div>
                </section>
              )
            }
            return (
              <ExerciseBlock
                key={re.exercise_id}
                re={re}
                rows={setsByEx[re.exercise_id] ?? []}
                savedMap={savedMap}
                savingMap={savingMap}
                onUpdateSet={(i, patch) => updateSet(re.exercise_id, i, patch)}
                onDeleteSet={(i) => deleteSet(re.exercise_id, i)}
                onNoteSet={(i) => openNote(re.exercise_id, i)}
                onCommit={(i) => commitSet(re.exercise_id, i)}
                onActivateSet={(i) => activateSet(re.exercise_id, i)}
                activeIndex={
                  active?.exerciseId === re.exercise_id ? active.index : undefined
                }
                timer={active?.exerciseId === re.exercise_id ? <RestTimer /> : undefined}
              />
            )
          })}
        </div>

        <div className="h-28" aria-hidden="true" />
      </div>

      {!showFinish &&
        createPortal(
          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-edge bg-bg px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 md:left-60">
            <div className="mx-auto flex w-full max-w-4xl justify-end">
              <button
                type="button"
                onClick={() => setShowFinish(true)}
                className="ui-button-primary w-full sm:w-auto sm:min-w-52"
              >
                {allDone ? t('train.finishAll') : t('train.finish')}
              </button>
            </div>
          </div>,
          document.body,
        )}

      {showFinish && (
        <BottomSheet
          title={t('train.howFeel')}
          onClose={() => {
            if (!finishing) setShowFinish(false)
          }}
        >
          <div className="grid grid-cols-4 gap-1.5">
            {FEELINGS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => handleFinish(f.value)}
                disabled={finishing}
                className="flex min-h-20 flex-col items-center justify-center gap-1 rounded-xl border border-edge bg-surface px-1 text-center transition-colors hover:border-emerald-500/40 hover:bg-surface2 disabled:opacity-50"
                title={t(f.textKey)}
              >
                <span aria-hidden="true" className="text-2xl">{f.label}</span>
                <span className="text-[10px] leading-tight text-dim2">{t(f.textKey)}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => handleFinish(null)}
            disabled={finishing}
            className="ui-button-secondary mt-3 w-full"
          >
            {finishing ? t('train.saving') : t('train.finishNoFeeling')}
          </button>
        </BottomSheet>
      )}

      {noteTarget && (
        <BottomSheet title={t('train.noteTitle')} onClose={() => setNoteTarget(null)}>
          <textarea
            name="set-note"
            aria-label={t('train.noteTitle')}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            rows={3}
            placeholder={t('train.notePlaceholder')}
            className="ui-input min-h-24 resize-none py-2"
          />
          <button type="button" onClick={saveNote} className="ui-button-primary mt-3 w-full">
            {t('train.saveNote')}
          </button>
        </BottomSheet>
      )}
      {dialog}
    </RestTimerProvider>
  )
}

interface SetRowProps {
  set: SessionSet
  saved: boolean
  saving: boolean
  active: boolean
  onUpdate: (patch: Partial<SessionSet>) => void
  onCommit: () => void
  onDelete: () => void
  onNote: () => void
  onActivate: () => void
}

interface ExerciseBlockProps {
  re: RoutineExercise
  rows: SessionSet[]
  savedMap: Record<string, boolean>
  savingMap: Record<string, boolean>
  onUpdateSet: (index: number, patch: Partial<SessionSet>) => void
  onDeleteSet: (index: number) => void
  onNoteSet: (index: number) => void
  onCommit: (index: number) => void
  onActivateSet: (index: number) => void
  activeIndex?: number
  timer?: ReactNode
  bare?: boolean
}

function ExerciseBlock({
  re,
  rows,
  savedMap,
  savingMap,
  onUpdateSet,
  onDeleteSet,
  onNoteSet,
  onCommit,
  onActivateSet,
  activeIndex,
  timer,
  bare,
}: ExerciseBlockProps) {
  const exercise = re.exercise
  const doneCount = rows.filter((s) => s.completed).length
  const { lang, t } = useLang()
  return (
    <section className={bare ? 'bg-surface' : 'ui-card overflow-hidden'}>
      <div className="flex items-center gap-3 border-b border-edge px-3 py-2.5">
        {exercise?.image_url && (
          <img
            src={exercise.image_url}
            alt=""
            width={40}
            height={40}
            loading="lazy"
            className="h-10 w-10 shrink-0 rounded-lg object-cover"
          />
        )}
        <div className="min-w-0 flex-1">
          <Link
            to={`/ejercicios/${exercise?.id}`}
            className="block truncate text-sm font-semibold text-high transition-colors hover:text-emerald-400"
          >
            {exercise ? displayName(exercise, lang) : t('day.exercise')}
          </Link>
          <p className="mt-0.5 text-[11px] text-dim2">
            {t('train.plan', { sets: re.sets, reps: re.reps ?? '?' })}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-md px-2 py-1 text-[11px] font-medium tabular-nums ${
            doneCount === rows.length && rows.length > 0
              ? 'bg-emerald-500/10 text-emerald-400'
              : 'bg-surface2 text-dim'
          }`}
        >
          {doneCount}/{rows.length}
        </span>
      </div>

      <ul className="divide-y divide-edge/60">
        {rows.map((set, i) => (
          <SetRow
            key={`${set.exercise_id}-${set.set_number}`}
            set={set}
            saved={!!savedMap[`${set.exercise_id}-${i}`]}
            saving={!!savingMap[`${set.exercise_id}-${i}`]}
            active={activeIndex === i}
            onUpdate={(patch) => onUpdateSet(i, patch)}
            onCommit={() => onCommit(i)}
            onDelete={() => onDeleteSet(i)}
            onNote={() => onNoteSet(i)}
            onActivate={() => onActivateSet(i)}
          />
        ))}
      </ul>

      {timer && <div className="border-t border-edge p-2">{timer}</div>}

      {doneCount === rows.length && rows.length > 0 && (
        <div className="border-t border-edge px-3 py-2 text-center text-[11px] font-medium text-emerald-400">
          {t('train.done')}
        </div>
      )}
    </section>
  )
}

function SetRow({
  set,
  saved,
  saving,
  active,
  onUpdate,
  onCommit,
  onDelete,
  onNote,
  onActivate,
}: SetRowProps) {
  const { ask, dialog } = useConfirm()
  const { t } = useLang()
  const rowRef = useRef<HTMLLIElement>(null)
  const done = set.completed

  useEffect(() => {
    if (active) {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      rowRef.current?.scrollIntoView({
        block: 'nearest',
        behavior: reduce ? 'auto' : 'smooth',
      })
    }
  }, [active])

  const stepWeight = (dir: number) => {
    const base = set.weight_kg ?? 0
    const next = Math.max(0, Math.round((base + 2.5 * dir) * 2) / 2)
    onUpdate({ weight_kg: next })
  }

  const stepReps = (dir: number) => {
    const base = set.reps ?? 0
    onUpdate({ reps: Math.max(0, base + dir) })
  }

  const btn =
    'flex h-9 w-7 shrink-0 items-center justify-center rounded-lg border border-edge bg-surface text-base font-medium text-soft transition-colors hover:bg-surface2 hover:text-strong active:scale-95'

  const field =
    'h-9 min-w-0 flex-1 rounded-lg border border-edge bg-bg px-1 text-center font-mono text-sm font-semibold tabular-nums outline-none transition-[border-color,box-shadow] focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'

  const completeClass = `flex shrink-0 items-center justify-center rounded-lg border text-sm font-semibold transition-colors active:scale-95 ${
    done
      ? 'border-emerald-500 bg-emerald-500 text-neutral-950'
      : 'border-edge2 bg-surface text-dim2 hover:border-emerald-500/50 hover:text-emerald-400'
  }`

  const toggleComplete = () => {
    onUpdate({ completed: !done })
    if (!done) {
      navigator.vibrate?.(30)
    } else {
      onActivate()
    }
  }

  return (
    <li
      ref={rowRef}
      aria-busy={saving}
      className={`relative transition-colors ${
        done ? 'bg-surface2/30' : ''
      } ${active ? 'bg-emerald-500/[0.06]' : ''}`}
    >
      {active && (
        <span
          aria-hidden="true"
          className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-emerald-400"
        />
      )}

      {/* Resumen colapsado: solo el set activo se expande. */}
      <div
        aria-hidden={active || undefined}
        inert={active ? true : undefined}
        className="overflow-hidden transition-[max-height,opacity] duration-300 ease-out"
        style={{ maxHeight: active ? '0px' : '80px', opacity: active ? 0 : 1 }}
      >
        <div>
          <div className="flex items-center gap-2 px-3 py-2">
            <button
              type="button"
              aria-label={done ? t('train.uncompleteSet') : t('train.completeSet')}
              aria-pressed={done}
              onClick={toggleComplete}
              className={`${completeClass} h-9 w-9`}
              title={done ? t('train.uncompleteSet') : t('train.completeSet')}
            >
              {done ? (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4 animate-pop"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              ) : (
                <span className="font-mono tabular-nums">{set.set_number}</span>
              )}
            </button>

            <button
              type="button"
              onClick={onActivate}
              aria-expanded={false}
              title={set.notes ?? undefined}
              className="flex min-w-0 flex-1 items-center gap-2 text-left"
            >
              <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-dim3">
                SET {set.set_number}
              </span>
              <span className="truncate font-mono text-sm font-semibold tabular-nums text-soft">
                {set.weight_kg !== null ? `${set.weight_kg} kg` : '—'}{' '}
                <span className="text-dim3">×</span> {set.reps ?? '—'}
              </span>
              {set.rpe !== null && (
                <span className="hidden shrink-0 text-[10px] text-dim2 sm:inline">
                  RPE {set.rpe}
                </span>
              )}
              {set.notes && (
                <>
                  <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                  <span className="sr-only">{t('train.editNote')}</span>
                </>
              )}
            </button>

            <span aria-hidden="true" className="shrink-0 text-dim3">
              ›
            </span>
          </div>
        </div>
      </div>

      {/* Editor del set activo. */}
      <div
        aria-hidden={!active || undefined}
        inert={!active ? true : undefined}
        className="overflow-hidden transition-[max-height,opacity] duration-300 ease-out"
        style={{ maxHeight: active ? '240px' : '0px', opacity: active ? 1 : 0 }}
      >
        <div>
          <div className="px-3 pb-3 pt-1">
            <p className="mb-1 text-right font-mono text-[8px] uppercase tracking-[0.14em] text-emerald-400">
              {t('train.editingSet')}
            </p>
            <div className="flex items-end gap-2">
              <button
                type="button"
                aria-label={done ? t('train.uncompleteSet') : t('train.completeSet')}
                aria-pressed={done}
                onClick={toggleComplete}
                className={`${completeClass} mb-0.5 h-10 w-10`}
                title={done ? t('train.uncompleteSet') : t('train.completeSet')}
              >
                {done ? (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5 animate-pop"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                ) : (
                  <span className="font-mono tabular-nums">{set.set_number}</span>
                )}
              </button>

              <div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
                <label className="min-w-0">
                  <span className="mb-1 block text-[10px] font-medium text-dim2">
                    {t('train.weight')}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => stepWeight(-1)}
                      aria-label={t('train.lowerWeight')}
                      className={btn}
                      title={t('train.lowerWeight')}
                    >
                      −
                    </button>
                    <input
                      type="number"
                      name="weight"
                      inputMode="decimal"
                      autoComplete="off"
                      aria-label={t('train.weight')}
                      min={0}
                      step={0.5}
                      value={set.weight_kg ?? ''}
                      onChange={(e) =>
                        onUpdate({ weight_kg: e.target.value === '' ? null : Number(e.target.value) })
                      }
                      onBlur={onCommit}
                      placeholder="0"
                      className={`${field} ${done ? 'text-dim2' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => stepWeight(1)}
                      aria-label={t('train.raiseWeight')}
                      className={btn}
                      title={t('train.raiseWeight')}
                    >
                      +
                    </button>
                  </div>
                </label>

                <label className="min-w-0">
                  <span className="mb-1 block text-[10px] font-medium text-dim2">
                    {t('train.reps')}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => stepReps(-1)}
                      aria-label={t('train.lowerReps')}
                      className={btn}
                      title={t('train.lowerReps')}
                    >
                      −
                    </button>
                    <input
                      type="number"
                      name="reps"
                      inputMode="numeric"
                      autoComplete="off"
                      aria-label={t('train.reps')}
                      min={0}
                      value={set.reps ?? ''}
                      onChange={(e) =>
                        onUpdate({ reps: e.target.value === '' ? null : Number(e.target.value) })
                      }
                      onBlur={onCommit}
                      placeholder="0"
                      className={`${field} ${done ? 'text-dim2' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => stepReps(1)}
                      aria-label={t('train.raiseReps')}
                      className={btn}
                      title={t('train.raiseReps')}
                    >
                      +
                    </button>
                  </div>
                </label>
              </div>
            </div>

            <div className="mt-2 flex items-center gap-1.5 pl-12">
              <select
                name="rpe"
                aria-label={t('train.rpe')}
                value={set.rpe === null ? '' : String(set.rpe)}
                onChange={(e) =>
                  onUpdate({ rpe: e.target.value === '' ? null : Number(e.target.value) })
                }
                onBlur={onCommit}
                className={`h-8 min-w-0 flex-1 rounded-lg border border-edge bg-bg px-1.5 text-[11px] text-strong outline-none transition-[border-color,box-shadow] focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 ${
                  done ? 'text-dim2' : ''
                }`}
                title={t('train.rpe')}
              >
                {RPE_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o === '' ? 'RPE' : `RPE ${o}`}
                  </option>
                ))}
              </select>
              <span role="status" aria-live="polite" className="w-3 shrink-0 text-[11px] text-emerald-400">
                {saved ? (
                  <>
                    <span aria-hidden="true" className="animate-pop">✓</span>
                    <span className="sr-only">{t('common.saved')}</span>
                  </>
                ) : null}
              </span>
              <button
                type="button"
                onClick={onNote}
                aria-label={set.notes ? t('train.editNote') : t('train.addNote')}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base transition-colors active:scale-90 ${
                  set.notes ? 'text-soft' : 'text-dim2 hover:bg-surface2 hover:text-soft'
                }`}
                title={set.notes ? t('train.editNote') : t('train.addNote')}
              >
                ⋯
              </button>
              <button
                type="button"
                aria-label={t('train.deleteSetTitle')}
                onClick={() =>
                  ask({
                    title: t('train.deleteSetTitle'),
                    message: t('train.deleteSetMessage', {
                      n: set.set_number,
                    }),
                    confirmLabel: t('train.delete'),
                    danger: true,
                    onConfirm: onDelete,
                  })
                }
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-dim2 transition-colors hover:bg-red-500/10 hover:text-red-400 active:scale-90"
                title={t('train.deleteSetTitle')}
              >
                <TrashIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
      {dialog}
    </li>
  )
}