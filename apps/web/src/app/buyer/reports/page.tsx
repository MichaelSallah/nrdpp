'use client'
import { useEffect, useState } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { BarChart3, TrendingUp, FileText, Users } from 'lucide-react'

interface RfqSummary {
  total: number
  byStatus: Array<{ status: string; _count: number }>
  avgQuotationsPerRfq: number | string
}

interface PricingStats {
  stats: { avgAmount: number | null; minAmount: number | null; maxAmount: number | null; totalQuotations: number }
  recentAwards: Array<{
    id: string; awardDate: string; justification: string
    rfq: { title: string; referenceNo: string }
    supplier: { companyName: string }
    quotation: { totalAmount: number }
  }>
}

interface Participation {
  participationByStatus: Array<{ status: string; _count: { supplierId: number } }>
  topSuppliers: Array<{ companyName: string; _count: { quotations: number } }>
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-green-500', CLOSED: 'bg-gray-400', AWARDED: 'bg-yellow-500',
  DRAFT: 'bg-blue-300', CANCELLED: 'bg-red-400',
}

export default function BuyerReportsPage() {
  const [summary, setSummary] = useState<RfqSummary | null>(null)
  const [pricing, setPricing] = useState<PricingStats | null>(null)
  const [participation, setParticipation] = useState<Participation | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get<RfqSummary>('/api/reports/rfq-summary'),
      api.get<PricingStats>('/api/reports/pricing-analytics'),
      api.get<Participation>('/api/reports/supplier-participation'),
    ]).then(([s, p, part]) => {
      setSummary(s)
      setPricing(p)
      setParticipation(part)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div>
      <TopBar title="Reports & Analytics" />
      <div className="p-8 text-center text-gray-400">Loading reports...</div>
    </div>
  )

  const totalByStatus = summary?.byStatus.reduce((a, b) => a + b._count, 0) || 1

  return (
    <div>
      <TopBar title="Reports & Analytics" />
      <div className="p-6 max-w-6xl mx-auto space-y-6">

        {/* RFQ Summary */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText size={18} className="text-green-700" />
            <h2 className="font-semibold text-gray-900">RFQ Summary</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-3xl font-bold text-gray-900">{summary?.total ?? 0}</p>
              <p className="text-xs text-gray-500 mt-1">Total RFQs</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-3xl font-bold text-green-700">{summary?.byStatus.find(s => s.status === 'OPEN')?._count ?? 0}</p>
              <p className="text-xs text-gray-500 mt-1">Open</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <p className="text-3xl font-bold text-yellow-600">{summary?.byStatus.find(s => s.status === 'AWARDED')?._count ?? 0}</p>
              <p className="text-xs text-gray-500 mt-1">Awarded</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-3xl font-bold text-blue-600">{summary?.avgQuotationsPerRfq ?? 0}</p>
              <p className="text-xs text-gray-500 mt-1">Avg Quotations/RFQ</p>
            </div>
          </div>
          {/* Status bar */}
          <div>
            <p className="text-xs text-gray-500 mb-2">RFQ Status Distribution</p>
            <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
              {summary?.byStatus.map((s) => (
                <div
                  key={s.status}
                  className={`${STATUS_COLORS[s.status] || 'bg-gray-300'} transition-all`}
                  style={{ width: `${(s._count / totalByStatus) * 100}%` }}
                  title={`${s.status}: ${s._count}`}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-3 mt-2">
              {summary?.byStatus.map((s) => (
                <div key={s.status} className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[s.status] || 'bg-gray-300'}`} />
                  <span className="text-xs text-gray-500">{s.status} ({s._count})</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Pricing Analytics */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-green-700" />
            <h2 className="font-semibold text-gray-900">Pricing Analytics</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Total Quotations</p>
              <p className="text-xl font-bold text-gray-900">{pricing?.stats.totalQuotations ?? 0}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Average Amount</p>
              <p className="text-xl font-bold text-gray-900">{pricing?.stats.avgAmount ? formatCurrency(pricing.stats.avgAmount) : 'N/A'}</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Minimum Bid</p>
              <p className="text-xl font-bold text-green-700">{pricing?.stats.minAmount ? formatCurrency(pricing.stats.minAmount) : 'N/A'}</p>
            </div>
            <div className="p-4 bg-red-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Maximum Bid</p>
              <p className="text-xl font-bold text-red-600">{pricing?.stats.maxAmount ? formatCurrency(pricing.stats.maxAmount) : 'N/A'}</p>
            </div>
          </div>

          {pricing && pricing.recentAwards.length > 0 && (
            <>
              <p className="text-sm font-medium text-gray-700 mb-3">Recent Awards</p>
              <div className="divide-y divide-gray-50">
                {pricing.recentAwards.map((a) => (
                  <div key={a.id} className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{a.rfq.title}</p>
                      <p className="text-xs text-gray-500">{a.rfq.referenceNo} · Awarded to {a.supplier.companyName}</p>
                    </div>
                    <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">{formatCurrency(a.quotation?.totalAmount ?? 0)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Supplier Participation */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users size={18} className="text-green-700" />
            <h2 className="font-semibold text-gray-900">Supplier Participation</h2>
          </div>
          {participation && participation.topSuppliers.length > 0 ? (
            <div>
              <p className="text-xs text-gray-500 mb-3">Top Suppliers by Quotations Submitted</p>
              <div className="space-y-2">
                {participation.topSuppliers.map((s, i) => {
                  const max = participation.topSuppliers[0]._count.quotations || 1
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 w-4">{i + 1}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-700">{s.companyName}</span>
                          <span className="text-xs font-medium text-gray-500">{s._count.quotations} quotes</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-600 rounded-full"
                            style={{ width: `${(s._count.quotations / max) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No participation data yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}
