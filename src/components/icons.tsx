import { CalendarDays, Clock, Dumbbell, Pencil, Search } from 'lucide-react'

interface IconProps {
  className?: string
}

function base(className = 'h-4 w-4') {
  return {
    'aria-hidden': true,
    strokeWidth: 1.8,
    className,
  } as const
}

export function ClockIcon({ className }: IconProps) {
  return <Clock {...base(className ?? 'h-4 w-4')} />
}

export function PencilIcon({ className }: IconProps) {
  return <Pencil {...base(className ?? 'h-3.5 w-3.5')} />
}

export function CalendarIcon({ className }: IconProps) {
  return <CalendarDays {...base(className ?? 'h-10 w-10')} />
}

export function SearchIcon({ className }: IconProps) {
  return <Search {...base(className ?? 'h-10 w-10')} />
}

export function DumbbellIcon({ className }: IconProps) {
  return <Dumbbell {...base(className ?? 'h-8 w-8')} />
}
