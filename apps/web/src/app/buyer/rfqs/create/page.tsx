'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { TopBar } from '@/components/layout/TopBar'
import { api } from '@/lib/api'
import { Plus, Trash2, Loader2, ChevronRight, ChevronLeft } from 'lucide-react'

const schema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(10, 'Provide a detailed description'),
  type: z.enum(['GOODS', 'WORKS', 'SERVICES']),
  categoryId: z.string().min(1, 'Select a category'),
  budgetEstimate: z.coerce.number().positive('Enter a valid budget').optional(),
  currency: z.string().default('GHS'),
  submissionDeadline: z.string().min(1, 'Set a deadline'),
  deliveryTimeline: z.string().optional(),
  evaluationCriteria: z.string().optional(),
  termsConditions: z.string().optional(),
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

const STEPS = ['RFQ Details', 'Line Items', 'Evaluation', 'Review & Submit']

export default function CreateRfqPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [categories, setCategories] = useState<Category[]>([])
  const [error, setError] = useState('')

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
    try {
      const rfq = await api.post<{ rfq: { id: string } }>('/api/rfqs', data)
      // Publish immediately
      await api.post(`/api/rfqs/${rfq.rfq.id}/publish`, {})
      router.push(`/buyer/rfqs/${rfq.rfq.id}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create RFQ')
    }
  }

  const allCategories = categories.flatMap((c) => [c, ...c.children])

  return (
    <div>
      <TopBar title="Create RFQ" />
      <div className="p-6 max-w-3xl mx-auto">
        {/* Progress */}
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
            {/* Step 0: RFQ Details */}
            {step === 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-gray-900 mb-4">RFQ Details</h2>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">RFQ Title *</label>
                  <input {...register('title')} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="e.g. Supply of Laptop Computers" />
                  {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                  <textarea {...register('description')} rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" placeholder="Describe what you need in detail..." />
                  {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                    <select {...register('type')} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                      <option value="">Select type</option>
                      <option value="GOODS">Goods</option>
                      <option value="WORKS">Works</option>
                      <option value="SERVICES">Services</option>
                    </select>
                    {errors.type && <p className="text-red-500 text-xs mt-1">{errors.type.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                    <select {...register('categoryId')} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                      <option value="">Select category</option>
                      {allCategories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    {errors.categoryId && <p className="text-red-500 text-xs mt-1">{errors.categoryId.message}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Budget Estimate (GHS)</label>
                    <input {...register('budgetEstimate')} type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="0.00" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Submission Deadline *</label>
                    <input {...register('submissionDeadline')} type="datetime-local" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                    {errors.submissionDeadline && <p className="text-red-500 text-xs mt-1">{errors.submissionDeadline.message}</p>}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Timeline</label>
                  <input {...register('deliveryTimeline')} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="e.g. 14 days after Purchase Order" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Quotations Required</label>
                  <input {...register('minimumQuotations')} type="number" min={1} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
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
                          <input {...register(`items.${idx}.description`)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="Item description *" />
                          {errors.items?.[idx]?.description && <p className="text-red-500 text-xs mt-1">{errors.items[idx]?.description?.message}</p>}
                        </div>
                        <div>
                          <input {...register(`items.${idx}.unit`)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="Unit (e.g. Unit, Box, Kg)" />
                        </div>
                        <div>
                          <input {...register(`items.${idx}.quantity`)} type="number" step="any" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="Quantity" />
                        </div>
                        <div className="col-span-2">
                          <textarea {...register(`items.${idx}.specifications`)} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" placeholder="Technical specifications (optional)" />
                        </div>
                      </div>
                      <input type="hidden" {...register(`items.${idx}.itemNo`)} value={idx + 1} />
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => append({ itemNo: fields.length + 1, description: '', unit: 'Unit', quantity: 1 })}
                  className="mt-4 flex items-center gap-2 text-green-700 font-medium text-sm hover:text-green-800"
                >
                  <Plus size={16} /> Add Item
                </button>
                {errors.items?.root && <p className="text-red-500 text-xs mt-2">{errors.items.root.message}</p>}
              </div>
            )}

            {/* Step 2: Evaluation Criteria */}
            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Evaluation & Terms</h2>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Evaluation Criteria</label>
                  <textarea {...register('evaluationCriteria')} rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" placeholder="e.g. Price (40%), Technical Compliance (40%), Delivery Timeline (20%)" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Terms & Conditions</label>
                  <textarea {...register('termsConditions')} rows={4} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" placeholder="Enter any additional terms and conditions..." />
                </div>
              </div>
            )}

            {/* Step 3: Review */}
            {step === 3 && (
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4">Review & Submit</h2>
                <div className="space-y-4 text-sm">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="font-semibold text-gray-900 mb-2">RFQ Details</p>
                    <dl className="space-y-1">
                      <div className="flex justify-between"><dt className="text-gray-500">Title</dt><dd className="text-gray-900 font-medium">{values.title}</dd></div>
                      <div className="flex justify-between"><dt className="text-gray-500">Type</dt><dd>{values.type}</dd></div>
                      <div className="flex justify-between"><dt className="text-gray-500">Budget Estimate</dt><dd>GHS {values.budgetEstimate?.toLocaleString() || 'Not specified'}</dd></div>
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
