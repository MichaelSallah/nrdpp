'use client'
import { useEffect, useState } from 'react'

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
  expired: boolean
}

function calcTimeLeft(deadline: string | Date): TimeLeft {
  const diff = new Date(deadline).getTime() - Date.now()
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true }
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
    seconds: Math.floor((diff % 60_000) / 1_000),
    expired: false,
  }
}

interface Props {
  deadline: string | Date
  /** compact = single-line text; full = four labelled boxes */
  variant?: 'compact' | 'full'
  className?: string
}

export function Countdown({ deadline, variant = 'compact', className = '' }: Props) {
  const [t, setT] = useState<TimeLeft>(() => calcTimeLeft(deadline))

  useEffect(() => {
    const id = setInterval(() => setT(calcTimeLeft(deadline)), 1000)
    return () => clearInterval(id)
  }, [deadline])

  if (t.expired) {
    return (
      <span className={`text-red-600 font-semibold text-xs ${className}`}>
        Time Up
      </span>
    )
  }

  if (variant === 'full') {
    const urgent = t.days === 0 && t.hours < 24
    const color = t.days === 0 && t.hours < 24 ? 'text-red-600' : t.days < 2 ? 'text-amber-600' : 'text-green-700'
    const bg    = t.days === 0 && t.hours < 24 ? 'bg-red-50 border-red-200' : t.days < 2 ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'

    return (
      <div className={`inline-flex items-center gap-1 ${className}`}>
        {[
          { v: t.days,    l: 'D' },
          { v: t.hours,   l: 'H' },
          { v: t.minutes, l: 'M' },
          { v: t.seconds, l: 'S' },
        ].map(({ v, l }) => (
          <div key={l} className={`flex flex-col items-center border rounded px-1.5 py-0.5 min-w-[36px] ${bg}`}>
            <span className={`text-base font-bold leading-tight tabular-nums ${color}`}>
              {String(v).padStart(2, '0')}
            </span>
            <span className={`text-[9px] font-semibold uppercase tracking-wider ${color} opacity-70`}>{l}</span>
          </div>
        ))}
      </div>
    )
  }

  // compact variant
  const urgent = t.days === 0 && t.hours < 24
  const color = urgent ? 'text-red-600' : t.days < 2 ? 'text-amber-600' : 'text-gray-600'
  const parts = t.days > 0
    ? `${t.days}d ${String(t.hours).padStart(2,'0')}h ${String(t.minutes).padStart(2,'0')}m ${String(t.seconds).padStart(2,'0')}s`
    : `${String(t.hours).padStart(2,'0')}h ${String(t.minutes).padStart(2,'0')}m ${String(t.seconds).padStart(2,'0')}s`

  return (
    <span className={`font-mono font-semibold text-xs tabular-nums ${color} ${className}`}>
      {parts}
    </span>
  )
}
