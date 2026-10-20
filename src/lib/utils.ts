import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '$0.00'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatDateShort(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(date))
}

export function getDaysUntil(date: string | Date): number {
  const target = new Date(date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = target.getTime() - today.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function getEventTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    wedding: 'Wedding',
    birthday: 'Birthday',
    community: 'Community Event',
    other: 'Other',
  }
  return labels[type] || type
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    planning: 'bg-blue-100 text-blue-800',
    active: 'bg-green-100 text-green-800',
    completed: 'bg-purple-100 text-purple-800',
    cancelled: 'bg-red-100 text-red-800',
    pending: 'bg-yellow-100 text-yellow-800',
    quoted: 'bg-blue-100 text-blue-800',
    booked: 'bg-green-100 text-green-800',
    paid: 'bg-emerald-100 text-emerald-800',
    researching: 'bg-gray-100 text-gray-800',
    contacted: 'bg-blue-100 text-blue-800',
    negotiating: 'bg-orange-100 text-orange-800',
    rejected: 'bg-red-100 text-red-800',
    yes: 'bg-green-100 text-green-800',
    no: 'bg-red-100 text-red-800',
    maybe: 'bg-yellow-100 text-yellow-800',
    todo: 'bg-gray-100 text-gray-800',
    in_progress: 'bg-blue-100 text-blue-800',
    review: 'bg-orange-100 text-orange-800',
    done: 'bg-green-100 text-green-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

export function getPriorityLabel(priority: number): string {
  const labels: Record<number, string> = {
    1: 'High',
    2: 'Medium',
    3: 'Low',
  }
  return labels[priority] || 'Medium'
}

export function getPriorityColor(priority: number): string {
  const colors: Record<number, string> = {
    1: 'bg-red-100 text-red-800',
    2: 'bg-yellow-100 text-yellow-800',
    3: 'bg-green-100 text-green-800',
  }
  return colors[priority] || 'bg-gray-100 text-gray-800'
}
