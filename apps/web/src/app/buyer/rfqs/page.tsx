'use client'
import { useEffect, useState } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { api } from '@/lib/api'
import { rfqStatusColor, timeUntilDeadline } from '@/lib/utils'
import Link from 'next/link'
import { Plus, Search, FileText } from 'lucide-react'

interface Rfq {
  id: string; referenceNo: string; title: string; status: string
  type: string; submissionDeadline: string; createdAt: string
  category: { name: string }
  _count: { quotations: number; suppliers: number }
}

export default function BuyerRfqsPage() {
  const [rfqs, setRfqs] = useState<Rfq[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')

  useEffect(() => {
    const q = new URLSearchParams({ ...(search && { search }), ...(status && { status }) })
    api.get<{ rfqs: Rfq[] }>(`/api/rfqs?${q}`).then((r) => setRfqs(r.rfqs)).finally(() => setLoading(false))
  }, [search, status])

  return (
    <div>
      <TopBar title="My RFQs" />
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title or reference..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="OPEN">Open</option>
            <option value="CLOSED">Closed</option>
            <option value="AWARDED">Awarded</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <Link href="/buyer/rfqs/create" className="flex items-center gap-2 bg-green-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-green-800 transition-colors whitespace-nowrap">
            <Plus size={16} /> New RFQ
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading...</div>
          ) : rfqs.length === 0 ? (
            <div className="p-12 text-center">
              <FileText size={48} className="text-gray-200 mx-auto mb-4" />
              <p className="text-gray-500">No RFQs found.</p>
              <Link href="/buyer/rfqs/create" className="text-green-700 text-sm font-medium hover:underline mt-2 inline-block">Create your first RFQ</Link>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Reference</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Title</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Category</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Deadline</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Quotations</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rfqs.map((rfq) => (
                  <tr key={rfq.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => window.location.href = `/buyer/rfqs/${rfq.id}`}>
                    <td className="px-4 py-3.5 font-mono text-xs text-gray-500">{rfq.referenceNo}</td>
                    <td className="px-4 py-3.5 font-medium text-gray-900 max-w-xs truncate">{rfq.title}</td>
                    <td className="px-4 py-3.5 text-gray-500 hidden sm:table-cell">{rfq.category.name}</td>
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      <span className="text-orange-600 text-xs">{timeUntilDeadline(rfq.submissionDeadline)}</span>
                    </td>
                    <td className="px-4 py-3.5 text-gray-500 hidden md:table-cell">{rfq._count.quotations}</td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${rfqStatusColor(rfq.status)}`}>{rfq.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
