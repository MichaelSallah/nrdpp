'use client'
import { useEffect, useState } from 'react'
import { AdminNav } from '@/components/layout/AdminNav'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { Users, FileText, TrendingUp, Award } from 'lucide-react'

interface Stats {
  users: number
  suppliers: Array<{ status: string; _count: number }>
  rfqs: Array<{ status: string; _count: number }>
  quotations: number
  awards: number
}

interface PricingStats {
  stats: { avgAmount: number | null; totalQuotations: number }
  recentAwards: Array<{
    id: string; rfq: { title: string; referenceNo: string }
    supplier: { companyName: string }
    quotation: { totalAmount: number }
  }>
}

interface Participation {
  topSuppliers: Array<{ companyName: string; _count: { quotations: number } }>
}

export default function AdminReportsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [pricing, setPricing] = useState<PricingStats | null>(null)
  const [participation, setParticipation] = useState<Participation | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get<Stats>('/api/admin/stats'),
      api.get<PricingStats>('/api/reports/pricing-analytics'),
      api.get<Participation>('/api/reports/supplier-participation'),
    ]).then(([s, p, part]) => { setStats(s); setPricing(p); setParticipation(part) })
      .finally(() => setLoading(false))
  }, [])

  const activeSuppliers = stats?.suppliers.find(s => s.status === 'ACTIVE')?._count ?? 0
  const pendingSuppliers = stats?.suppliers.find(s => s.status === 'PENDING')?._count ?? 0
  const openRfqs = stats?.rfqs.find(r => r.status === 'OPEN')?._count ?? 0

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav title="Platform Reports" />
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {loading && (
          <div className="text-center py-16 text-gray-400">Loading reports...</div>
        )}

        {!loading && (
          <>
            {/* Platform KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Total Users', value: stats?.users ?? 0, icon: Users, color: 'text-blue-600 bg-blue-50' },
                { label: 'Active Suppliers', value: activeSuppliers, icon: Award, color: 'text-green-700 bg-green-50' },
                { label: 'Open RFQs', value: openRfqs, icon: FileText, color: 'text-orange-600 bg-orange-50' },
                { label: 'Total Quotations', value: pricing?.stats.totalQuotations ?? 0, icon: TrendingUp, color: 'text-purple-600 bg-purple-50' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${color}`}>
                    <Icon size={20} />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Supplier + RFQ breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="font-semibold text-gray-900 mb-4">Supplier Status Breakdown</h2>
                <div className="space-y-3">
                  {stats?.suppliers.map((s) => {
                    const total = stats.suppliers.reduce((a, b) => a + b._count, 0)
                    const pct = total ? Math.round((s._count / total) * 100) : 0
                    const colors: Record<string, string> = { ACTIVE: 'bg-green-500', PENDING: 'bg-yellow-400', SUSPENDED: 'bg-orange-400', DEBARRED: 'bg-red-500' }
                    return (
                      <div key={s.status}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">{s.status}</span>
                          <span className="font-medium">{s._count} ({pct}%)</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full">
                          <div className={`h-full rounded-full ${colors[s.status] || 'bg-gray-400'}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="font-semibold text-gray-900 mb-4">RFQ Status Breakdown</h2>
                <div className="space-y-3">
                  {stats?.rfqs.map((r) => {
                    const total = stats.rfqs.reduce((a, b) => a + b._count, 0)
                    const pct = total ? Math.round((r._count / total) * 100) : 0
                    const colors: Record<string, string> = { OPEN: 'bg-green-500', CLOSED: 'bg-gray-400', AWARDED: 'bg-yellow-500', DRAFT: 'bg-blue-300', CANCELLED: 'bg-red-400' }
                    return (
                      <div key={r.status}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">{r.status}</span>
                          <span className="font-medium">{r._count} ({pct}%)</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full">
                          <div className={`h-full rounded-full ${colors[r.status] || 'bg-gray-400'}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Top suppliers + recent awards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="font-semibold text-gray-900 mb-4">Top Suppliers by Quotations</h2>
                {participation?.topSuppliers.length ? (
                  <div className="space-y-2">
                    {participation.topSuppliers.map((s, i) => {
                      const max = participation.topSuppliers[0]._count.quotations || 1
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-xs text-gray-400 w-4">{i + 1}</span>
                          <div className="flex-1">
                            <div className="flex justify-between mb-1">
                              <span className="text-sm text-gray-700">{s.companyName}</span>
                              <span className="text-xs text-gray-500">{s._count.quotations}</span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full">
                              <div className="h-full bg-red-600 rounded-full" style={{ width: `${(s._count.quotations / max) * 100}%` }} />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : <p className="text-sm text-gray-400">No data yet.</p>}
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="font-semibold text-gray-900 mb-4">Recent Awards</h2>
                {pricing?.recentAwards.length ? (
                  <div className="divide-y divide-gray-50">
                    {pricing.recentAwards.map((a) => (
                      <div key={a.id} className="py-3 flex justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900 truncate max-w-xs">{a.rfq.title}</p>
                          <p className="text-xs text-gray-400">{a.supplier.companyName}</p>
                        </div>
                        <p className="text-sm font-semibold text-gray-700 shrink-0">
                          {formatCurrency(a.quotation?.totalAmount ?? 0)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-gray-400">No awards yet.</p>}
              </div>
            </div>

            {pendingSuppliers > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center justify-between">
                <p className="text-sm text-yellow-800">{pendingSuppliers} supplier{pendingSuppliers !== 1 ? 's' : ''} pending verification</p>
                <a href="/suppliers" className="text-sm font-semibold text-yellow-800 hover:underline">Review →</a>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
