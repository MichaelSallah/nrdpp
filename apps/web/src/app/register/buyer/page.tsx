'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Building2, ArrowRight, ArrowLeft, Check, X, Eye, EyeOff,
  Loader2, CheckCircle2, AlertTriangle, Globe, MapPin, Phone, User, Briefcase
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { PublicNav } from '@/components/layout/PublicNav'

const passwordRules = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'One uppercase letter (A-Z)', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter (a-z)', test: (p: string) => /[a-z]/.test(p) },
  { label: 'One number (0-9)', test: (p: string) => /[0-9]/.test(p) },
  { label: 'One special character (!@#$%^&*)', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
]

function getPasswordStrength(password: string) {
  const passed = passwordRules.filter(r => r.test(password)).length
  if (passed <= 1) return { score: passed, label: 'Very Weak', color: 'bg-red-500' }
  if (passed === 2) return { score: passed, label: 'Weak', color: 'bg-orange-500' }
  if (passed === 3) return { score: passed, label: 'Fair', color: 'bg-yellow-500' }
  if (passed === 4) return { score: passed, label: 'Strong', color: 'bg-blue-500' }
  return { score: passed, label: 'Very Strong', color: 'bg-green-600' }
}

const GHANA_REGIONS = [
  'Greater Accra', 'Ashanti', 'Brong-Ahafo', 'Central', 'Eastern', 'Northern',
  'Upper East', 'Upper West', 'Volta', 'Western', 'Oti', 'Savannah',
  'North East', 'Bono East', 'Ahafo', 'Western North',
]

const ENTITY_TYPES_GOV = [
  { value: 'Ministry', desc: 'Central government ministry (e.g. Ministry of Finance)' },
  { value: 'Department', desc: 'Government department under a ministry' },
  { value: 'Agency', desc: 'Statutory agency or commission (e.g. NHIA, NCA)' },
  { value: 'Metropolitan Assembly', desc: 'Metropolitan district assembly (population > 250,000)' },
  { value: 'Municipal Assembly', desc: 'Municipal district assembly (population 95,000–250,000)' },
  { value: 'District Assembly', desc: 'District assembly (population < 95,000)' },
  { value: 'State-Owned Enterprise', desc: 'Government-owned corporation or enterprise' },
  { value: 'Public University', desc: 'Government-funded university or polytechnic' },
  { value: 'Hospital/Health Facility', desc: 'Public hospital, clinic, or GHS facility' },
]

const ENTITY_TYPES_PRIVATE = [
  { value: 'Private Company', desc: 'Limited liability company (Act 992)' },
  { value: 'Public Listed Company', desc: 'Company listed on Ghana Stock Exchange' },
  { value: 'NGO/Non-Profit', desc: 'Registered NGO or civil society organisation' },
  { value: 'International Organisation', desc: 'UN, donor, or multilateral agency' },
  { value: 'Faith-Based Organisation', desc: 'Church, mosque, or religious charity' },
]

const STEPS = ['Organisation Details', 'Location & Contact', 'Proposed Administrator', 'Review & Submit']

