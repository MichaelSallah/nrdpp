'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Building2, ArrowRight, ArrowLeft, Check, X, Eye, EyeOff, Upload,
  Loader2, CheckCircle2, Trash2, AlertTriangle, Shield, Clock, MapPin,
  Phone, Globe, FileText, User, Briefcase
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { PublicNav } from '@/components/layout/PublicNav'

// ── Shared constants ──
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

const BUSINESS_TYPES = [
  { value: 'Limited Company', desc: 'Registered under Companies Act 2019 (Act 992)' },
  { value: 'Sole Proprietorship', desc: 'Single owner — Registration of Business Names Act 1962 (Act 151)' },
  { value: 'Partnership', desc: 'Incorporated Partnership Act 1962 (Act 152)' },
  { value: 'Joint Venture', desc: 'Temporary consortium for specific projects' },
  { value: 'NGO', desc: 'Non-governmental organisation registered with DSW' },
  { value: 'Foreign Company', desc: 'Incorporated outside Ghana — GIPC Act 2013 (Act 865)' },
]

const DOCUMENT_TYPES = [
  { type: 'BUSINESS_REGISTRATION', label: 'Certificate of Incorporation / Business Registration', act: 'Act 992', tier: 'mandatory' as const, desc: 'Issued by Registrar General\'s Department (RGD)' },
  { type: 'TAX_CLEARANCE', label: 'Tax Clearance Certificate', act: 'Act 896', tier: 'government' as const, desc: 'Issued by Ghana Revenue Authority (GRA) — valid for 1 year' },
  { type: 'SSNIT_CLEARANCE', label: 'SSNIT Clearance Certificate', act: 'Act 766', tier: 'government' as const, desc: 'Issued by SSNIT — confirms employee contributions are up to date' },
  { type: 'PPA_REGISTRATION', label: 'PPA Supplier Registration', act: 'Act 663', tier: 'government' as const, desc: 'Public Procurement Authority registration for government contracts' },
  { type: 'VAT_REGISTRATION', label: 'VAT Registration Certificate', act: 'Act 870', tier: 'recommended' as const, desc: 'Required if annual turnover exceeds GHS 200,000' },
  { type: 'COMPANY_CERTIFICATE', label: 'Certificate to Commence Business', act: 'Act 992', tier: 'recommended' as const, desc: 'For limited liability companies — issued by RGD after incorporation' },
]

