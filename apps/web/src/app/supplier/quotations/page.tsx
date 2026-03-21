'use client'
import { useEffect, useState } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { api } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import { FileText, CheckCircle, Clock, XCircle } from 'lucide-react'
import Link from 'next/link'

interface Quotation {
  id: string
  totalAmount: number
  currency: string
  submittedAt: string
  status: string
  rfq: {
    id: string
    title: string
    referenceNo: string
    submissionDeadline: string
    status: string
    entity: { name: string }
  }
}

const statusIcon = (s: string) => {
  if (s === 'SUBMITTED') return <Clock size={14} className="text-blue-500" />
  if (s === 'AWARDED') return <CheckCircle size={14} className="text-green-500" />
  return <XCircle size={14} className="text-gray-400" />
}

const statusColor = (s: string) => {
  if (s === 'SUBMITTED') return 'bg-blue-50 text-blue-700'
  if (s === 'AWARDED') return 'bg-green-50 text-green-700'
  return 'bg-gray-50 text-gray-600'
}

export default function SupplierQuotationsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch quotations for the logged-in supplier via their RFQs
    api.get<{ rfqs: Array<{ id: string }> }>('/api/rfqs')
      .then(async (r) => {
        // Get all quotations across submitted RFQs
        const allQuotes: Quotation[] = []
        for (const rfq of r.rfqs.slice(0, 20)) {
          try {
            const qr = await api.get<{ quotations: Quotation[] }>(`/api/rfqs/${rfq.id}/quotations`)
            allQuotes.push(...(qr.quotations || []))
          } catch { /* skip */ }
        }
        setQuotations(allQuotes)
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <TopBar title="My Quotations" />
      <div className="p-6 max-w-4xl mx-auto">
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{quotations.length}</p>
            <p className="text-xs text-gray-500 mt-1">Total Submitted</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-green-700">{quotations.filter(q => q.status === 'AWARDED').length}</p>
            <p className="text-xs text-gray-500 mt-1">Awarded</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{quotations.filter(q => q.status === 'SUBMITTED').length}</p>
            <p className="text-xs text-gray-500 mt-1">Under Review</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading quotations...</div>
          ) : quotations.length === 0 ? (
            <div className="p-12 text-center">
              <FileText size={48} className="text-gray-200 mx-auto mb-4" />
              <p className="text-gray-500">No quotations submitted yet.</p>
              <Link href="/supplier/rfqs" className="text-blue-700 text-sm font-medium hover:underline mt-2 inline-block">
                Browse open RFQs
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {quotations.map((q) => (
                <div key={q.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {statusIcon(q.status)}
                      <Link href={`/supplier/rfqs/${q.rfq.id}`} className="font-medium text-gray-900 hover:text-blue-700 truncate">
                        {q.rfq.title}
                      </Link>
                    </div>
                    <p className="text-xs text-gray-500">{q.rfq.referenceNo} · {q.rfq.entity.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Submitted {formatDate(q.submittedAt)} · Deadline {formatDate(q.rfq.submissionDeadline)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-gray-900">{formatCurrency(q.totalAmount)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(q.status)}`}>{q.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
