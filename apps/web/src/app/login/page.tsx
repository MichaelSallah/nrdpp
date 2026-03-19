'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { Loader2, Eye, EyeOff, Building2, Truck } from 'lucide-react'
import { PublicNav } from '@/components/layout/PublicNav'
import { cn } from '@/lib/utils'

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password required'),
})
type FormData = z.infer<typeof schema>

type PortalRole = 'BUYER' | 'SUPPLIER'

const portals: { role: PortalRole; label: string; icon: React.ElementType; desc: string; placeholder: string }[] = [
  {
    role: 'BUYER',
    label: 'Buyer',
    icon: Building2,
    desc: 'Sign in to create and manage RFQs for your organisation.',
    placeholder: 'procurement@organisation.gov',
  },
  {
    role: 'SUPPLIER',
    label: 'Supplier',
    icon: Truck,
    desc: 'Sign in to browse open RFQs and submit your quotations.',
    placeholder: 'info@yourcompany.com',
  },
]

export default function LoginPage() {
  const router = useRouter()
  const { setAuth } = useAuthStore()
  const [portal, setPortal] = useState<PortalRole>('BUYER')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setError('')
    try {
      const res = await api.post<{ user: { id: string; email: string; firstName: string; lastName: string; role: 'ADMIN' | 'BUYER' | 'SUPPLIER'; entityId?: string; supplierId?: string }; accessToken: string; refreshToken: string }>('/api/auth/login', data)
      if (res.user.role === 'ADMIN') {
        setError('Admin access is not available here. Please use the Admin Portal.')
        return
      }
      setAuth(res.user, res.accessToken, res.refreshToken)
      if (res.user.role === 'BUYER') router.push('/buyer/dashboard')
      else router.push('/supplier/dashboard')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Invalid email or password')
    }
  }

  const activePortal = portals.find(p => p.role === portal)!

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 to-green-800 flex flex-col">
      <PublicNav />

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">

          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white">Sign In to NRDPP</h1>
            <p className="text-green-300 text-sm mt-1">Select your portal to continue</p>
          </div>

          {/* Portal selector */}
          <div className="grid grid-cols-2 gap-2 mb-5">
            {portals.map(({ role, label, icon: Icon }) => (
              <button
                key={role}
                type="button"
                onClick={() => { setPortal(role); setError('') }}
                className={cn(
                  'flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all text-sm font-medium',
                  portal === role
                    ? 'border-yellow-400 bg-yellow-400/10 text-yellow-300'
                    : 'border-green-700 bg-green-800/50 text-green-400 hover:border-green-500 hover:text-green-200'
                )}
              >
                <Icon size={20} />
                {label}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-2xl shadow-2xl p-8">
            {/* Portal header */}
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-100">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-green-700">
                <activePortal.icon size={20} />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">{activePortal.label} Portal</h2>
                <p className="text-xs text-gray-500">{activePortal.desc}</p>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input
                  {...register('email')}
                  type="email"
                  autoComplete="email"
                  placeholder={activePortal.placeholder}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <input
                    {...register('password')}
                    type={showPw ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-green-700 hover:bg-green-800 text-white py-2.5 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                {isSubmitting ? 'Signing in...' : `Sign In as ${activePortal.label}`}
              </button>
            </form>

            <p className="text-center text-sm text-gray-600 mt-5">
              No account?{' '}
              <Link href={`/register?role=${portal}`} className="text-green-700 font-medium hover:underline">
                Register as {activePortal.label}
              </Link>
            </p>
          </div>

          <p className="text-center text-green-400 text-xs mt-5">
            NRDPP – Secure Digital Procurement for All Sectors
          </p>
        </div>
      </div>
    </div>
  )
}
