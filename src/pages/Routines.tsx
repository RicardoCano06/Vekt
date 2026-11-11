import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useConfirm } from '@/lib/use-confirm'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/lib/toast-context'
import ErrorState from '@/components/ErrorState'
import PageHeader from '@/components/PageHeader'
import { createRoutine, deleteRoutine, fetchRoutines, updateRoutine } from '@/lib/db'
import type { Routine } from '@/lib/types'
import { useLang } from '@/lib/lang-context'
import TrashIcon from '@/components/TrashIcon'
import { CalendarIcon, PencilIcon } from '@/components/icons'

export default function Routines() {
  const { user } = useAuth()
  const { ask, dialog } = useConfirm()
  const { pushToast } = useToast()
  const { lang, t } = useLang()
  const [routines, setRoutines] = useState<Routine[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  async function handleRename(id: string) {
    const name = renameValue.trim()
    setRenaming(null)
    if (!name) return
    try {
      await updateRoutine(id, name)
      setRoutines((prev) => prev.map((r) => (r.id === id ? { ...r, name } : r)))
      pushToast('success', t('routines.renamed'))
    } catch (err) {
      console.error(err)
      pushToast('error', t('routines.renameError'))
    }
  }

  const load = useCallback(() => {
    if (!user) return
    setLoading(true)
    setError(null)
    fetchRoutines(user.id)
      .then(setRoutines)
      .catch((err) => {
        console.error(err)
        setError(t('routines.loadError'))
      })
      .finally(() => setLoading(false))
  }, [user, t])

  useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect
    load()
  }, [load])

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (!user || !newName.trim() || creating) return
    setCreating(true)
    try {
      const routine = await createRoutine(user.id, newName.trim())
      setRoutines((prev) => [routine, ...prev])
      setNewName('')
      pushToast('success', t('routines.created'))
    } catch (err) {
      console.error(err)
      pushToast('error', t('routines.createError'))
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(id: string, name: string) {
    ask({
      title: t('routines.deleteTitle'),
      message: t('routines.deleteMessage', { name }),
      confirmLabel: t('routines.delete'),
      danger: true,
      onConfirm: async () => {
        setDeleting(id)
        try {
          await deleteRoutine(id)
          setRoutines((prev) => prev.filter((r) => r.id !== id))
          pushToast('success', t('routines.deleted'))
        } catch (err) {
          console.error(err)
          pushToast('error', t('routines.deleteError'))
          throw err
        } finally {
          setDeleting(null)
        }
      },
    })
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader
        index="03"
        eyebrow={t('routines.eyebrow')}
        title={t('routines.title')}
        description={t('routines.subtitle')}
      />

      <form onSubmit={handleCreate} className="mb-5 flex gap-2">
        <input
          type="text"
          name="routine-name"
          aria-label={t('routines.namePlaceholder')}
          autoComplete="off"
          required
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={t('routines.namePlaceholder')}
          className="ui-input flex-1"
        />
        <button type="submit" disabled={creating} className="ui-button-primary shrink-0 px-5">
          {t('routines.create')}
        </button>
      </form>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : loading ? (
        <div role="status" aria-busy="true" aria-live="polite" className="ui-card divide-y divide-edge overflow-hidden">
          <span className="sr-only">{t('common.loading')}</span>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="shimmer h-16 bg-surface" />
          ))}
        </div>
      ) : routines.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-edge2 px-5 py-10 text-center">
          <CalendarIcon className="mx-auto h-8 w-8 text-dim3" />
          <p className="mt-3 font-medium text-high">{t('routines.empty')}</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-dim">{t('routines.emptyHint')}</p>
        </div>
      ) : (
        <div className="ui-card divide-y divide-edge overflow-hidden">
          {routines.map((routine) => (
            <div key={routine.id} className="flex items-center gap-2 px-3 py-3 sm:px-4">
              {renaming === routine.id ? (
                <input
                  autoFocus
                  name="routine-rename"
                  aria-label={t('routines.rename')}
                  autoComplete="off"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => handleRename(routine.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRename(routine.id)
                    if (e.key === 'Escape') setRenaming(null)
                  }}
                  className="ui-input h-10 min-w-0 flex-1 text-sm font-semibold"
                />
              ) : (
                <Link to={`/rutinas/${routine.id}`} className="group min-w-0 flex-1">
                  <h2 className="truncate text-sm font-semibold text-high transition-colors group-hover:text-emerald-400">
                    {routine.name}
                  </h2>
                  {routine.description && (
                    <p className="mt-0.5 line-clamp-1 text-xs text-dim">{routine.description}</p>
                  )}
                  <p className="mt-1 text-[11px] text-dim2">
                    {new Date(routine.created_at).toLocaleDateString(
                      lang === 'en' ? 'en-US' : 'es-AR',
                    )}
                  </p>
                </Link>
              )}
              <div className="flex shrink-0 items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setRenameValue(routine.name)
                    setRenaming(routine.id)
                  }}
                  aria-label={t('routines.rename')}
                  className="relative flex h-10 w-10 items-center justify-center rounded-lg text-dim2 transition-colors before:absolute before:-inset-0.5 before:content-[''] hover:bg-surface2 hover:text-soft"
                  title={t('routines.rename')}
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(routine.id, routine.name)}
                  disabled={deleting === routine.id}
                  aria-label={t('routines.deleteHint')}
                  className="relative flex h-10 w-10 items-center justify-center rounded-lg text-dim2 transition-colors before:absolute before:-inset-0.5 before:content-[''] hover:bg-red-500/10 hover:text-red-400 disabled:opacity-30"
                  title={t('routines.deleteHint')}
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {dialog}
    </div>
  )
}