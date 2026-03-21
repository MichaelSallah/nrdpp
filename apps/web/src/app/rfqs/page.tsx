'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { api } from '@/lib/api'
import { rfqStatusColor, formatCurrency, formatDate } from '@/lib/utils'
import { Search, FileText, Building2, SlidersHorizontal, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { PublicNav } from '@/components/layout/PublicNav'
import { Countdown } from '@/components/ui/Countdown'

interface Rfq {
  id: string; referenceNo: string; title: string; description: string
  status: string; budget: number | null; currency: string
  submissionDeadline: string; createdAt: string
  category: { name: string; code: string }
  entity: { name: string; code: string; sector?: string }
  _count: { quotations: number; suppliers: number }
}

interface Category { id: string; name: string; code: string }

const SORT_OPTIONS = [
  { value: 'deadline_asc', label: 'Deadline (soonest)' },
  { value: 'created_desc', label: 'Newest first' },
  { value: 'budget_desc', label: 'Budget (highest)' },
  { value: 'budget_asc', label: 'Budget (lowest)' },
]

const PAGE_SIZE = 10

function MarketplaceContent() {
  const searchParams = useSearchParams()
  const [rfqs, setRfqs] = useState<Rfq[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [category, setCategory] = useState(searchParams.get('category') || '')
  const [sort, setSort] = useState('deadline_asc')
  const [page, setPage] = useState(1)

  useEffect(() => {
    api.get<{ categories: Category[] }>('/api/categories').then((r) => setCategories(r.categories)).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    setPage(1)
    const q = new URLSearchParams({ status: 'OPEN', ...(search && { search }), ...(category && { category }) })
    api.get<{ rfqs: Rfq[] }>(`/api/rfqs?${q}`)
      .then((r) => {
        let sorted = [...r.rfqs]
        if (sort === 'deadline_asc') sorted.sort((a, b) => new Date(a.submissionDeadline).getTime() - new Date(b.submissionDeadline).getTime())
        else if (sort === 'created_desc') sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        else if (sort === 'budget_desc') sorted.sort((a, b) => (b.budget ?? 0) - (a.budget ?? 0))
        else if (sort === 'budget_asc') sorted.sort((a, b) => (a.budget ?? 0) - (b.budget ?? 0))
        setRfqs(sorted)
      })
      .finally(() => setLoading(false))
  }, [search, category, sort])

  const totalPages = Math.ceil(rfqs.length / PAGE_SIZE)
  const paged = rfqs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNav />
      <div className="bg-blue-800 text-white">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <h1 className="text-2xl font-bold mb-1">Open RFQ Marketplace</h1>
          <p className="text-blue-200 text-sm">Browse and respond to active procurement requests from public and private sector organisations</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Filters bar */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <SlidersHorizontal size={15} /> Filters
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative sm:col-span-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search RFQs..."
                className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select value={category} onChange={(e) => setCategory(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All Categories</option>
              {categories.map((c) => <option key={c.id} value={c.code}>{c.name}</option>)}
            </select>
            <select value={sort} onChange={(e) => setSort(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          {(search || category) && (
            <button onClick={() => { setSearch(''); setCategory('') }}
              className="text-xs text-red-600 hover:underline">
              Clear filters
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading open RFQs...</div>
        ) : rfqs.length === 0 ? (
          <div className="text-center py-16">
            <FileText size={56} className="text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No open RFQs match your search.</p>
            <p className="text-gray-400 text-sm mt-1">Try adjusting your filters or check back later.</p>
            <Link href="/register?role=SUPPLIER" className="mt-4 inline-block bg-green-700 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-green-800">
              Register as Supplier
            </Link>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500">{rfqs.length} open RFQ{rfqs.length !== 1 ? 's' : ''}</p>
              {totalPages > 1 && (
                <p className="text-xs text-gray-400">Page {page} of {totalPages}</p>
              )}
            </div>

            <div className="space-y-4">
              {paged.map((rfq) => {
                const hoursLeft = (new Date(rfq.submissionDeadline).getTime() - Date.now()) / 3600000
                const urgent = hoursLeft < 24
                const closing = hoursLeft < 48 && hoursLeft >= 24
                return (
                  <div key={rfq.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="font-mono text-xs text-gray-400">{rfq.referenceNo}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${rfqStatusColor(rfq.status)}`}>{rfq.status}</span>
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{rfq.category.name}</span>
                          {urgent && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">Urgent</span>}
                          {closing && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">Closing Soon</span>}
                        </div>
                        <h2 className="text-base font-semibold text-gray-900 mb-1 truncate">{rfq.title}</h2>
                        <p className="text-sm text-gray-500 line-clamp-2 mb-3">{rfq.description}</p>
                        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400">
                          <div className="flex items-center gap-1.5">
                            <Building2 size={13} />
                            <span>{rfq.entity.name}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${rfq.entity.sector === 'PRIVATE' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                              {rfq.entity.sector === 'PRIVATE' ? 'Private' : 'Gov'}
                            </span>
                          </div>
                          {rfq.budget && <span>Budget: {formatCurrency(rfq.budget)}</span>}
                          <span>{rfq._count.suppliers} invited · {rfq._count.quotations} quotes</span>
                        </div>
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-3">
                        <div className="text-right text-xs text-gray-400">
                          <p className="mb-1">Closes {formatDate(rfq.submissionDeadline)}</p>
                          <Countdown deadline={rfq.submissionDeadline} variant="full" />
                        </div>
                        <Link href="/login"
                          className="bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-800 transition-colors">
                          View &amp; Quote
                        </Link>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-8">
                <button onClick={() => setPage(p => p - 1)} disabled={page === 1}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors">
                  <ChevronLeft size={15} /> Prev
                </button>
                <div className="flex gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button key={p} onClick={() => setPage(p)}
                      className={`w-9 h-9 text-sm rounded-lg font-medium transition-colors ${p === page ? 'bg-blue-700 text-white' : 'border border-gray-300 hover:bg-gray-50 text-gray-600'}`}>
                      {p}
                    </button>
                  ))}
                </div>
                <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors">
                  Next <ChevronRight size={15} />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <footer className="text-center py-8 text-xs text-gray-400 border-t border-gray-200 mt-12">
        © 2026 NRDPP – National RFQ Digital Procurement Platform v1.0
      </footer>
    </div>
  )
}

export default function PublicMarketplacePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">Loading...</div>}>
      <MarketplaceContent />
    </Suspense>
  )
}
