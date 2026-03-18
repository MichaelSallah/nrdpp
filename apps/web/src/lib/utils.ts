import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | string, currency = 'GHS') {
  return new Intl.NumberFormat('en-GH', { style: 'currency', currency, minimumFractionDigits: 2 }).format(Number(amount))
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('en-GH', { dateStyle: 'medium' }).format(new Date(date))
}

export function formatDateTime(date: string | Date) {
  return new Intl.DateTimeFormat('en-GH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(date))
}

export function timeUntilDeadline(deadline: string | Date): string {
  const now = new Date()
  const end = new Date(deadline)
  const diff = end.getTime() - now.getTime()
  if (diff <= 0) return 'Deadline passed'

  const days = Math.floor(diff / 86400_000)
  const hours = Math.floor((diff % 86400_000) / 3600_000)
  const minutes = Math.floor((diff % 3600_000) / 60_000)

  if (days > 0) return `${days}d ${hours}h remaining`
  if (hours > 0) return `${hours}h ${minutes}m remaining`
  return `${minutes}m remaining`
}

export function rfqStatusColor(status: string) {
  const map: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-700',
    OPEN: 'bg-green-100 text-green-700',
    CLOSED: 'bg-orange-100 text-orange-700',
    AWARDED: 'bg-blue-100 text-blue-700',
    CANCELLED: 'bg-red-100 text-red-700',
  }
  return map[status] ?? 'bg-gray-100 text-gray-700'
}

export function supplierStatusColor(status: string) {
  const map: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-700',
    ACTIVE: 'bg-green-100 text-green-700',
    SUSPENDED: 'bg-orange-100 text-orange-700',
    DEBARRED: 'bg-red-100 text-red-700',
  }
  return map[status] ?? 'bg-gray-100 text-gray-700'
}
