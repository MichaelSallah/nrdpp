'use client'
import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

type ToastType = 'success' | 'error' | 'info'
interface Toast { id: string; message: string; type: ToastType }

let addToastFn: ((msg: string, type: ToastType) => void) | null = null

export function toast(message: string, type: ToastType = 'info') {
  addToastFn?.(message, type)
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    addToastFn = (message, type) => {
      const id = Math.random().toString(36).slice(2)
      setToasts((t) => [...t, { id, message, type }])
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000)
    }
    return () => { addToastFn = null }
  }, [])

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} className={cn(
          'flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm font-medium max-w-sm animate-in slide-in-from-right',
          t.type === 'success' && 'bg-green-700 text-white',
          t.type === 'error' && 'bg-red-600 text-white',
          t.type === 'info' && 'bg-gray-800 text-white',
        )}>
          <span className="flex-1">{t.message}</span>
          <button onClick={() => setToasts((ts) => ts.filter((x) => x.id !== t.id))} className="opacity-70 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
