import { Link } from 'react-router-dom'
import type { Exercise } from '@/lib/types'
import { displayName } from '@/lib/i18n'
import { useLang } from '@/lib/lang-context'
import { DumbbellIcon } from '@/components/icons'

interface Props {
  exercise: Exercise
  muscleName: (id: number) => string
}

export default function ExerciseCard({ exercise, muscleName }: Props) {
  const { lang } = useLang()
  const name = displayName(exercise, lang)

  return (
    <Link
      to={`/ejercicios/${exercise.id}`}
      viewTransition
      className="ui-card group overflow-hidden transition-colors duration-150 [contain-intrinsic-size:auto_240px] [content-visibility:auto] hover:border-emerald-500/40"
    >
      <div className="aspect-square overflow-hidden bg-surface2">
        {exercise.image_url ? (
          <img
            src={exercise.image_url}
            alt={name}
            width={400}
            height={400}
            loading="lazy"
            style={{ viewTransitionName: `exercise-${exercise.id}` }}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-surface2 text-dim2">
            <DumbbellIcon className="h-8 w-8" />
          </div>
        )}
      </div>
      <div className="p-2.5">
        <h3 className="line-clamp-2 text-[13px] font-medium leading-snug text-high">
          {name}
        </h3>
        {exercise.muscle_primary != null && (
          <p className="mt-1 truncate text-[10px] text-dim2">
            {muscleName(exercise.muscle_primary)}
          </p>
        )}
      </div>
    </Link>
  )
}
