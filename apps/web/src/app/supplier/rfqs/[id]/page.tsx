'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { TopBar } from '@/components/layout/TopBar'
import { api } from '@/lib/api'
import { formatCurrency, timeUntilDeadline, rfqStatusColor } from '@/lib/utils'
import { Clock, Loader2, Send, CheckCircle2 } from 'lucide-react'

interface RfqDetail {
  id: string; referenceNo: string; title: string; description: string
  status: string; type: string; submissionDeadline: string
  deliveryTimeline: string; evaluationCriteria: string; termsConditions: string
  category: { name: string }
  entity: { name: string }
  items: Array<{ id: string; itemNo: number; description: string; unit: string; quantity: number; specifications: string }>
  _count: { quotations: number }
}

const quotationSchema = z.object({
  currency: z.string().default('GHS'),
  vatAmount: z.coerce.number().optional(),
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

  const deadlinePassed = rfq ? new Date() > new Date(rfq.submissionDeadline) : false

  const { register, control, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<QuotationData>({ resolver: zodResolver(quotationSchema) })
  const { fields } = useFieldArray({ control, name: 'items' })
  const watchItems = watch('items')

  useEffect(() => {
    api.get<{ rfq: RfqDetail }>(`/api/rfqs/${id}`).then((r) => {
      setRfq(r.rfq)
    }).finally(() => setLoading(false))
  }, [id])

  const total = watchItems?.reduce((sum, item, i) => {
    const qty = rfq?.items[i]?.quantity || 0
    return sum + (Number(item?.unitPrice || 0) * Number(qty))
  }, 0) ?? 0

  const onSubmit = async (data: QuotationData) => {
    setError('')
    const payload = {
      ...data,
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
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${rfqStatusColor(rfq.status)}`}>{rfq.status}</span>
              <h1 className="text-xl font-bold text-gray-900 mt-2">{rfq.title}</h1>
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

        {/* Opt-in button for chatroom */}
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
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            {submitted ? (
              <div className="text-center py-12">
                <CheckCircle2 size={52} className="text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900">Quotation Submitted!</h3>
                <p className="text-gray-500 mt-2 mb-6">Your quotation has been successfully submitted and is now locked.</p>
                <button onClick={() => router.push('/supplier/quotations')} className="bg-green-700 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-green-800">View My Quotations</button>
              </div>
            ) : deadlinePassed ? (
              <div className="text-center py-12">
                <Clock size={48} className="text-red-400 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">Submission deadline has passed</p>
                <p className="text-sm text-gray-400 mt-1">This RFQ no longer accepts quotations.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)}>
                <h3 className="font-semibold text-gray-900 mb-4">Submit Quotation</h3>
                {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

                <div className="mb-5">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Item Pricing</h4>
                  <div className="space-y-3">
                    {rfq.items.map((item, i) => (
                      <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between mb-3">
                          <p className="text-sm font-medium text-gray-900">{item.itemNo}. {item.description}</p>
                          <span className="text-xs text-gray-400">Qty: {item.quantity} {item.unit}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Unit Price (GHS) *</label>
                            <input {...register(`items.${i}.unitPrice`)} type="number" step="0.01" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="0.00" />
                            {errors.items?.[i]?.unitPrice && <p className="text-red-500 text-xs mt-1">{errors.items[i]?.unitPrice?.message}</p>}
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Line Total</label>
                            <div className="px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-700 font-medium">
                              {formatCurrency((watchItems?.[i]?.unitPrice || 0) * Number(item.quantity))}
                            </div>
                          </div>
                        </div>
                        <input type="hidden" {...register(`items.${i}.rfqItemId`)} value={item.id} />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-green-50 rounded-lg p-4 mb-5 flex justify-between items-center">
                  <span className="font-semibold text-gray-900">Total Quotation Amount</span>
                  <span className="text-xl font-bold text-green-700">{formatCurrency(total)}</span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Days</label>
                    <input {...register('deliveryDays')} type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="e.g. 14" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Validity (days)</label>
                    <input {...register('validityDays')} type="number" defaultValue={30} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                  </div>
                </div>

                <div className="mb-5">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
                  <textarea {...register('notes')} rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" placeholder="Any additional information, warranty terms, etc." />
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-5 text-xs text-yellow-800">
                  Once submitted, your quotation is final and cannot be edited. Ensure all pricing is accurate.
                </div>

                <button type="submit" disabled={isSubmitting} className="w-full flex items-center justify-center gap-2 bg-green-700 text-white py-3 rounded-lg font-semibold hover:bg-green-800 transition-colors disabled:opacity-60">
                  {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                  {isSubmitting ? 'Submitting...' : 'Submit Quotation'}
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
            <div className="w-7 h-7 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">{m.sender.firstName[0]}</div>
            <div>
              <p className="text-xs text-gray-400">{m.sender.firstName} {m.sender.lastName} <span className="bg-gray-100 text-gray-500 px-1 rounded ml-1">{m.sender.role}</span></p>
              <p className="text-sm text-gray-800 mt-0.5">{m.message}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={msg} onChange={(e) => setMsg(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="Ask a question..." className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
        <button onClick={send} disabled={sending} className="bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-800 disabled:opacity-60">Send</button>
      </div>
    </div>
  )
}
