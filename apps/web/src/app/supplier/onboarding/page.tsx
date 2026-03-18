'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { TopBar } from '@/components/layout/TopBar'
import { api } from '@/lib/api'
import { Loader2, ChevronRight, ChevronLeft, Upload, CheckCircle2 } from 'lucide-react'

const STEPS = ['Company Info', 'Location', 'Categories', 'Review']

const schema = z.object({
  companyName: z.string().min(2, 'Required'),
  registrationNo: z.string().min(3, 'Required'),
  taxId: z.string().min(3, 'Required'),
  ssnitNo: z.string().optional(),
  businessType: z.string().min(2, 'Required'),
  yearEstablished: z.coerce.number().optional(),
  address: z.string().min(5, 'Required'),
  city: z.string().min(2, 'Required'),
  region: z.string().min(2, 'Required'),
  website: z.string().optional(),
  description: z.string().optional(),
  categoryIds: z.array(z.string()).min(1, 'Select at least one category'),
})

type FormData = z.infer<typeof schema>
interface Category { id: string; name: string; code: string; children: Category[] }

const GHANA_REGIONS = ['Greater Accra', 'Ashanti', 'Brong-Ahafo', 'Central', 'Eastern', 'Northern', 'Upper East', 'Upper West', 'Volta', 'Western', 'Oti', 'Savannah', 'North East', 'Bono East', 'Ahafo', 'Western North']

export default function SupplierOnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCats, setSelectedCats] = useState<string[]>([])
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    api.get<{ categories: Category[] }>('/api/categories').then((r) => setCategories(r.categories))
  }, [])

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { categoryIds: [] },
  })

  const toggleCat = (id: string) => {
    const next = selectedCats.includes(id) ? selectedCats.filter((c) => c !== id) : [...selectedCats, id]
    setSelectedCats(next)
    setValue('categoryIds', next)
  }

  const onSubmit = async (data: FormData) => {
    setError('')
    try {
      await api.post('/api/suppliers/register', data)
      setDone(true)
      setTimeout(() => router.push('/supplier/dashboard'), 2000)
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Registration failed') }
  }

  if (done) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <CheckCircle2 size={64} className="text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900">Profile Created!</h2>
        <p className="text-gray-500 mt-2">Your supplier profile is under review. Redirecting to dashboard...</p>
      </div>
    </div>
  )

  const allCats = categories.flatMap((c) => [c, ...c.children])

  return (
    <div>
      <TopBar title="Complete Your Profile" />
      <div className="p-6 max-w-2xl mx-auto">
        {/* Steps */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${i <= step ? 'bg-green-700 text-white' : 'bg-gray-200 text-gray-500'}`}>{i + 1}</div>
              <span className={`text-sm hidden sm:block ${i === step ? 'text-green-700 font-medium' : 'text-gray-400'}`}>{s}</span>
              {i < STEPS.length - 1 && <div className={`h-px w-6 ${i < step ? 'bg-green-700' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            {step === 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Company Information</h2>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                  <input {...register('companyName')} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                  {errors.companyName && <p className="text-red-500 text-xs mt-1">{errors.companyName.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Business Registration No. *</label>
                    <input {...register('registrationNo')} placeholder="CS000000000" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                    {errors.registrationNo && <p className="text-red-500 text-xs mt-1">{errors.registrationNo.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">TIN (GRA) *</label>
                    <input {...register('taxId')} placeholder="C0000000000" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                    {errors.taxId && <p className="text-red-500 text-xs mt-1">{errors.taxId.message}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">SSNIT Number</label>
                    <input {...register('ssnitNo')} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Business Type *</label>
                    <select {...register('businessType')} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                      <option value="">Select</option>
                      <option value="Limited Company">Limited Company</option>
                      <option value="Sole Proprietorship">Sole Proprietorship</option>
                      <option value="Partnership">Partnership</option>
                      <option value="NGO">NGO</option>
                    </select>
                    {errors.businessType && <p className="text-red-500 text-xs mt-1">{errors.businessType.message}</p>}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Description</label>
                  <textarea {...register('description')} rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" placeholder="Brief description of your business..." />
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Location</h2>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Street Address *</label>
                  <input {...register('address')} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="P.O. Box or street address" />
                  {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                    <input {...register('city')} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="e.g. Accra" />
                    {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Region *</label>
                    <select {...register('region')} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                      <option value="">Select region</option>
                      {GHANA_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                    {errors.region && <p className="text-red-500 text-xs mt-1">{errors.region.message}</p>}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Website (optional)</label>
                  <input {...register('website')} type="url" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="https://yourcompany.com" />
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-2">Business Categories</h2>
                <p className="text-sm text-gray-500 mb-4">Select all categories that apply to your business. You'll receive RFQ invitations for these categories.</p>
                <div className="grid grid-cols-2 gap-2">
                  {allCats.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggleCat(cat.id)}
                      className={`p-3 text-left rounded-lg border text-sm transition-colors ${selectedCats.includes(cat.id) ? 'bg-green-50 border-green-500 text-green-800' : 'border-gray-200 hover:border-gray-300 text-gray-700'}`}
                    >
                      {selectedCats.includes(cat.id) && <span className="mr-1">✓</span>}
                      {cat.name}
                    </button>
                  ))}
                </div>
                {errors.categoryIds && <p className="text-red-500 text-xs mt-2">{errors.categoryIds.message}</p>}
              </div>
            )}

            {step === 3 && (
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4">Review & Submit</h2>
                <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2 mb-4">
                  <p><span className="text-gray-500">Company:</span> <strong>{watch('companyName')}</strong></p>
                  <p><span className="text-gray-500">Reg No:</span> {watch('registrationNo')}</p>
                  <p><span className="text-gray-500">TIN:</span> {watch('taxId')}</p>
                  <p><span className="text-gray-500">Region:</span> {watch('region')}, {watch('city')}</p>
                  <p><span className="text-gray-500">Categories:</span> {selectedCats.length} selected</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                  Your profile will be reviewed by the platform administrator before activation. You'll be notified once approved.
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between mt-6">
            <button type="button" onClick={() => setStep(s => s - 1)} disabled={step === 0} className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-gray-50">
              <ChevronLeft size={16} /> Back
            </button>
            {step < STEPS.length - 1 ? (
              <button type="button" onClick={() => setStep(s => s + 1)} className="flex items-center gap-2 px-5 py-2.5 bg-green-700 text-white rounded-lg text-sm font-semibold hover:bg-green-800">
                Next <ChevronRight size={16} />
              </button>
            ) : (
              <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-6 py-2.5 bg-green-700 text-white rounded-lg text-sm font-semibold hover:bg-green-800 disabled:opacity-60">
                {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                Submit Profile
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
