import type { ReactNode } from 'react'

interface PageHeaderProps {
  index: string
  eyebrow: string
  title: string
  description?: string
  action?: ReactNode
}

export default function PageHeader({
  index,
  eyebrow,
  title,
  description,
  action,
}: PageHeaderProps) {
  return (
    <header className="mb-6 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-dim2">
          <span className="text-emerald-400">{index}</span>
          <span aria-hidden="true" className="h-px w-6 origin-left animate-line bg-edge2" />
          <span>{eyebrow}</span>
        </div>
        <h1 className="mt-2 break-words text-[clamp(1.9rem,7vw,2.75rem)] font-semibold leading-[0.95] text-strong">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-dim">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  )
}
