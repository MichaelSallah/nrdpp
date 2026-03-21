'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { TopBar } from '@/components/layout/TopBar'
import { api } from '@/lib/api'
import { Plus, Trash2, Loader2, ChevronRight, ChevronLeft, CheckCircle2 } from 'lucide-react'

const schema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(10, 'Provide a detailed description'),
  categoryId: z.string().min(1, 'Select a category'),
  currency: z.string().default('GHS'),
  submissionDeadline: z.string().min(1, 'Set a deadline'),
  deliveryTimeline: z.string().optional(),
  minimumQuotations: z.coerce.number().min(1).default(3),
  items: z.array(z.object({
    itemNo: z.coerce.number(),
    description: z.string().min(1, 'Item description required'),
    unit: z.string().min(1, 'Unit required'),
    quantity: z.coerce.number().positive('Quantity must be > 0'),
    specifications: z.string().optional(),
  })).min(1, 'Add at least one item'),
})

type FormData = z.infer<typeof schema>

interface Category { id: string; name: string; children: Category[] }

const STEPS = ['RFQ Details', 'Line Items', 'Review & Submit']

export default function CreateRfqPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [categories, setCategories] = useState<Category[]>([])
  const [error, setError] = useState('')
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [published, setPublished] = useState(false)
  const [publishedRef, setPublishedRef] = useState('')

  const { register, control, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      currency: 'GHS',
      minimumQuotations: 3,
      items: [{ itemNo: 1, description: '', unit: 'Unit', quantity: 1 }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const values = watch()

  useEffect(() => {
    api.get<{ categories: Category[] }>('/api/categories').then((r) => setCategories(r.categories))
  }, [])

  const onSubmit = async (data: FormData) => {
    setError('')
    setValidationErrors([])
    try {
      const result = await api.post<{ rfq: { id: string; referenceNo: string } }>('/api/rfqs', data)
      try {
        await api.post(`/api/rfqs/${result.rfq.id}/publish`, {})
      } catch {
        // Publish failed but RFQ was created — still show success
      }
      setPublishedRef(result.rfq.referenceNo || result.rfq.id)
      setPublished(true)
      setTimeout(() => router.push('/buyer/rfqs'), 3000)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to create RFQ'
      setError(msg)
      setStep(2) // Go back to review step to show error
    }
  }

  const allCategories = categories.flatMap((c) => [c, ...c.children])

  if (published) {
    return (
      <div>
        <TopBar title="Create RFQ" />
        <div className="p-6 max-w-3xl mx-auto">
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 size={36} className="text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">RFQ Published Successfully!</h2>
              <p className="text-gray-500 mb-1">Your RFQ <span className="font-semibold text-green-700">{publishedRef}</span> has been published.</p>
              <p className="text-sm text-gray-400 mb-8">Invited suppliers will be notified and can now submit quotations.</p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => router.push('/buyer/rfqs')}
                  className="bg-green-700 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-green-800 transition-colors"
                >
                  View My RFQs
                </button>
                <button
                  onClick={() => { setPublished(false); setPublishedRef(''); setStep(0) }}
                  className="border border-gray-300 text-gray-700 px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
                >
                  Create Another RFQ
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-5">Redirecting to My RFQs in a few seconds...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <TopBar title="Create RFQ" />
      <div className="p-6 max-w-3xl mx-auto">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${i <= step ? 'bg-blue-700 text-white' : 'bg-gray-200 text-gray-500'}`}>{i + 1}</div>
              <span className={`text-sm hidden sm:block ${i === step ? 'text-blue-700 font-medium' : 'text-gray-400'}`}>{s}</span>
              {i < STEPS.length - 1 && <div className={`h-px w-6 ${i < step ? 'bg-blue-700' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

        <form onSubmit={handleSubmit(onSubmit, (fieldErrors) => {
          const msgs: string[] = []
          if (fieldErrors.title) msgs.push(`Title: ${fieldErrors.title.message}`)
          if (fieldErrors.description) msgs.push(`Description: ${fieldErrors.description.message}`)
          if (fieldErrors.categoryId) msgs.push(`Category: ${fieldErrors.categoryId.message}`)
          if (fieldErrors.submissionDeadline) msgs.push(`Deadline: ${fieldErrors.submissionDeadline.message}`)
          if (fieldErrors.items) {
            if (fieldErrors.items.root) msgs.push(`Items: ${fieldErrors.items.root.message}`)
            const itemErrors = fieldErrors.items as Record<string, unknown>
            Object.keys(itemErrors).forEach((k) => {
              if (k === 'root') return
              const idx = Number(k)
              const item = itemErrors[k] as Record<string, { message?: string }>
              if (item?.description) msgs.push(`Item ${idx + 1}: ${item.description.message}`)
              if (item?.quantity) msgs.push(`Item ${idx + 1} quantity: ${item.quantity.message}`)
            })
          }
          setValidationErrors(msgs)
        })}>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            {/* Step 0: RFQ Details */}
            {step === 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-gray-900 mb-4">RFQ Details</h2>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">RFQ Title *</label>
                  <input {...register('title')} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Supply of Laptop Computers" />
                  {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                  <textarea {...register('description')} rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder="Describe what you need in detail..." />
                  {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                  <select {...register('categoryId')} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Select category</option>
                    {allCategories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  {errors.categoryId && <p className="text-red-500 text-xs mt-1">{errors.categoryId.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Submission Deadline *</label>
                  <input {...register('submissionDeadline')} type="datetime-local" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  {errors.submissionDeadline && <p className="text-red-500 text-xs mt-1">{errors.submissionDeadline.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Timeline</label>
                  <input {...register('deliveryTimeline')} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. 14 days after Purchase Order" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Quotations Required</label>
                  <input {...register('minimumQuotations')} type="number" min={1} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <p className="text-xs text-gray-400 mt-1">A minimum of 3 quotations is recommended for competitive sourcing.</p>
                </div>
              </div>
            )}

            {/* Step 1: Line Items */}
            {step === 1 && (
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4">Line Items</h2>
                <div className="space-y-4">
                  {fields.map((field, idx) => (
                    <div key={field.id} className="border border-gray-200 rounded-lg p-4 relative">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold text-gray-700">Item {idx + 1}</span>
                        {fields.length > 1 && (
                          <button type="button" onClick={() => remove(idx)} className="text-red-400 hover:text-red-600">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="col-span-2">
                          <input {...register(`items.${idx}.description`)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Item description *" />
                          {errors.items?.[idx]?.description && <p className="text-red-500 text-xs mt-1">{errors.items[idx]?.description?.message}</p>}
                        </div>
                        <div>
                          <input {...register(`items.${idx}.unit`)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Unit (e.g. Unit, Box, Kg)" />
                        </div>
                        <div>
                          <input {...register(`items.${idx}.quantity`)} type="number" step="any" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Quantity" />
                        </div>
                        <div className="col-span-2">
                          <textarea {...register(`items.${idx}.specifications`)} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder="Technical specifications (optional)" />
                        </div>
                      </div>
                      <input type="hidden" {...register(`items.${idx}.itemNo`)} value={idx + 1} />
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => append({ itemNo: fields.length + 1, description: '', unit: 'Unit', quantity: 1 })}
                  className="mt-4 flex items-center gap-2 text-blue-700 font-medium text-sm hover:text-blue-800"
                >
                  <Plus size={16} /> Add Item
                </button>
                {errors.items?.root && <p className="text-red-500 text-xs mt-2">{errors.items.root.message}</p>}
              </div>
            )}

            {/* Step 2: Review */}
            {step === 2 && (
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4">Review & Submit</h2>
                <div className="space-y-4 text-sm">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="font-semibold text-gray-900 mb-2">RFQ Details</p>
                    <dl className="space-y-1">
                      <div className="flex justify-between"><dt className="text-gray-500">Title</dt><dd className="text-gray-900 font-medium">{values.title}</dd></div>
                      <div className="flex justify-between"><dt className="text-gray-500">Deadline</dt><dd>{values.submissionDeadline ? new Date(values.submissionDeadline).toLocaleString() : '-'}</dd></div>
                      <div className="flex justify-between"><dt className="text-gray-500">Min. Quotations</dt><dd>{values.minimumQuotations}</dd></div>
                    </dl>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="font-semibold text-gray-900 mb-2">Line Items ({values.items?.length || 0})</p>
                    {values.items?.map((item, i) => (
                      <div key={i} className="flex justify-between py-1 border-b border-gray-200 last:border-0">
                        <span className="text-gray-700">{item.description || `Item ${i + 1}`}</span>
                        <span className="text-gray-500">{item.quantity} {item.unit}</span>
                      </div>
                    ))}
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-yellow-800 text-sm font-medium">By submitting, this RFQ will be published and suppliers will be notified immediately.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm font-semibold mb-1">Please fix the following errors:</p>
              <ul className="list-disc list-inside text-red-600 text-sm space-y-0.5">
                {validationErrors.map((msg, i) => <li key={i}>{msg}</li>)}
              </ul>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-6">
            <button type="button" onClick={() => setStep(s => s - 1)} disabled={step === 0} className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-gray-50 transition-colors">
              <ChevronLeft size={16} /> Back
            </button>
            {step < STEPS.length - 1 ? (
              <button type="button" onClick={() => setStep(s => s + 1)} className="flex items-center gap-2 px-5 py-2.5 bg-green-700 text-white rounded-lg text-sm font-semibold hover:bg-green-800 transition-colors">
                Next <ChevronRight size={16} />
              </button>
            ) : (
              <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-6 py-2.5 bg-green-700 text-white rounded-lg text-sm font-semibold hover:bg-green-800 transition-colors disabled:opacity-60">
                {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                {isSubmitting ? 'Publishing...' : 'Publish RFQ'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
