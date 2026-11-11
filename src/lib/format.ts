export function formatShortDate(date: string, lang: 'es' | 'en' = 'es'): string {
  return new Date(date).toLocaleDateString(lang === 'en' ? 'en-US' : 'es-AR', {
    day: 'numeric',
    month: 'short',
  })
}

export function formatWeight(
  value: number | null | undefined,
  lang: 'es' | 'en' = 'es',
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  return new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'es-AR', {
    maximumFractionDigits: 1,
  }).format(value)
}

export function formatDuration(minutes: number, locale: string): string {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  const parts: string[] = []
  if (hours > 0) {
    parts.push(
      new Intl.NumberFormat(locale, {
        style: 'unit',
        unit: 'hour',
        unitDisplay: 'short',
      }).format(hours),
    )
  }
  if (rest > 0 || hours === 0) {
    parts.push(
      new Intl.NumberFormat(locale, {
        style: 'unit',
        unit: 'minute',
        unitDisplay: 'short',
      }).format(rest),
    )
  }
  return parts.join(' ')
}