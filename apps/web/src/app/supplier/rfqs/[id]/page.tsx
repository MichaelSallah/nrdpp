'use client'
import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { TopBar } from '@/components/layout/TopBar'
import { api } from '@/lib/api'
import { formatCurrency, timeUntilDeadline, rfqStatusColor } from '@/lib/utils'
import { Clock, Loader2, Send, CheckCircle2, Calculator, Receipt, Info, ToggleLeft, ToggleRight } from 'lucide-react'

interface RfqDetail {
  id: string; referenceNo: string; title: string; description: string
  status: string; type: string; submissionDeadline: string
  deliveryTimeline: string; evaluationCriteria: string; termsConditions: string
  category: { name: string }
  entity: { name: string; sector?: string }
  items: Array<{ id: string; itemNo: number; description: string; unit: string; quantity: number; specifications: string }>
  _count: { quotations: number }
}

// ── Ghana Tax Rates (mirrored from API) ──
// COVID-19 Health Recovery Levy (Act 1068) abolished — removed
const GHANA_TAXES = [
  { key: 'vat',       label: 'VAT',                    rate: 0.15,  legalRef: 'Act 870' },
  { key: 'nhil',      label: 'NHIL',                   rate: 0.025, legalRef: 'Act 852' },
  { key: 'getfund',   label: 'GETFund Levy',           rate: 0.025, legalRef: 'Act 581' },
] as const
const TOTAL_TAX_RATE = GHANA_TAXES.reduce((s, t) => s + t.rate, 0) // 20%

const quotationSchema = z.object({
  currency: z.string().default('GHS'),
  taxMode: z.enum(['AUTO', 'MANUAL']).default('AUTO'),
  manualTaxAmount: z.coerce.number().min(0).optional(),
  deliveryDays: z.coerce.number().positive().optional(),
  validityDays: z.coerce.number().default(30),
  notes: z.string().optional(),
  items: z.array(z.object({
    rfqItemId: z.string(),
    unitPrice: z.coerce.number().positive('Enter a valid price'),
    notes: z.string().optional(),
  })),
})
type QuotationData = z.infer<typeof quotationSchema>