export default function BuyerRegistrationPage() {
  const router = useRouter()
  const { setAuth } = useAuthStore()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  // Step 0: Entity details
  const [entity, setEntity] = useState({
    name: '', code: '', type: '', sector: 'GOVERNMENT',
    headOfEntity: '', headTitle: '',
  })

  // Step 1: Location & contact
  const [location, setLocation] = useState({
    region: '', address: '', digitalAddress: '', phone: '', email: '', website: '',
  })

  // Step 2: Proposed Administrator
  const [admin, setAdmin] = useState({
    firstName: '', lastName: '', email: '', phone: '', jobTitle: '',
    password: '', confirmPassword: '',
  })

  const [stepErrors, setStepErrors] = useState<string[]>([])
  const strength = getPasswordStrength(admin.password)

  const entityTypes = entity.sector === 'GOVERNMENT' ? ENTITY_TYPES_GOV : ENTITY_TYPES_PRIVATE

  const validateStep = (s: number): string[] => {
    const errs: string[] = []
    if (s === 0) {
      if (!entity.name.trim()) errs.push('Organisation name is required')
      if (!entity.code.trim()) errs.push('Organisation code is required')
      else if (entity.code.length < 2) errs.push('Code must be at least 2 characters')
      if (!entity.type) errs.push('Organisation type is required')
    } else if (s === 1) {
      if (!location.region) errs.push('Region is required')
      if (location.email && !/\S+@\S+\.\S+/.test(location.email)) errs.push('Invalid organisation email')
    } else if (s === 2) {
      if (!admin.firstName.trim()) errs.push('First name is required')
      if (!admin.lastName.trim()) errs.push('Last name is required')
      if (!admin.email.trim() || !/\S+@\S+\.\S+/.test(admin.email)) errs.push('Valid email is required')
      if (!admin.password) errs.push('Password is required')
      else {
        const failed = passwordRules.filter(r => !r.test(admin.password))
        if (failed.length > 0) errs.push('Password does not meet all requirements')
      }
      if (admin.password !== admin.confirmPassword) errs.push('Passwords do not match')
    }
    return errs
  }

  const goNext = () => {
    const errs = validateStep(step)
    setStepErrors(errs)
    if (errs.length === 0) { setStep(s => s + 1); setStepErrors([]) }
  }

  const goBack = () => { setStep(s => s - 1); setStepErrors([]) }

  const handleSubmit = async () => {
    for (let s = 0; s <= 2; s++) {
      const errs = validateStep(s)
      if (errs.length > 0) { setStep(s); setStepErrors(errs); return }
    }

    setLoading(true); setError('')
    try {
      const res = await api.post<{
        user: { id: string; email: string; role: string; firstName: string; lastName: string; entityId: string }
        accessToken: string; refreshToken: string
      }>('/api/auth/register-buyer', {
        entityName: entity.name,
        entityCode: entity.code.toUpperCase(),
        entityType: entity.type,
        sector: entity.sector,
        headOfEntity: entity.headOfEntity,
        headTitle: entity.headTitle,
        region: location.region,
        entityAddress: location.address,
        digitalAddress: location.digitalAddress,
        entityPhone: location.phone,
        entityEmail: location.email,
        entityWebsite: location.website,
        firstName: admin.firstName,
        lastName: admin.lastName,
        email: admin.email,
        phone: admin.phone,
        jobTitle: admin.jobTitle,
        password: admin.password,
      })

      setAuth(res.user, res.accessToken, res.refreshToken)
      setDone(true)
      setTimeout(() => router.push('/buyer/dashboard'), 3000)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Registration failed')
    } finally { setLoading(false) }
  }

  if (done) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-800 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl p-10 text-center max-w-md shadow-2xl">
        <CheckCircle2 size={64} className="text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Organisation Registered!</h2>
        <p className="text-gray-500 mb-4">
          <strong>{entity.name}</strong> has been registered on the NRDPP platform.
          You can now create and publish RFQs from your dashboard.
        </p>
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">Redirecting to your dashboard...</div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-800 flex flex-col">
      <PublicNav />
      <div className="flex-1 flex items-center justify-center p-4 py-8">
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gray-50 border-b border-gray-200 px-6 pt-5 pb-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center text-blue-900 font-bold text-sm">GH</div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Buying Organisation Registration</h1>
                <p className="text-gray-500 text-xs">Step {step + 1} of {STEPS.length} — {STEPS[step]}</p>
              </div>
            </div>
            <div className="flex gap-1.5">
              {STEPS.map((s, i) => (
                <div key={s} className="flex-1">
                  <div className={`h-1.5 w-full rounded-full transition-colors ${i <= step ? 'bg-blue-600' : 'bg-gray-200'}`} />
                  <span className={`text-[10px] mt-1 hidden sm:block ${i === step ? 'text-blue-700 font-semibold' : i < step ? 'text-blue-600' : 'text-gray-400'}`}>{s}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2">
                <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" /><span>{error}</span>
              </div>
            )}

            {/* ── Step 0: Organisation Details ── */}
            {step === 0 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Organisation Details</h2>
                  <p className="text-sm text-gray-500">Official information about the procuring entity</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Organisation Name *</label>
                  <input value={entity.name} onChange={e => setEntity(p => ({ ...p, name: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Ministry of Finance and Economic Planning" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Organisation Code *</label>
                    <input value={entity.code} onChange={e => setEntity(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                      placeholder="e.g. MOFEP" maxLength={20} />
                    <p className="text-[10px] text-gray-400 mt-0.5">Short unique identifier — used in RFQ reference numbers</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Sector *</label>
                    <select value={entity.sector} onChange={e => setEntity(p => ({ ...p, sector: e.target.value, type: '' }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="GOVERNMENT">Government / Public Sector</option>
                      <option value="PRIVATE">Private Sector</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Organisation Type *</label>
                  <select value={entity.type} onChange={e => setEntity(p => ({ ...p, type: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Select type</option>
                    {entityTypes.map(t => <option key={t.value} value={t.value}>{t.value}</option>)}
                  </select>
                  {entity.type && (
                    <p className="text-[10px] text-blue-600 mt-0.5">{entityTypes.find(t => t.value === entity.type)?.desc}</p>
                  )}
                </div>

                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Head of Entity</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Full Name</label>
                      <input value={entity.headOfEntity} onChange={e => setEntity(p => ({ ...p, headOfEntity: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g. Hon. Dr. Mohammed Amin Adam" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Title / Position</label>
                      <input value={entity.headTitle} onChange={e => setEntity(p => ({ ...p, headTitle: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g. Minister, Chief Director, CEO" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 1: Location & Contact ── */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Location & Contact Information</h2>
                  <p className="text-sm text-gray-500">Official address and publicly available contact details</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Region *</label>
                  <select value={location.region} onChange={e => setLocation(p => ({ ...p, region: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Select region</option>
                    {GHANA_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Street / P.O. Box Address</label>
                  <input value={location.address} onChange={e => setLocation(p => ({ ...p, address: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. P.O. Box MB 40, Accra" />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Ghana Post Digital Address</label>
                  <input value={location.digitalAddress} onChange={e => setLocation(p => ({ ...p, digitalAddress: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. GA-110-2520" />
                  <p className="text-[10px] text-gray-400 mt-0.5">Your GhanaPostGPS digital address</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Office Phone</label>
                    <input value={location.phone} onChange={e => setLocation(p => ({ ...p, phone: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="+233 30 266 5421" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Official Email</label>
                    <input type="email" value={location.email} onChange={e => setLocation(p => ({ ...p, email: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="info@mofep.gov.gh" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Website</label>
                  <input value={location.website} onChange={e => setLocation(p => ({ ...p, website: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://mofep.gov.gh" />
                </div>
              </div>
            )}

            {/* ── Step 2: Proposed Administrator ── */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Proposed Administrator</h2>
                  <p className="text-sm text-gray-500">
                    The primary contact person who will manage this organisation's procurement activities on the platform.
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 flex items-start gap-2">
                  <User size={14} className="flex-shrink-0 mt-0.5" />
                  <span>The administrator will have full access to create RFQs, evaluate quotations, award contracts, and invite additional team members (up to 5 seats).</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">First Name *</label>
                    <input value={admin.firstName} onChange={e => setAdmin(p => ({ ...p, firstName: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Kwame" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Last Name *</label>
                    <input value={admin.lastName} onChange={e => setAdmin(p => ({ ...p, lastName: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Asante" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Job Title / Designation</label>
                  <input value={admin.jobTitle} onChange={e => setAdmin(p => ({ ...p, jobTitle: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Procurement Officer, Head of Procurement Unit" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Email Address *</label>
                    <input type="email" value={admin.email} onChange={e => setAdmin(p => ({ ...p, email: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="kwame.asante@mofep.gov.gh" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Phone Number</label>
                    <input value={admin.phone} onChange={e => setAdmin(p => ({ ...p, phone: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="+233 20 000 0000" />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Password *</label>
                  <div className="relative">
                    <input type={showPw ? 'text' : 'password'} value={admin.password}
                      onChange={e => setAdmin(p => ({ ...p, password: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Create a strong password" />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {admin.password.length > 0 && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-500">Password strength</span>
                        <span className={`text-xs font-medium ${strength.score >= 4 ? 'text-green-600' : strength.score >= 3 ? 'text-yellow-600' : 'text-red-600'}`}>{strength.label}</span>
                      </div>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(i => (
                          <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= strength.score ? strength.color : 'bg-gray-200'}`} />
                        ))}
                      </div>
                      <div className="mt-2 space-y-0.5">
                        {passwordRules.map(rule => {
                          const passed = rule.test(admin.password)
                          return (
                            <div key={rule.label} className="flex items-center gap-1.5">
                              {passed ? <Check size={12} className="text-green-600 flex-shrink-0" /> : <X size={12} className="text-gray-300 flex-shrink-0" />}
                              <span className={`text-xs ${passed ? 'text-green-700' : 'text-gray-400'}`}>{rule.label}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Confirm Password *</label>
                  <div className="relative">
                    <input type={showConfirm ? 'text' : 'password'} value={admin.confirmPassword}
                      onChange={e => setAdmin(p => ({ ...p, confirmPassword: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Re-enter your password" />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {admin.confirmPassword && admin.password !== admin.confirmPassword && (
                    <p className="text-red-500 text-xs mt-1">Passwords do not match</p>
                  )}
                </div>
              </div>
            )}

            {/* ── Step 3: Review ── */}
            {step === 3 && (
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4">Review & Submit</h2>

                {/* Organisation */}
                <div className="mb-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1"><Building2 size={12} /> Organisation</h3>
                  <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1.5">
                    <div className="flex items-center gap-2">
                      <strong>{entity.name}</strong>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700">{entity.code}</span>
                    </div>
                    <p><span className="text-gray-500">Type:</span> {entity.type}</p>
                    <p><span className="text-gray-500">Sector:</span> {entity.sector === 'GOVERNMENT' ? 'Government / Public' : 'Private'}</p>
                    {entity.headOfEntity && <p><span className="text-gray-500">Head:</span> {entity.headOfEntity}{entity.headTitle && ` (${entity.headTitle})`}</p>}
                  </div>
                </div>

                {/* Location */}
                <div className="mb-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1"><MapPin size={12} /> Location & Contact</h3>
                  <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1.5">
                    <p><span className="text-gray-500">Region:</span> {location.region}</p>
                    {location.address && <p><span className="text-gray-500">Address:</span> {location.address}</p>}
                    {location.digitalAddress && <p><span className="text-gray-500">Digital Address:</span> {location.digitalAddress}</p>}
                    {location.phone && <p className="flex items-center gap-1"><Phone size={12} className="text-gray-400" />{location.phone}</p>}
                    {location.email && <p className="flex items-center gap-1"><Globe size={12} className="text-gray-400" />{location.email}</p>}
                    {location.website && <p className="flex items-center gap-1"><Globe size={12} className="text-gray-400" />{location.website}</p>}
                  </div>
                </div>

                {/* Administrator */}
                <div className="mb-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1"><User size={12} /> Proposed Administrator</h3>
                  <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1.5">
                    <p><strong>{admin.firstName} {admin.lastName}</strong>{admin.jobTitle && <span className="text-gray-500"> — {admin.jobTitle}</span>}</p>
                    <p><span className="text-gray-500">Email:</span> {admin.email}</p>
                    {admin.phone && <p><span className="text-gray-500">Phone:</span> {admin.phone}</p>}
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                  By submitting, you confirm that you are authorised to represent this organisation on the NRDPP platform and that all information provided is accurate.
                  You will be the primary administrator and can invite additional team members after registration.
                </div>
              </div>
            )}

            {/* Step errors */}
            {stepErrors.length > 0 && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm font-semibold mb-1">Please fix the following:</p>
                <ul className="list-disc list-inside text-red-600 text-sm space-y-0.5">
                  {stepErrors.map((msg, i) => <li key={i}>{msg}</li>)}
                </ul>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-6">
              {step === 0 ? (
                <Link href="/register" className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">
                  <ArrowLeft size={16} /> Back
                </Link>
              ) : (
                <button type="button" onClick={goBack} className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">
                  <ArrowLeft size={16} /> Back
                </button>
              )}
              {step < STEPS.length - 1 ? (
                <button type="button" onClick={goNext}
                  className="flex items-center gap-2 px-5 py-2.5 bg-green-700 text-white rounded-lg text-sm font-semibold hover:bg-green-800 transition-colors">
                  Next <ArrowRight size={16} />
                </button>
              ) : (
                <button type="button" onClick={handleSubmit} disabled={loading}
                  className="flex items-center gap-2 px-6 py-2.5 bg-green-700 text-white rounded-lg text-sm font-semibold hover:bg-green-800 disabled:opacity-60 transition-colors">
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  Register Organisation
                </button>
              )}
            </div>
          </div>

          <div className="bg-gray-50 border-t border-gray-200 px-6 py-3 text-center">
            <p className="text-xs text-gray-500">
              Already registered? <Link href="/login" className="text-blue-700 font-medium hover:underline">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
