'use client'
import { useEffect, useState } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { api } from '@/lib/api'
import { formatCurrency, formatDate, rfqStatusColor, timeUntilDeadline } from '@/lib/utils'
import Link from 'next/link'
import { FileText, Clock, Award, Plus, ArrowRight, TrendingUp } from 'lucide-react'

interface DashboardStats { openRfqs: number; closedRfqs: number; awardedRfqs: number }
interface Rfq {
  id: string; referenceNo: string; title: string; status: string
  submissionDeadline: string; _count: { quotations: number }
  category: { name: string }
}

export default function BuyerDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [rfqs, setRfqs] = useState<Rfq[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get<{ openRfqs: number; closedRfqs: number; awardedRfqs: number }>('/api/reports/dashboard-stats'),
      api.get<{ rfqs: Rfq[] }>('/api/rfqs?limit=5'),
    ]).then(([s, r]) => {
      setStats(s)
      setRfqs(r.rfqs)
    }).finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <TopBar title="Dashboard" />
      <div className="p-6 max-w-6xl mx-auto">
        {/* Welcome */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Good morning!</h2>
            <p className="text-gray-500 text-sm mt-1">Here's your procurement overview for today.</p>
          </div>
          <Link href="/buyer/rfqs/create" className="flex items-center gap-2 bg-green-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-green-800 transition-colors">
            <Plus size={16} /> Create RFQ
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Open RFQs', value: stats?.openRfqs ?? '-', icon: FileText, color: 'text-green-600 bg-green-100' },
            { label: 'Pending Evaluation', value: stats?.closedRfqs ?? '-', icon: Clock, color: 'text-orange-600 bg-orange-100' },
            { label: 'Awarded', value: stats?.awardedRfqs ?? '-', icon: Award, color: 'text-blue-600 bg-blue-100' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${s.color}`}>
                <s.icon size={22} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{loading ? '...' : s.value}</p>
                <p className="text-sm text-gray-500">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Recent RFQs */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Recent RFQs</h3>
            <Link href="/buyer/rfqs" className="text-sm text-green-700 font-medium hover:underline flex items-center gap-1">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading...</div>
          ) : rfqs.length === 0 ? (
            <div className="p-8 text-center">
              <FileText size={40} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No RFQs yet.</p>
              <Link href="/buyer/rfqs/create" className="text-green-700 text-sm font-medium hover:underline mt-2 inline-block">Create your first RFQ</Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {rfqs.map((rfq) => (
                <Link key={rfq.id} href={`/buyer/rfqs/${rfq.id}`} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{rfq.title}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-400">{rfq.referenceNo}</span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-400">{rfq.category.name}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 ml-4">
                    <div className="text-right">
                      <p className="text-xs text-gray-400">{rfq._count.quotations} quotation{rfq._count.quotations !== 1 ? 's' : ''}</p>
                      <p className="text-xs text-orange-500">{timeUntilDeadline(rfq.submissionDeadline)}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${rfqStatusColor(rfq.status)}`}>
                      {rfq.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