export default function SupplierRfqDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [rfq, setRfq] = useState<RfqDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'details' | 'quote' | 'chat'>('details')
  const [taxMode, setTaxMode] = useState<'AUTO' | 'MANUAL'>('AUTO')
  const [manualTaxAmount, setManualTaxAmount] = useState<number>(0)

  const deadlinePassed = rfq ? new Date() > new Date(rfq.submissionDeadline) : false

  const { register, control, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<QuotationData>({ resolver: zodResolver(quotationSchema) })
  const { fields } = useFieldArray({ control, name: 'items' })
  const watchItems = watch('items')

  useEffect(() => {
    api.get<{ rfq: RfqDetail }>(`/api/rfqs/${id}`).then((r) => {
      setRfq(r.rfq)
    }).finally(() => setLoading(false))
  }, [id])

  // ── Live price & tax calculations ──
  const calculations = useMemo(() => {
    if (!rfq || !watchItems) return null

    const lineItems = rfq.items.map((item, i) => {
      const unitPrice = Number(watchItems[i]?.unitPrice || 0)
      const quantity = Number(item.quantity)
      const lineTotal = Math.round(unitPrice * quantity * 100) / 100
      return { ...item, unitPrice, lineTotal }
    })

    const subtotal = Math.round(lineItems.reduce((s, l) => s + l.lineTotal, 0) * 100) / 100

    if (taxMode === 'MANUAL') {
      const totalTax = Math.round(manualTaxAmount * 100) / 100
      const grandTotal = Math.round((subtotal + totalTax) * 100) / 100
      return { lineItems, subtotal, taxes: null, totalTax, grandTotal }
    }

    // AUTO mode: compute individual taxes
    const taxes = GHANA_TAXES.map((t) => ({
      ...t,
      amount: Math.round(subtotal * t.rate * 100) / 100,
    }))

    const totalTax = Math.round(taxes.reduce((s, t) => s + t.amount, 0) * 100) / 100
    const grandTotal = Math.round((subtotal + totalTax) * 100) / 100

    return { lineItems, subtotal, taxes, totalTax, grandTotal }
  }, [rfq, watchItems, taxMode, manualTaxAmount])

  const onSubmit = async (data: QuotationData) => {
    setError('')
    const payload = {
      ...data,
      taxMode,
      manualTaxAmount: taxMode === 'MANUAL' ? manualTaxAmount : undefined,
      items: rfq!.items.map((item, i) => ({
        rfqItemId: item.id,
        unitPrice: data.items[i]?.unitPrice || 0,
        notes: data.items[i]?.notes,
      })),
    }
    try {
      await api.post(`/api/rfqs/${id}/quotations`, payload)
      setSubmitted(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Submission failed')
    }
  }

  if (loading) return <div className="flex items-center justify-center p-8 text-gray-400">Loading...</div>
  if (!rfq) return <div className="p-8 text-center text-red-500">RFQ not found</div>

  return (
    <div>
      <TopBar title={rfq.referenceNo} />
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header card */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${rfqStatusColor(rfq.status)}`}>{rfq.status}</span>
                {rfq.entity.sector && (
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${rfq.entity.sector === 'GOVERNMENT' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                    {rfq.entity.sector === 'GOVERNMENT' ? 'Government' : 'Private'}
                  </span>
                )}
              </div>
              <h1 className="text-xl font-bold text-gray-900">{rfq.title}</h1>
              <p className="text-sm text-gray-500">{rfq.entity.name} · {rfq.category.name}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Deadline</p>
              <p className={`font-semibold ${deadlinePassed ? 'text-red-600' : 'text-orange-600'}`}>
                <Clock size={14} className="inline mr-1" />
                {timeUntilDeadline(rfq.submissionDeadline)}
              </p>
            </div>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1 w-fit">
          {(['details', 'quote', 'chat'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-colors ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{t === 'quote' ? 'Submit Quote' : t}</button>
          ))}
        </div>

        {tab === 'details' && (
          <div className="space-y-5">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Description</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{rfq.description}</p>
              {rfq.evaluationCriteria && <div className="mt-4 pt-4 border-t border-gray-100"><p className="text-xs text-gray-400 mb-1">Evaluation Criteria</p><p className="text-sm text-gray-700">{rfq.evaluationCriteria}</p></div>}
              {rfq.deliveryTimeline && <div className="mt-4 pt-4 border-t border-gray-100"><p className="text-xs text-gray-400 mb-1">Required Delivery Timeline</p><p className="text-sm text-gray-700">{rfq.deliveryTimeline}</p></div>}
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Required Items</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50"><tr><th className="text-left px-3 py-2 text-xs text-gray-500">#</th><th className="text-left px-3 py-2 text-xs text-gray-500">Item</th><th className="text-left px-3 py-2 text-xs text-gray-500">Qty</th><th className="text-left px-3 py-2 text-xs text-gray-500">Unit</th></tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {rfq.items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-3 py-2.5 text-gray-400">{item.itemNo}</td>
                        <td className="px-3 py-2.5 text-gray-900">{item.description}{item.specifications && <p className="text-xs text-gray-400">{item.specifications}</p>}</td>
                        <td className="px-3 py-2.5 text-gray-700">{item.quantity}</td>
                        <td className="px-3 py-2.5 text-gray-500">{item.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {tab === 'quote' && (
          <div className="space-y-5">
            {submitted ? (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="text-center py-12">
                  <CheckCircle2 size={52} className="text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900">Quotation Submitted!</h3>
                  <p className="text-gray-500 mt-2 mb-6">Your quotation has been successfully submitted and is now locked.</p>
                  <button onClick={() => router.push('/supplier/quotations')} className="bg-green-700 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-green-800">View My Quotations</button>
                </div>
              </div>
            ) : deadlinePassed ? (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="text-center py-12">
                  <Clock size={48} className="text-red-400 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium">Submission deadline has passed</p>
                  <p className="text-sm text-gray-400 mt-1">This RFQ no longer accepts quotations.</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)}>
                {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

                {/* ── Item Pricing Table ── */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Receipt size={18} className="text-blue-700" />
                    <h3 className="font-semibold text-gray-900">Item Pricing</h3>
                  </div>

                  {/* Header */}
                  <div className="hidden sm:grid sm:grid-cols-12 gap-3 px-4 py-2 bg-gray-50 rounded-lg mb-2">
                    <div className="col-span-1 text-xs font-medium text-gray-500">#</div>
                    <div className="col-span-4 text-xs font-medium text-gray-500">Description</div>
                    <div className="col-span-1 text-xs font-medium text-gray-500 text-center">Qty</div>
                    <div className="col-span-1 text-xs font-medium text-gray-500 text-center">Unit</div>
                    <div className="col-span-2 text-xs font-medium text-gray-500 text-right">Unit Price (GHS)</div>
                    <div className="col-span-3 text-xs font-medium text-gray-500 text-right">Total Price (GHS)</div>
                  </div>

                  {/* Items */}
                  <div className="divide-y divide-gray-100">
                    {rfq.items.map((item, i) => {
                      const lineTotal = calculations?.lineItems[i]?.lineTotal || 0
                      return (
                        <div key={item.id} className="py-3">
                          {/* Desktop row */}
                          <div className="hidden sm:grid sm:grid-cols-12 gap-3 items-center px-4">
                            <div className="col-span-1 text-sm text-gray-400 font-medium">{item.itemNo}</div>
                            <div className="col-span-4">
                              <p className="text-sm font-medium text-gray-900">{item.description}</p>
                              {item.specifications && <p className="text-xs text-gray-400 mt-0.5">{item.specifications}</p>}
                            </div>
                            <div className="col-span-1 text-sm text-gray-700 text-center font-medium">{item.quantity}</div>
                            <div className="col-span-1 text-xs text-gray-500 text-center">{item.unit}</div>
                            <div className="col-span-2">
                              <input
                                {...register(`items.${i}.unitPrice`)}
                                type="number"
                                step="0.01"
                                min="0"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="0.00"
                              />
                              {errors.items?.[i]?.unitPrice && <p className="text-red-500 text-xs mt-1">{errors.items[i]?.unitPrice?.message}</p>}
                            </div>
                            <div className="col-span-3 text-right">
                              <span className={`text-sm font-semibold ${lineTotal > 0 ? 'text-gray-900' : 'text-gray-300'}`}>
                                {formatCurrency(lineTotal)}
                              </span>
                            </div>
                          </div>

                          {/* Mobile card */}
                          <div className="sm:hidden px-2">
                            <div className="flex justify-between mb-2">
                              <p className="text-sm font-medium text-gray-900">{item.itemNo}. {item.description}</p>
                            </div>
                            {item.specifications && <p className="text-xs text-gray-400 mb-2">{item.specifications}</p>}
                            <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                              <span>Qty: <strong className="text-gray-700">{item.quantity}</strong></span>
                              <span>Unit: <strong className="text-gray-700">{item.unit}</strong></span>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Unit Price (GHS)</label>
                                <input
                                  {...register(`items.${i}.unitPrice`)}
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  placeholder="0.00"
                                />
                                {errors.items?.[i]?.unitPrice && <p className="text-red-500 text-xs mt-1">{errors.items[i]?.unitPrice?.message}</p>}
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Total Price</label>
                                <div className={`px-3 py-2 bg-gray-50 rounded-lg text-sm font-semibold ${lineTotal > 0 ? 'text-gray-900' : 'text-gray-300'}`}>
                                  {formatCurrency(lineTotal)}
                                </div>
                              </div>
                            </div>
                          </div>

                          <input type="hidden" {...register(`items.${i}.rfqItemId`)} value={item.id} />
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* ── Tax Mode Selector + Calculation Breakdown ── */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Calculator size={18} className="text-blue-700" />
                      <h3 className="font-semibold text-gray-900">Tax Calculation</h3>
                    </div>
                  </div>

                  {/* Tax Mode Toggle */}
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg mb-4">
                    <button
                      type="button"
                      onClick={() => setTaxMode('AUTO')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        taxMode === 'AUTO'
                          ? 'bg-green-700 text-white shadow-sm'
                          : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <ToggleLeft size={16} />
                      Automated Tax
                    </button>
                    <button
                      type="button"
                      onClick={() => setTaxMode('MANUAL')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        taxMode === 'MANUAL'
                          ? 'bg-green-700 text-white shadow-sm'
                          : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <ToggleRight size={16} />
                      Manual Tax Entry
                    </button>
                  </div>

                  <div className="space-y-0">
                    {/* Subtotal */}
                    <div className="flex justify-between items-center py-3 border-b border-gray-100">
                      <span className="text-sm font-medium text-gray-700">Subtotal (before tax)</span>
                      <span className="text-base font-semibold text-gray-900">{formatCurrency(calculations?.subtotal || 0)}</span>
                    </div>

                    {taxMode === 'AUTO' ? (
                      <>
                        {/* Automated tax breakdown */}
                        <div className="py-3 border-b border-gray-200">
                          <div className="flex items-center gap-1.5 mb-2">
                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Applicable Taxes (Auto-calculated)</span>
                            <div className="group relative">
                              <Info size={13} className="text-gray-400 cursor-help" />
                              <div className="hidden group-hover:block absolute z-10 left-0 top-5 w-64 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-lg">
                                Tax rates are based on Ghana&apos;s current tax legislation. All rates are applied on the subtotal amount.
                              </div>
                            </div>
                          </div>
                          <div className="space-y-2 pl-2">
                            {GHANA_TAXES.map((tax) => {
                              const amount = calculations?.taxes?.find((t) => t.key === tax.key)?.amount || 0
                              return (
                                <div key={tax.key} className="flex justify-between items-center">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-600">{tax.label}</span>
                                    <span className="text-xs text-gray-400">({(tax.rate * 100).toFixed(1)}%)</span>
                                    <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{tax.legalRef}</span>
                                  </div>
                                  <span className={`text-sm font-medium ${amount > 0 ? 'text-gray-700' : 'text-gray-300'}`}>
                                    {formatCurrency(amount)}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        </div>

                        {/* Total Tax */}
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-sm text-gray-600">Total Tax ({(TOTAL_TAX_RATE * 100).toFixed(0)}%)</span>
                          <span className={`text-sm font-semibold ${(calculations?.totalTax || 0) > 0 ? 'text-orange-600' : 'text-gray-300'}`}>
                            {formatCurrency(calculations?.totalTax || 0)}
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Manual tax input */}
                        <div className="py-3 border-b border-gray-200">
                          <div className="flex items-center gap-1.5 mb-3">
                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Manual Tax Entry</span>
                          </div>
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                            <p className="text-xs text-blue-700">
                              Enter the total tax amount manually. Use this option if your tax calculations differ from the standard rates
                              or if special exemptions apply.
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Total Tax (GHS)</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={manualTaxAmount || ''}
                              onChange={(e) => setManualTaxAmount(Number(e.target.value) || 0)}
                              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Enter total tax amount"
                            />
                          </div>
                        </div>

                        {/* Total Tax display */}
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-sm text-gray-600">Total Tax (Manual)</span>
                          <span className={`text-sm font-semibold ${manualTaxAmount > 0 ? 'text-orange-600' : 'text-gray-300'}`}>
                            {formatCurrency(manualTaxAmount)}
                          </span>
                        </div>
                      </>
                    )}

                    {/* Grand Total */}
                    <div className="flex justify-between items-center py-4 bg-green-50 -mx-5 px-5 -mb-5 rounded-b-xl">
                      <div>
                        <span className="text-base font-bold text-gray-900">Grand Total</span>
                        <p className="text-xs text-gray-500">
                          {taxMode === 'AUTO' ? 'Inclusive of all applicable taxes' : 'Subtotal + manually entered tax'}
                        </p>
                      </div>
                      <span className="text-2xl font-bold text-green-700">{formatCurrency(calculations?.grandTotal || 0)}</span>
                    </div>
                  </div>
                </div>

                {/* ── Delivery & Validity ── */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Delivery & Validity</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Days</label>
                      <input {...register('deliveryDays')} type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. 14" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Quote Validity (days)</label>
                      <input {...register('validityDays')} type="number" defaultValue={30} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                </div>

                {/* ── Notes ── */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Additional Notes</label>
                  <textarea {...register('notes')} rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder="Any additional information, warranty terms, payment terms, etc." />
                </div>

                {/* ── Warning + Submit ── */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-5 text-xs text-yellow-800">
                  <strong>Important:</strong> Once submitted, your quotation is final and cannot be edited. Ensure all unit prices and quantities are accurate before submitting.
                </div>

                <button type="submit" disabled={isSubmitting || (calculations?.subtotal || 0) === 0} className="w-full flex items-center justify-center gap-2 bg-green-700 text-white py-3 rounded-lg font-semibold hover:bg-green-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                  {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                  {isSubmitting ? 'Submitting...' : `Submit Quotation — ${formatCurrency(calculations?.grandTotal || 0)}`}
                </button>
              </form>
            )}
          </div>
        )}

        {tab === 'chat' && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <SupplierChatRoom rfqId={id} />
          </div>
        )}
      </div>
    </div>
  )
}

function SupplierChatRoom({ rfqId }: { rfqId: string }) {
  const [messages, setMessages] = useState<Array<{ id: string; message: string; createdAt: string; sender: { firstName: string; lastName: string; role: string } }>>([])
  const [msg, setMsg] = useState('')
  const [sending, setSending] = useState(false)
  const [optedIn, setOptedIn] = useState(false)
  const [joining, setJoining] = useState(false)

  const optIn = async () => {
    setJoining(true)
    try {
      await api.post(`/api/rfqs/${rfqId}/chat/opt-in`, {})
      setOptedIn(true)
      const r = await api.get<{ messages: typeof messages }>(`/api/rfqs/${rfqId}/chat`)
      setMessages(r.messages)
    } catch { setOptedIn(false) }
    finally { setJoining(false) }
  }

  const send = async () => {
    if (!msg.trim()) return
    setSending(true)
    try {
      const res = await api.post<{ message: (typeof messages)[0] }>(`/api/rfqs/${rfqId}/chat`, { message: msg })
      setMessages((m) => [...m, res.message])
      setMsg('')
    } finally { setSending(false) }
  }

  if (!optedIn) return (
    <div className="text-center py-10">
      <p className="text-gray-600 mb-4">Opt into the clarification chatroom to ask questions about this RFQ.</p>
      <button onClick={optIn} disabled={joining} className="bg-green-700 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-green-800 disabled:opacity-60">
        {joining ? 'Joining...' : 'Join Chatroom'}
      </button>
    </div>
  )

  return (
    <div>
      <h3 className="font-semibold text-gray-900 mb-3">Clarification Chatroom</h3>
      <div className="h-72 overflow-y-auto border border-gray-100 rounded-lg p-3 mb-3 space-y-3">
        {messages.map((m) => (
          <div key={m.id} className="flex gap-2">
            <div className="w-7 h-7 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">{m.sender.firstName[0]}</div>
            <div>
              <p className="text-xs text-gray-400">{m.sender.firstName} {m.sender.lastName} <span className="bg-gray-100 text-gray-500 px-1 rounded ml-1">{m.sender.role}</span></p>
              <p className="text-sm text-gray-800 mt-0.5">{m.message}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={msg} onChange={(e) => setMsg(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="Ask a question..." className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <button onClick={send} disabled={sending} className="bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-800 disabled:opacity-60">Send</button>
      </div>
    </div>
  )
}
