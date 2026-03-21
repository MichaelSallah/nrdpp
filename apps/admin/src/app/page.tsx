'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'

export default function HomePage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    const { user } = useAuthStore.getState()
    if (user && user.role === 'ADMIN') {
      router.replace('/dashboard')
    } else {
      router.replace('/login')
    }
  }, [mounted, router])

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-white text-sm">Loading...</div>
    </div>
  )
}
