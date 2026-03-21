'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { TopBar } from '@/components/layout/TopBar'
import { api } from '@/lib/api'
import { formatCurrency, formatDateTime, rfqStatusColor, timeUntilDeadline } from '@/lib/utils'
import { Clock, Users, MessageSquare, Award, BarChart3, FileText, CheckCircle2 } from 'lucide-react'

interface RfqDetail {
  id: string; referenceNo: string; title: string; description: string
  status: string; type: string; budgetEstimate: string; currency: string
  submissionDeadline: string; deliveryTimeline: string; evaluationCriteria: string
  minimumQuotations: number; publishedAt: string
  category: { name: string }
  entity: { name: string; code: string }
  createdBy: { firstName: string; lastName: string }
  items: Array<{ id: string; itemNo: number; description: string; unit: string; quantity: number; specifications: string }>
  award: { supplier: { companyName: string } } | null
  _count: { quotations: number; suppliers: number; chatMessages: number }
}

interface Quotation {
  id: string; totalAmount: string; currency: string; deliveryDays: number | null
  submittedAt: string; status: string; taxMode: string
  vatAmount: string | null; nhilAmount: string | null; getfundAmount: string | null
  totalTax: string | null; grandTotal: string | null
  supplier: { id: string; companyName: string; riskScore: number }
  evaluation: { totalScore: number; priceRank: number } | null
}

