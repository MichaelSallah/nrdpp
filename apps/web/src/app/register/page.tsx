'use client'
import { Suspense, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Building2, Truck, ArrowRight } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { PublicNav } from '@/components/layout/PublicNav'

const schema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
  entityCode: z.string().optional(),
  password: z.string().min(8, 'Min 8 characters'),
})

function RegisterContent() {
  const params = useSearchParams()
  const role = params.get('role')

  if (role === 'BUYER' || role === 'SUPPLIER') {
    return <RegisterFormPage role={role} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 to-green-800 flex flex-col">
      <PublicNav />
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-white">Join NRDPP</h1>
            <p className="text-green-300 mt-2">Who are you registering as?</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Link href="/register?role=BUYER" className="bg-white rounded-2xl p-8 hover:shadow-2xl transition-all group cursor-pointer">
              <Building2 className="text-green-700 mb-4 group-hover:scale-110 transition-transform" size={40} />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Buying Organisation</h2>
              <p className="text-gray-500 text-sm mb-4">Public sector body, government agency, private company, or other organisation seeking to procure goods, works, or services.</p>
              <span className="text-green-700 font-medium text-sm flex items-center gap-1">Register as Buyer <ArrowRight size={14} /></span>
            </Link>
            <Link href="/register?role=SUPPLIER" className="bg-white rounded-2xl p-8 hover:shadow-2xl transition-all group cursor-pointer">
              <Truck className="text-green-700 mb-4 group-hover:scale-110 transition-transform" size={40} />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Supplier / Contractor</h2>
              <p className="text-gray-500 text-sm mb-4">Business entity registered to supply goods, execute works, or provide services to buying organisations.</p>
              <span className="text-green-700 font-medium text-sm flex items-center gap-1">Register as Supplier <ArrowRight size={14} /></span>
            </Link>
          </div>
          <p className="text-center text-green-400 text-sm mt-8">
            Already have an account? <Link href="/login" className="text-yellow-400 hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

function RegisterFormPage({ role }: { role: 'BUYER' | 'SUPPLIER' }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const { setAuth } = useAuthStore()
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) })

  const onSubmit = async (data: { email: string; password: string; firstName: string; lastName: string; phone?: string; entityCode?: string }) => {
    setLoading(true); setError('')
    try {
      const res = await api.post<{ user: any; accessToken: string; refreshToken: string }>('/api/auth/register', { ...data, role })
      setAuth(res.user, res.accessToken, res.refreshToken)
      if (role === 'SUPPLIER') router.push('/supplier/onboarding')
      else router.push('/buyer/dashboard')
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Registration failed') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 to-green-800 flex flex-col">
      <PublicNav />
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center text-green-900 font-bold text-sm">GH</div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Register as {role === 'BUYER' ? 'Buyer' : 'Supplier'}</h1>
              <p className="text-gray-500 text-xs">Create your NRDPP account</p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">First Name</label>
                <input {...register('firstName')} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="Kwame" />
                {errors.firstName && <p className="text-red-500 text-xs mt-1">{String(errors.firstName.message)}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Last Name</label>
                <input {...register('lastName')} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="Asante" />
                {errors.lastName && <p className="text-red-500 text-xs mt-1">{String(errors.lastName.message)}</p>}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email Address</label>
              <input {...register('email')} type="email" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="you@example.com" />
              {errors.email && <p className="text-red-500 text-xs mt-1">{String(errors.email.message)}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Phone Number</label>
              <input {...register('phone')} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="+233 20 000 0000" />
            </div>
            {role === 'BUYER' && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Entity Code</label>
                <input {...register('entityCode')} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="e.g. MOFEP" />
                <p className="text-xs text-gray-400 mt-1">Your organisation's unique code assigned by NRDPP. Contact your administrator if unknown.</p>
                {errors.entityCode && <p className="text-red-500 text-xs mt-1">{String(errors.entityCode.message)}</p>}
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
              <input {...register('password')} type="password" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="Min 8 characters" />
              {errors.password && <p className="text-red-500 text-xs mt-1">{String(errors.password.message)}</p>}
            </div>
            <button type="submit" disabled={loading} className="w-full bg-green-700 hover:bg-green-800 text-white py-2.5 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
              {loading ? 'Creating account...' : `Create ${role === 'BUYER' ? 'Buyer' : 'Supplier'} Account`}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already registered? <Link href="/login" className="text-green-700 font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-green-900 flex items-center justify-center"><div className="text-white">Loading...</div></div>}>
      <RegisterContent />
    </Suspense>
  )
}
