'use client'
import { Suspense, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Building2, Truck, ArrowRight, Check, X, Eye, EyeOff } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { PublicNav } from '@/components/layout/PublicNav'

// OWASP password requirements
const passwordRules = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'One uppercase letter (A-Z)', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter (a-z)', test: (p: string) => /[a-z]/.test(p) },
  { label: 'One number (0-9)', test: (p: string) => /[0-9]/.test(p) },
  { label: 'One special character (!@#$%^&*)', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
]

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  const passed = passwordRules.filter(r => r.test(password)).length
  if (passed <= 1) return { score: passed, label: 'Very Weak', color: 'bg-red-500' }
  if (passed === 2) return { score: passed, label: 'Weak', color: 'bg-orange-500' }
  if (passed === 3) return { score: passed, label: 'Fair', color: 'bg-yellow-500' }
  if (passed === 4) return { score: passed, label: 'Strong', color: 'bg-blue-500' }
  return { score: passed, label: 'Very Strong', color: 'bg-green-600' }
}

const schema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
  entityCode: z.string().optional(),
  password: z.string()
    .min(8, 'At least 8 characters')
    .max(128, 'Maximum 128 characters')
    .refine(p => /[A-Z]/.test(p), 'Must contain an uppercase letter')
    .refine(p => /[a-z]/.test(p), 'Must contain a lowercase letter')
    .refine(p => /[0-9]/.test(p), 'Must contain a number')
    .refine(p => /[^A-Za-z0-9]/.test(p), 'Must contain a special character'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

function RegisterContent() {
  const params = useSearchParams()
  const role = params.get('role')

  // Both buyer and supplier now have dedicated wizard pages
  // This page only shows the role selection

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-800 flex flex-col">
      <PublicNav />
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-white">Join NRDPP</h1>
            <p className="text-blue-300 mt-2">Who are you registering as?</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Link href="/register/buyer" className="bg-white rounded-2xl p-8 hover:shadow-2xl transition-all group cursor-pointer">
              <Building2 className="text-blue-700 mb-4 group-hover:scale-110 transition-transform" size={40} />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Buying Organisation</h2>
              <p className="text-gray-500 text-sm mb-4">Public sector body, government agency, private company, or other organisation seeking to procure goods, works, or services.</p>
              <span className="text-blue-700 font-medium text-sm flex items-center gap-1">Register Organisation <ArrowRight size={14} /></span>
            </Link>
            <Link href="/register/supplier" className="bg-white rounded-2xl p-8 hover:shadow-2xl transition-all group cursor-pointer">
              <Truck className="text-blue-700 mb-4 group-hover:scale-110 transition-transform" size={40} />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Supplier / Contractor</h2>
              <p className="text-gray-500 text-sm mb-4">Business entity registered to supply goods, execute works, or provide services to buying organisations.</p>
              <span className="text-blue-700 font-medium text-sm flex items-center gap-1">Register as Supplier <ArrowRight size={14} /></span>
            </Link>
          </div>
          <p className="text-center text-blue-300 text-sm mt-8">
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
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const router = useRouter()
  const { setAuth } = useAuthStore()
  const { register, handleSubmit, watch, formState: { errors } } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) })

  const passwordValue = watch('password') || ''
  const strength = getPasswordStrength(passwordValue)

  const onSubmit = async (data: z.infer<typeof schema>) => {
    setLoading(true); setError('')
    try {
      const { confirmPassword: _, ...payload } = data
      const res = await api.post<{ user: any; accessToken: string; refreshToken: string }>('/api/auth/register', { ...payload, role })
      setAuth(res.user, res.accessToken, res.refreshToken)
      if (role === 'SUPPLIER') router.push('/supplier/onboarding')
      else router.push('/buyer/dashboard')
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Registration failed') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-800 flex flex-col">
      <PublicNav />
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center text-blue-900 font-bold text-sm">GH</div>
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
                <input {...register('firstName')} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Kwame" />
                {errors.firstName && <p className="text-red-500 text-xs mt-1">{String(errors.firstName.message)}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Last Name</label>
                <input {...register('lastName')} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Asante" />
                {errors.lastName && <p className="text-red-500 text-xs mt-1">{String(errors.lastName.message)}</p>}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email Address</label>
              <input {...register('email')} type="email" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="you@example.com" />
              {errors.email && <p className="text-red-500 text-xs mt-1">{String(errors.email.message)}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Phone Number</label>
              <input {...register('phone')} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="+233 20 000 0000" />
            </div>
            {role === 'BUYER' && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Entity Code</label>
                <input {...register('entityCode')} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. MOFEP" />
                <p className="text-xs text-gray-400 mt-1">Your organisation&apos;s unique code assigned by NRDPP. Contact your administrator if unknown.</p>
                {errors.entityCode && <p className="text-red-500 text-xs mt-1">{String(errors.entityCode.message)}</p>}
              </div>
            )}

            {/* Password with strength indicator */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPw ? 'text' : 'password'}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Create a strong password"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{String(errors.password.message)}</p>}

              {/* Strength bar */}
              {passwordValue.length > 0 && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500">Password strength</span>
                    <span className={`text-xs font-medium ${strength.score >= 4 ? 'text-green-600' : strength.score >= 3 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {strength.label}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-colors ${i <= strength.score ? strength.color : 'bg-gray-200'}`}
                      />
                    ))}
                  </div>

                  {/* Rule checklist */}
                  <div className="mt-2 space-y-0.5">
                    {passwordRules.map(rule => {
                      const passed = rule.test(passwordValue)
                      return (
                        <div key={rule.label} className="flex items-center gap-1.5">
                          {passed
                            ? <Check size={12} className="text-green-600 flex-shrink-0" />
                            : <X size={12} className="text-gray-300 flex-shrink-0" />
                          }
                          <span className={`text-xs ${passed ? 'text-green-700' : 'text-gray-400'}`}>{rule.label}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Confirm Password</label>
              <div className="relative">
                <input
                  {...register('confirmPassword')}
                  type={showConfirm ? 'text' : 'password'}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Re-enter your password"
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{String(errors.confirmPassword.message)}</p>}
            </div>

            <button type="submit" disabled={loading} className="w-full bg-green-700 hover:bg-green-800 text-white py-2.5 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
              {loading ? 'Creating account...' : `Create ${role === 'BUYER' ? 'Buyer' : 'Supplier'} Account`}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already registered? <Link href="/login" className="text-blue-700 font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-blue-900 flex items-center justify-center"><div className="text-white">Loading...</div></div>}>
      <RegisterContent />
    </Suspense>
  )
}
