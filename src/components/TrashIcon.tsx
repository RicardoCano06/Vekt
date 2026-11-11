import { Trash2 } from 'lucide-react'

export default function TrashIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return <Trash2 aria-hidden="true" strokeWidth={1.8} className={className} />
}
