'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'

export default function HomePage() {
  const router = useRouter()
  const { user } = useAuthStore()

  useEffect(() => {
    if (user && user.role === 'ADMIN') {
      router.replace('/dashboard')
    } else {
      router.replace('/login')
    }
  }, [user, router])

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-white text-sm">Loading...</div>
    </div>
  )
}