const TIER_BADGES = {
  mandatory: { label: 'Required', color: 'bg-red-100 text-red-700 border-red-200' },
  government: { label: 'Gov\'t Procurement', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  recommended: { label: 'Recommended', color: 'bg-gray-100 text-gray-600 border-gray-200' },
}

interface UploadedDoc { type: string; file: File; expiryDate: string }
interface Category { id: string; name: string; code: string; children: Category[] }

const STEPS = ['Company Details', 'Business Location', 'Proposed Administrator', 'Business Categories', 'Statutory Documents', 'Review & Submit']

export default function SupplierRegistrationPage() {
  const router = useRouter()
  const { setAuth } = useAuthStore()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  // Step 0: Company Details (Entity)
  const [company, setCompany] = useState({
    companyName: '', registrationNo: '', taxId: '', ssnitNo: '',
    businessType: '', yearEstablished: '', numberOfEmployees: '',
    description: '', email: '', phone: '',
  })

  // Step 1: Location
  const [location, setLocation] = useState({ address: '', digitalAddress: '', city: '', region: '', website: '' })

  // Step 2: Proposed Administrator
  const [admin, setAdmin] = useState({ firstName: '', lastName: '', email: '', phone: '', jobTitle: '', password: '', confirmPassword: '' })

  // Step 3: Categories
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCats, setSelectedCats] = useState<string[]>([])

  // Step 4: Documents
  const [documents, setDocuments] = useState<UploadedDoc[]>([])

  const [stepErrors, setStepErrors] = useState<string[]>([])

  useEffect(() => {
    api.get<{ categories: Category[] }>('/api/categories').then(r => setCategories(r.categories)).catch(() => {})
  }, [])

  const strength = getPasswordStrength(admin.password)
  const allCats = categories.flatMap(c => [c, ...c.children])

  const toggleCat = (id: string) => setSelectedCats(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id])
  const addDocument = (type: string, file: File, expiryDate: string) => setDocuments(prev => [...prev.filter(d => d.type !== type), { type, file, expiryDate }])
  const removeDocument = (type: string) => setDocuments(prev => prev.filter(d => d.type !== type))

  const validateStep = (s: number): string[] => {
    const errs: string[] = []
    if (s === 0) {
      if (!company.companyName.trim()) errs.push('Company / entity name is required')
      if (!company.registrationNo.trim()) errs.push('Business registration number (RGD) is required')
      if (!company.taxId.trim()) errs.push('Taxpayer Identification Number (TIN) is required')
      if (!company.businessType) errs.push('Business type is required')
      if (company.email && !/\S+@\S+\.\S+/.test(company.email)) errs.push('Invalid company email')
    } else if (s === 1) {
      if (!location.address.trim()) errs.push('Business address is required')
      if (!location.city.trim()) errs.push('City / town is required')
      if (!location.region) errs.push('Region is required')
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
    } else if (s === 3) {
      if (selectedCats.length === 0) errs.push('Select at least one business category')
    } else if (s === 4) {
      if (!documents.some(d => d.type === 'BUSINESS_REGISTRATION')) errs.push('Certificate of Incorporation / Business Registration is required')
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
    for (let s = 0; s <= 4; s++) {
      const errs = validateStep(s)
      if (errs.length > 0) { setStep(s); setStepErrors(errs); return }
    }

    setLoading(true); setError('')
    try {
      const formData = new FormData()
      // Company fields
      formData.append('companyName', company.companyName)
      formData.append('registrationNo', company.registrationNo)
      formData.append('taxId', company.taxId)
      if (company.ssnitNo) formData.append('ssnitNo', company.ssnitNo)
      formData.append('businessType', company.businessType)
      if (company.yearEstablished) formData.append('yearEstablished', company.yearEstablished)
      if (company.description) formData.append('description', company.description)
      // Location
      formData.append('address', location.address)
      formData.append('city', location.city)
      formData.append('region', location.region)
      if (location.website) formData.append('website', location.website)
      // Admin / contact person
      formData.append('firstName', admin.firstName)
      formData.append('lastName', admin.lastName)
      formData.append('email', admin.email)
      if (admin.phone) formData.append('phone', admin.phone)
      formData.append('password', admin.password)
      // Categories
      formData.append('categoryIds', JSON.stringify(selectedCats))
      // Documents
      const docMeta = documents.map(d => ({ type: d.type, expiryDate: d.expiryDate || undefined }))
      formData.append('documentMeta', JSON.stringify(docMeta))
      documents.forEach(d => formData.append('documents', d.file))

      const res = await api.upload<{
        user: { id: string; email: string; role: string; firstName: string; lastName: string }
        accessToken: string; refreshToken: string
      }>('/api/auth/register-supplier', formData)

      setAuth(res.user, res.accessToken, res.refreshToken)
      setDone(true)
      setTimeout(() => router.push('/supplier/dashboard'), 3000)
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Registration failed') }
    finally { setLoading(false) }
  }

  if (done) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-800 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl p-10 text-center max-w-md shadow-2xl">
        <CheckCircle2 size={64} className="text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Submitted!</h2>
        <p className="text-gray-500 mb-4">
          <strong>{company.companyName}</strong> has been registered. Your profile and documents will be reviewed by the NRDPP administrator.
          You will be notified once approved.
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
                <h1 className="text-lg font-bold text-gray-900">Supplier Entity Registration</h1>
                <p className="text-gray-500 text-xs">Step {step + 1} of {STEPS.length} — {STEPS[step]}</p>
              </div>
            </div>
            <div className="flex gap-1">
              {STEPS.map((s, i) => (
                <div key={s} className="flex-1">
                  <div className={`h-1.5 w-full rounded-full transition-colors ${i <= step ? 'bg-blue-600' : 'bg-gray-200'}`} />
                  <span className={`text-[9px] mt-0.5 hidden lg:block ${i === step ? 'text-blue-700 font-semibold' : i < step ? 'text-blue-600' : 'text-gray-400'}`}>{s}</span>
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

            {/* ── Step 0: Company Details ── */}
            {step === 0 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Company / Entity Details</h2>
                  <p className="text-sm text-gray-500">Official information about your business as registered with the Registrar General's Department</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Registered Company Name *</label>
                  <input value={company.companyName} onChange={e => setCompany(p => ({ ...p, companyName: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="As it appears on your Certificate of Incorporation" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">RGD Registration No. *</label>
                    <input value={company.registrationNo} onChange={e => setCompany(p => ({ ...p, registrationNo: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. CS123456789" />
                    <p className="text-[10px] text-gray-400 mt-0.5">Registrar General's Department number</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">TIN (GRA) *</label>
                    <input value={company.taxId} onChange={e => setCompany(p => ({ ...p, taxId: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. C0012345678" />
                    <p className="text-[10px] text-gray-400 mt-0.5">Ghana Revenue Authority Taxpayer ID</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">SSNIT Employer No.</label>
                    <input value={company.ssnitNo} onChange={e => setCompany(p => ({ ...p, ssnitNo: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. 1000000000" />
                    <p className="text-[10px] text-gray-400 mt-0.5">Social Security employer number</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Business Type *</label>
                    <select value={company.businessType} onChange={e => setCompany(p => ({ ...p, businessType: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">Select type</option>
                      {BUSINESS_TYPES.map(t => <option key={t.value} value={t.value}>{t.value}</option>)}
                    </select>
                    {company.businessType && (
                      <p className="text-[10px] text-blue-600 mt-0.5">{BUSINESS_TYPES.find(t => t.value === company.businessType)?.desc}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Year Established</label>
                    <input type="number" value={company.yearEstablished} onChange={e => setCompany(p => ({ ...p, yearEstablished: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. 2015" min="1900" max={new Date().getFullYear()} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Number of Employees</label>
                    <select value={company.numberOfEmployees} onChange={e => setCompany(p => ({ ...p, numberOfEmployees: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">Select range</option>
                      <option value="1-10">1 – 10 (Micro)</option>
                      <option value="11-50">11 – 50 (Small)</option>
                      <option value="51-250">51 – 250 (Medium)</option>
                      <option value="251+">251+ (Large)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Company Email</label>
                    <input type="email" value={company.email} onChange={e => setCompany(p => ({ ...p, email: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="info@company.com" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Company Phone</label>
                    <input value={company.phone} onChange={e => setCompany(p => ({ ...p, phone: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="+233 30 000 0000" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Company Description</label>
                  <textarea value={company.description} onChange={e => setCompany(p => ({ ...p, description: e.target.value }))}
                    rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Core business activities, expertise areas, and key capabilities..." />
                </div>
              </div>
            )}

            {/* ── Step 1: Business Location ── */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Business Location</h2>
                  <p className="text-sm text-gray-500">Registered office or principal place of business</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Street / P.O. Box Address *</label>
                  <input value={location.address} onChange={e => setLocation(p => ({ ...p, address: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. No. 12 Independence Ave, P.O. Box CT 1234" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Ghana Post Digital Address</label>
                  <input value={location.digitalAddress} onChange={e => setLocation(p => ({ ...p, digitalAddress: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. GA-123-4567" />
                  <p className="text-[10px] text-gray-400 mt-0.5">Your GhanaPostGPS address (ghanapostgps.com)</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">City / Town *</label>
                    <input value={location.city} onChange={e => setLocation(p => ({ ...p, city: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. Accra" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Region *</label>
                    <select value={location.region} onChange={e => setLocation(p => ({ ...p, region: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">Select region</option>
                      {GHANA_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Company Website</label>
                  <input value={location.website} onChange={e => setLocation(p => ({ ...p, website: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://yourcompany.com.gh" />
                </div>
              </div>
            )}

            {/* ── Step 2: Proposed Administrator ── */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Proposed Administrator</h2>
                  <p className="text-sm text-gray-500">
                    The primary contact person who will manage this entity's account. This person can invite additional team members after registration.
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 flex items-start gap-2">
                  <User size={14} className="flex-shrink-0 mt-0.5" />
                  <span>The administrator will have full access to manage RFQ responses, upload documents, and add team members (up to 5 seats).</span>
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Email Address *</label>
                    <input type="email" value={admin.email} onChange={e => setAdmin(p => ({ ...p, email: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="kwame@company.com" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Phone Number</label>
                    <input value={admin.phone} onChange={e => setAdmin(p => ({ ...p, phone: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="+233 20 000 0000" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Job Title / Designation</label>
                  <input value={admin.jobTitle} onChange={e => setAdmin(p => ({ ...p, jobTitle: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Managing Director, Procurement Manager" />
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

            {/* ── Step 3: Categories ── */}
            {step === 3 && (
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-1">Business Categories</h2>
                <p className="text-sm text-gray-500 mb-4">Select the categories that match your business. You'll receive RFQ invitations for these categories.</p>
                <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                  {allCats.map(cat => (
                    <button key={cat.id} type="button" onClick={() => toggleCat(cat.id)}
                      className={`p-3 text-left rounded-lg border text-sm transition-colors ${selectedCats.includes(cat.id) ? 'bg-green-50 border-green-500 text-green-800 font-medium' : 'border-gray-200 hover:border-gray-300 text-gray-700'}`}>
                      {selectedCats.includes(cat.id) && <Check size={14} className="inline mr-1.5 -mt-0.5" />}
                      {cat.name}
                    </button>
                  ))}
                </div>
                {selectedCats.length > 0 && (
                  <p className="text-sm text-green-700 font-medium mt-3">{selectedCats.length} categor{selectedCats.length === 1 ? 'y' : 'ies'} selected</p>
                )}
              </div>
            )}

            {/* ── Step 4: Documents ── */}
            {step === 4 && (
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-1">Statutory Documents</h2>
                <p className="text-sm text-gray-500 mb-4">
                  Upload certified copies of your compliance documents. These will be verified by the administrator before your entity is approved.
                </p>
                <div className="space-y-3">
                  {DOCUMENT_TYPES.map(doc => {
                    const uploaded = documents.find(d => d.type === doc.type)
                    const tierInfo = TIER_BADGES[doc.tier]
                    return (
                      <div key={doc.type} className={`border rounded-xl p-4 transition-colors ${uploaded ? 'border-green-300 bg-green-50/50' : 'border-gray-200'}`}>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                              <p className="text-sm font-semibold text-gray-900">{doc.label}</p>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${tierInfo.color}`}>{tierInfo.label}</span>
                            </div>
                            <p className="text-xs text-gray-500">{doc.desc} <span className="text-gray-400">({doc.act})</span></p>
                          </div>
                          {uploaded && (
                            <button type="button" onClick={() => removeDocument(doc.type)} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                        {uploaded ? (
                          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-100 rounded-lg px-3 py-2">
                            <CheckCircle2 size={16} />
                            <span className="font-medium truncate">{uploaded.file.name}</span>
                            <span className="text-xs text-green-600 ml-auto">({(uploaded.file.size / 1024).toFixed(0)} KB)</span>
                            {uploaded.expiryDate && <span className="text-xs text-green-600">Exp: {uploaded.expiryDate}</span>}
                          </div>
                        ) : (
                          <DocumentUploader type={doc.type} onUpload={addDocument} />
                        )}
                      </div>
                    )
                  })}
                </div>
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
                  <strong>Accepted formats:</strong> PDF, JPG, PNG (max 10MB per file). Documents must be certified copies or original scans.
                </div>
              </div>
            )}

            {/* ── Step 5: Review ── */}
            {step === 5 && (
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4">Review & Submit</h2>

                {/* Company */}
                <div className="mb-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1"><Building2 size={12} /> Company</h3>
                  <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
                    <p><strong>{company.companyName}</strong></p>
                    <p><span className="text-gray-500">RGD No:</span> {company.registrationNo} &nbsp; <span className="text-gray-500">TIN:</span> {company.taxId}</p>
                    <p><span className="text-gray-500">Type:</span> {company.businessType}</p>
                    <p className="flex items-center gap-1"><MapPin size={12} className="text-gray-400" />{location.address}, {location.city}, {location.region}</p>
                    {(company.phone || company.email) && (
                      <p>
                        {company.phone && <><Phone size={12} className="inline text-gray-400 mr-1" />{company.phone} &nbsp;</>}
                        {company.email && <><Globe size={12} className="inline text-gray-400 mr-1" />{company.email}</>}
                      </p>
                    )}
                  </div>
                </div>

                {/* Administrator */}
                <div className="mb-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1"><User size={12} /> Proposed Administrator</h3>
                  <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
                    <p><strong>{admin.firstName} {admin.lastName}</strong>{admin.jobTitle && <span className="text-gray-500"> — {admin.jobTitle}</span>}</p>
                    <p><span className="text-gray-500">Email:</span> {admin.email}</p>
                    {admin.phone && <p><span className="text-gray-500">Phone:</span> {admin.phone}</p>}
                  </div>
                </div>

                {/* Categories */}
                <div className="mb-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1"><Briefcase size={12} /> Categories ({selectedCats.length})</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedCats.map(id => { const cat = allCats.find(c => c.id === id); return cat ? <span key={id} className="px-2.5 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">{cat.name}</span> : null })}
                  </div>
                </div>

                {/* Documents */}
                <div className="mb-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1"><FileText size={12} /> Documents ({documents.length}/{DOCUMENT_TYPES.length})</h3>
                  <div className="space-y-1">
                    {DOCUMENT_TYPES.map(dt => {
                      const uploaded = documents.find(d => d.type === dt.type)
                      return (
                        <div key={dt.type} className="flex items-center gap-2 text-sm">
                          {uploaded ? <CheckCircle2 size={14} className="text-green-600 flex-shrink-0" /> : <X size={14} className="text-gray-300 flex-shrink-0" />}
                          <span className={uploaded ? 'text-gray-900' : 'text-gray-400'}>{dt.label}</span>
                          {uploaded && <span className="text-xs text-gray-500 ml-auto">{uploaded.file.name}</span>}
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                  By submitting, you confirm that all information is accurate and that you are authorised to register this entity on the NRDPP platform.
                  Your profile will be reviewed before activation.
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
                  Submit Registration
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

function DocumentUploader({ type, onUpload }: { type: string; onUpload: (type: string, file: File, expiryDate: string) => void }) {
  const [expiryDate, setExpiryDate] = useState('')
  const today = new Date().toISOString().split('T')[0]
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { alert('File too large. Maximum 10MB.'); return }
    onUpload(type, file, expiryDate)
  }
  return (
    <div className="flex items-end gap-2">
      <div className="flex-1">
        <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Expiry Date (if applicable)</label>
        <input type="date" value={expiryDate} min={today} onChange={e => setExpiryDate(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <label className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 cursor-pointer transition-colors">
        <Upload size={13} /> Choose File
        <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFile} />
      </label>
    </div>
  )
}