export default function BuyerRfqDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [rfq, setRfq] = useState<RfqDetail | null>(null)
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [tab, setTab] = useState<'overview' | 'quotations' | 'chat' | 'audit'>('overview')
  const [loading, setLoading] = useState(true)
  const [awardingId, setAwardingId] = useState<string | null>(null)
  const [awardModal, setAwardModal] = useState<Quotation | null>(null)
  const [justification, setJustification] = useState('')
  const [awardError, setAwardError] = useState('')

  const deadlinePassed = rfq ? new Date() > new Date(rfq.submissionDeadline) : false

  useEffect(() => {
    api.get<{ rfq: RfqDetail }>(`/api/rfqs/${id}`).then((r) => setRfq(r.rfq)).finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (tab === 'quotations' && deadlinePassed) {
      api.get<{ quotations: Quotation[] }>(`/api/rfqs/${id}/quotations`).then((r) => setQuotations(r.quotations)).catch(() => {})
    }
  }, [tab, id, deadlinePassed])

  const handleAward = async () => {
    if (!awardModal || justification.length < 10) return
    setAwardingId(awardModal.id)
    setAwardError('')
    try {
      await api.post(`/api/rfqs/${id}/award`, {
        supplierId: awardModal.supplier.id,
        quotationId: awardModal.id,
        justification,
      })
      setAwardModal(null)
      setJustification('')
      // Reload page data
      const r = await api.get<{ rfq: RfqDetail }>(`/api/rfqs/${id}`)
      setRfq(r.rfq)
      setTab('quotations')
    } catch (e: unknown) {
      setAwardError(e instanceof Error ? e.message : 'Failed to award')
    } finally { setAwardingId(null) }
  }

  if (loading) return <div className="flex-1 flex items-center justify-center p-8 text-gray-400">Loading...</div>
  if (!rfq) return <div className="p-8 text-center text-red-500">RFQ not found</div>

  return (
    <div>
      <TopBar title={rfq.referenceNo} />
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${rfqStatusColor(rfq.status)}`}>{rfq.status}</span>
                <span className="text-xs text-gray-400">{rfq.type} • {rfq.category.name}</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900">{rfq.title}</h1>
              <p className="text-sm text-gray-500 mt-1">{rfq.entity.name}</p>
            </div>
            <div className="flex gap-2">
              {rfq.status === 'OPEN' && (
                <div className="text-right">
                  <p className="text-xs text-gray-400">Deadline</p>
                  <p className={`text-sm font-semibold ${deadlinePassed ? 'text-red-600' : 'text-orange-600'}`}>
                    {timeUntilDeadline(rfq.submissionDeadline)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-5 border-t border-gray-100">
            {[
              { label: 'Suppliers Invited', value: rfq._count.suppliers, icon: Users },
              { label: 'Quotations Received', value: rfq._count.quotations, icon: FileText },
              { label: 'Chat Messages', value: rfq._count.chatMessages, icon: MessageSquare },
              { label: 'Budget Estimate', value: rfq.budgetEstimate ? formatCurrency(rfq.budgetEstimate) : 'N/A', icon: BarChart3 },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1 w-fit">
          {(['overview', 'quotations', 'chat', 'audit'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-colors ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Description</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{rfq.description}</p>
              {rfq.deliveryTimeline && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-400 mb-1">Delivery Timeline</p>
                  <p className="text-sm text-gray-700">{rfq.deliveryTimeline}</p>
                </div>
              )}
              {rfq.evaluationCriteria && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-400 mb-1">Evaluation Criteria</p>
                  <p className="text-sm text-gray-700">{rfq.evaluationCriteria}</p>
                </div>
              )}
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Line Items ({rfq.items.length})</h3>
              <div className="space-y-3">
                {rfq.items.map((item) => (
                  <div key={item.id} className="border border-gray-100 rounded-lg p-3">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-900">{item.itemNo}. {item.description}</span>
                      <span className="text-sm text-gray-500">{item.quantity} {item.unit}</span>
                    </div>
                    {item.specifications && <p className="text-xs text-gray-400 mt-1">{item.specifications}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'quotations' && (
          <div className="bg-white rounded-xl border border-gray-200">
            {!deadlinePassed ? (
              <div className="p-8 text-center">
                <Clock size={40} className="text-orange-400 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">Quotations are locked until deadline</p>
                <p className="text-sm text-gray-400 mt-1">{timeUntilDeadline(rfq.submissionDeadline)}</p>
              </div>
            ) : quotations.length === 0 ? (
              <div className="p-8 text-center text-gray-400">No quotations received.</div>
            ) : (
              <div>
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">{quotations.length} Quotation{quotations.length !== 1 ? 's' : ''} Received</h3>
                  {rfq._count.quotations < rfq.minimumQuotations && (
                    <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">Below minimum ({rfq.minimumQuotations} required)</span>
                  )}
                </div>
                <div className="divide-y divide-gray-100">
                  {quotations.map((q, i) => (
                    <div key={q.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">{i + 1}</span>
                            <p className="font-medium text-gray-900">{q.supplier.companyName}</p>
                          </div>
                          <p className="text-xs text-gray-400 ml-8">Submitted {formatDateTime(q.submittedAt)}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-bold text-green-700 text-lg">{formatCurrency(q.grandTotal || q.totalAmount, q.currency)}</p>
                            {q.deliveryDays && <p className="text-xs text-gray-400">{q.deliveryDays} days delivery</p>}
                          </div>
                          {rfq.status !== 'AWARDED' && (
                            <button
                              onClick={() => { setAwardModal(q); setJustification(''); setAwardError('') }}
                              className="flex items-center gap-1.5 bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-green-800"
                            >
                              <Award size={14} /> Award
                            </button>
                          )}
                          {rfq.status === 'AWARDED' && rfq.award?.supplier.companyName === q.supplier.companyName && (
                            <span className="flex items-center gap-1.5 text-green-700 text-xs font-semibold">
                              <CheckCircle2 size={14} /> Awarded
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Tax breakdown */}
                      {q.grandTotal && (
                        <div className="ml-8 mt-3">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${q.taxMode === 'AUTO' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                              {q.taxMode === 'AUTO' ? 'Auto Tax' : 'Manual Tax'}
                            </span>
                          </div>
                          {q.taxMode === 'AUTO' ? (
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                              <div className="bg-gray-50 rounded-md px-2 py-1.5">
                                <p className="text-gray-400">Subtotal</p>
                                <p className="font-semibold text-gray-700">{formatCurrency(q.totalAmount)}</p>
                              </div>
                              <div className="bg-gray-50 rounded-md px-2 py-1.5">
                                <p className="text-gray-400">VAT (15%)</p>
                                <p className="font-medium text-gray-600">{formatCurrency(q.vatAmount || 0)}</p>
                              </div>
                              <div className="bg-gray-50 rounded-md px-2 py-1.5">
                                <p className="text-gray-400">NHIL (2.5%)</p>
                                <p className="font-medium text-gray-600">{formatCurrency(q.nhilAmount || 0)}</p>
                              </div>
                              <div className="bg-gray-50 rounded-md px-2 py-1.5">
                                <p className="text-gray-400">GETFund (2.5%)</p>
                                <p className="font-medium text-gray-600">{formatCurrency(q.getfundAmount || 0)}</p>
                              </div>
                              <div className="bg-orange-50 rounded-md px-2 py-1.5">
                                <p className="text-orange-500">Total Tax (20%)</p>
                                <p className="font-semibold text-orange-700">{formatCurrency(q.totalTax || 0)}</p>
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                              <div className="bg-gray-50 rounded-md px-2 py-1.5">
                                <p className="text-gray-400">Subtotal</p>
                                <p className="font-semibold text-gray-700">{formatCurrency(q.totalAmount)}</p>
                              </div>
                              <div className="bg-orange-50 rounded-md px-2 py-1.5">
                                <p className="text-orange-500">Total Tax (Manual)</p>
                                <p className="font-semibold text-orange-700">{formatCurrency(q.totalTax || 0)}</p>
                              </div>
                              <div className="bg-green-50 rounded-md px-2 py-1.5">
                                <p className="text-green-600">Grand Total</p>
                                <p className="font-semibold text-green-700">{formatCurrency(q.grandTotal || 0)}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* External evaluation info banner */}
        {tab === 'quotations' && deadlinePassed && quotations.length > 0 && rfq.status !== 'AWARDED' && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 flex items-start gap-3">
            <BarChart3 size={18} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-1">Evaluation is conducted outside the system</p>
              <p className="text-blue-700">Review the quotations above, conduct your evaluation process (committee review, technical assessment, etc.) offline, then return here to record the winning supplier by clicking the <strong>Award</strong> button.</p>
            </div>
          </div>
        )}

        {/* Award confirmation modal */}
        {awardModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <Award size={20} className="text-green-700" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Award RFQ</h3>
                    <p className="text-xs text-gray-500">This action cannot be undone</p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm">
                  <p className="text-gray-500">Awarding to:</p>
                  <p className="font-semibold text-gray-900">{awardModal.supplier.companyName}</p>
                  <p className="text-green-700 font-bold mt-1">{formatCurrency(awardModal.grandTotal || awardModal.totalAmount, awardModal.currency)}</p>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Justification *</label>
                  <textarea
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    rows={4}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Explain why this supplier was selected (e.g. best value, technical compliance, committee recommendation)..."
                  />
                  <p className="text-xs text-gray-400 mt-1">{justification.length}/10 characters minimum</p>
                </div>

                {awardError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{awardError}</div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setAwardModal(null)}
                    className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAward}
                    disabled={justification.length < 10 || awardingId === awardModal.id}
                    className="flex-1 px-4 py-2.5 bg-green-700 text-white rounded-lg text-sm font-semibold hover:bg-green-800 disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {awardingId === awardModal.id ? 'Awarding...' : 'Confirm Award'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'chat' && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <ChatRoom rfqId={id} />
          </div>
        )}

        {tab === 'audit' && <AuditLog rfqId={id} />}
      </div>
    </div>
  )
}

function ChatRoom({ rfqId }: { rfqId: string }) {
  const [messages, setMessages] = useState<Array<{ id: string; message: string; createdAt: string; sender: { firstName: string; lastName: string; role: string } }>>([])
  const [msg, setMsg] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    api.get<{ messages: typeof messages }>(`/api/rfqs/${rfqId}/chat`).then((r) => setMessages(r.messages))
  }, [rfqId])

  const send = async () => {
    if (!msg.trim()) return
    setSending(true)
    try {
      const res = await api.post<{ message: (typeof messages)[0] }>(`/api/rfqs/${rfqId}/chat`, { message: msg })
      setMessages((m) => [...m, res.message])
      setMsg('')
    } finally { setSending(false) }
  }

  return (
    <div>
      <h3 className="font-semibold text-gray-900 mb-3">Clarification Chatroom</h3>
      <div className="h-80 overflow-y-auto border border-gray-100 rounded-lg p-3 mb-3 space-y-3">
        {messages.length === 0 && <p className="text-center text-gray-400 text-sm py-8">No messages yet. Use this room for clarification queries.</p>}
        {messages.map((m) => (
          <div key={m.id} className="flex gap-2">
            <div className="w-7 h-7 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
              {m.sender.firstName[0]}
            </div>
            <div>
              <p className="text-xs text-gray-400">{m.sender.firstName} {m.sender.lastName} <span className="bg-gray-100 text-gray-500 px-1 rounded text-xs ml-1">{m.sender.role}</span></p>
              <p className="text-sm text-gray-800 mt-0.5">{m.message}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={msg} onChange={(e) => setMsg(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="Type a clarification message..." className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <button onClick={send} disabled={sending || !msg.trim()} className="bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-800 disabled:opacity-60">Send</button>
      </div>
    </div>
  )
}

function AuditLog({ rfqId }: { rfqId: string }) {
  const [logs, setLogs] = useState<Array<{ id: string; action: string; createdAt: string; actor: { firstName: string; lastName: string; role: string } | null; metadata: Record<string, unknown> }>>([])

  useEffect(() => {
    api.get<{ logs: typeof logs }>(`/api/audit/rfq/${rfqId}`).then((r) => setLogs(r.logs))
  }, [rfqId])

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="font-semibold text-gray-900 mb-4">Audit Trail</h3>
      <div className="space-y-2">
        {logs.map((log) => (
          <div key={log.id} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-gray-900">
                <span className="font-medium capitalize">{log.action.replace(/_/g, ' ')}</span>
                {log.actor && <span className="text-gray-500"> by {log.actor.firstName} {log.actor.lastName}</span>}
              </p>
              <p className="text-xs text-gray-400">{formatDateTime(log.createdAt)}</p>
            </div>
          </div>
        ))}
        {logs.length === 0 && <p className="text-gray-400 text-sm text-center py-4">No audit events yet.</p>}
      </div>
    </div>
  )
}
