'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { TopBar } from '@/components/layout/TopBar'
import { api } from '@/lib/api'
import { formatDate, timeUntilDeadline } from '@/lib/utils'
import { Search, FileText, Clock } from 'lucide-react'

interface Rfq {
  id: string; referenceNo: string; title: string; type: string
  submissionDeadline: string; createdAt: string
  category: { name: string }
  entity: { name: string; region: string }
  _count: { quotations: number }
}

export default function SupplierRfqMarketplace() {
  const [rfqs, setRfqs] = useState<Rfq[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const q = new URLSearchParams({ status: 'OPEN', ...(search && { search }) })
    api.get<{ rfqs: Rfq[] }>(`/api/rfqs?${q}`).then((r) => setRfqs(r.rfqs)).finally(() => setLoading(false))
  }, [search])

  return (
    <div>
      <TopBar title="Open RFQs" />
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search RFQs..." className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>
        </div>

        {loading ? (
          <div className="text-center text-gray-400 py-12">Loading...</div>
        ) : rfqs.length === 0 ? (
          <div className="text-center py-16">
            <FileText size={48} className="text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500">No open RFQs found.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {rfqs.map((rfq) => {
              const urgent = new Date(rfq.submissionDeadline).getTime() - Date.now() < 24 * 3600_000
              return (
                <Link key={rfq.id} href={`/supplier/rfqs/${rfq.id}`} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-all hover:border-green-200">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">{rfq.type}</span>
                        <span className="text-xs text-gray-400">{rfq.category.name}</span>
                      </div>
                      <h3 className="font-semibold text-gray-900">{rfq.title}</h3>
                      <p className="text-sm text-gray-500 mt-1">{rfq.entity.name} · {rfq.entity.region}</p>
                      <p className="text-xs text-gray-400 mt-1 font-mono">{rfq.referenceNo}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className={`flex items-center gap-1.5 text-sm font-semibold ${urgent ? 'text-red-600' : 'text-orange-600'}`}>
                        <Clock size={14} />
                        {timeUntilDeadline(rfq.submissionDeadline)}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Published {formatDate(rfq.createdAt)}</p>
                      <p className="text-xs text-gray-400">{rfq._count.quotations} quote{rfq._count.quotations !== 1 ? 's' : ''} submitted</p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
