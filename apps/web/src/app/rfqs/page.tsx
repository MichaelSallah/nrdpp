'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { rfqStatusColor, timeUntilDeadline, formatCurrency, formatDate } from '@/lib/utils'
import { Search, Clock, FileText, Building2 } from 'lucide-react'
import Link from 'next/link'

interface Rfq {
  id: string; referenceNo: string; title: string; description: string
  status: string; budget: number | null; currency: string
  submissionDeadline: string; createdAt: string
  category: { name: string }
  entity: { name: string; code: string }
  _count: { quotations: number; suppliers: number }
}

export default function PublicMarketplacePage() {
  const [rfqs, setRfqs] = useState<Rfq[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const q = new URLSearchParams({ status: 'OPEN', ...(search && { search }) })
    api.get<{ rfqs: Rfq[] }>(`/api/rfqs?${q}`)
      .then((r) => setRfqs(r.rfqs))
      .finally(() => setLoading(false))
  }, [search])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-green-800 text-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center">
              <span className="text-xs font-bold text-green-900">GH</span>
            </div>
            <span className="font-bold text-lg">NRDPP</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-green-200 hover:text-white">Login</Link>
            <Link href="/register" className="bg-yellow-400 text-green-900 px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-yellow-300">Register</Link>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-6 pb-8 pt-2">
          <h1 className="text-2xl font-bold mb-1">Open RFQ Marketplace</h1>
          <p className="text-green-200 text-sm">Browse and respond to active procurement requests from public and private sector organisations</p>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Search */}
        <div className="relative mb-6">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search open RFQs by title, category, or reference number..."
            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white shadow-sm"
          />
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading open RFQs...</div>
        ) : rfqs.length === 0 ? (
          <div className="text-center py-16">
            <FileText size={56} className="text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No open RFQs at the moment.</p>
            <p className="text-gray-400 text-sm mt-1">Check back later or register to receive alerts.</p>
            <Link href="/register/supplier" className="mt-4 inline-block bg-green-700 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-green-800">
              Register as Supplier
            </Link>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4">{rfqs.length} open RFQ{rfqs.length !== 1 ? 's' : ''}</p>
            <div className="space-y-4">
              {rfqs.map((rfq) => {
                const deadline = new Date(rfq.submissionDeadline)
                const hoursLeft = (deadline.getTime() - Date.now()) / 3600000
                const urgent = hoursLeft < 24
                return (
                  <div key={rfq.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-mono text-xs text-gray-400">{rfq.referenceNo}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${rfqStatusColor(rfq.status)}`}>{rfq.status}</span>
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{rfq.category.name}</span>
                        </div>
                        <h2 className="text-base font-semibold text-gray-900 mb-1 truncate">{rfq.title}</h2>
                        <p className="text-sm text-gray-500 line-clamp-2 mb-3">{rfq.description}</p>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400">
                          <div className="flex items-center gap-1.5">
                            <Building2 size={13} />
                            <span>{rfq.entity.name}</span>
                          </div>
                          <div className={`flex items-center gap-1.5 ${urgent ? 'text-red-500 font-medium' : ''}`}>
                            <Clock size={13} />
                            <span>{timeUntilDeadline(rfq.submissionDeadline)}</span>
                          </div>
                          {rfq.budget && (
                            <span>Budget: {formatCurrency(rfq.budget)}</span>
                          )}
                          <span>{rfq._count.suppliers} invited · {rfq._count.quotations} quotes</span>
                        </div>
                      </div>

                      <div className="shrink-0 flex flex-col items-end gap-2">
                        <div className="text-right text-xs text-gray-400">
                          <p>Closes</p>
                          <p className="font-medium text-gray-600">{formatDate(rfq.submissionDeadline)}</p>
                        </div>
                        <Link
                          href="/login"
                          className="bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-800 transition-colors"
                        >
                          View & Quote
                        </Link>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      <footer className="text-center py-8 text-xs text-gray-400 border-t border-gray-200 mt-12">
        © 2026 NRDPP – National RFQ Digital Procurement Platform v1.0
      </footer>
    </div>
  )
}
