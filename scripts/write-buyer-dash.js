const fs = require('fs'), path = require('path')

const content = `'use client'
import { useEffect, useState } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { api } from '@/lib/api'
import { formatCurrency, formatDate, rfqStatusColor, timeUntilDeadline } from '@/lib/utils'
import Link from 'next/link'
import { FileText, Clock, Award, Plus, ArrowRight, TrendingUp, Users, AlertTriangle, CheckCircle2, BarChart3 } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

interface DashboardStats { openRfqs: number; closedRfqs: number; awardedRfqs: number; draftRfqs?: number }
interface Rfq {
  id: string; referenceNo: string; title: string; status: string
  submissionDeadline: string; _count: { quotations: number }
  category: { name: string }
}
interface SupplierInvited { supplierId: string; status: string }

export default function BuyerDashboard() {
  const { user } = useAuthStore()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [rfqs, setRfqs] = useState<Rfq[]>([])
  const [loading, setLoading] = useState(true)
  const [greeting, setGreeting] = useState('')

  useEffect(() => {
    const h = new Date().getHours()
    setGreeting(h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening')
    Promise.all([
      api.get<DashboardStats>('/api/rfqs/stats/my'),
      api.get<{ rfqs: Rfq[] }>('/api/rfqs?limit=5&createdByMe=true'),
    ]).then(([s, r]) => {
      setStats(s)
      setRfqs(r.rfqs)
    }).finally(() => setLoading(false))
  }, [])

  const totalRfqs = (stats?.openRfqs ?? 0) + (stats?.closedRfqs ?? 0) + (stats?.awardedRfqs ?? 0) + (stats?.draftRfqs ?? 0)
  const awardRate = totalRfqs > 0 ? Math.round(((stats?.awardedRfqs ?? 0) / totalRfqs) * 100) : 0

  return (
    <div>
      <TopBar title="Buyer Dashboard" />
      <div className="p-6 max-w-6xl mx-auto">

        {/* Personalised greeting */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            {greeting}{user?.firstName ? \`, \${user.firstName}\` : ''}! 👋
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">Here's an overview of your procurement activity.</p>
        </div>

        {/* Quick action */}
        <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-3 flex-wrap">
            <Link href="/buyer/rfqs/create"
              className="inline-flex items-center gap-2 bg-green-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-green-800 transition-colors">
              <Plus size={16} /> Create New RFQ
            </Link>
            <Link href="/buyer/rfqs"
              className="inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors">
              <FileText size={16} /> My RFQs
            </Link>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Open RFQs', value: stats?.openRfqs ?? 0, icon: FileText, color: 'bg-green-100 text-green-700', href: '/buyer/rfqs?status=OPEN' },
            { label: 'Closed / Evaluating', value: stats?.closedRfqs ?? 0, icon: Clock, color: 'bg-orange-100 text-orange-700', href: '/buyer/rfqs?status=CLOSED' },
            { label: 'Awards Issued', value: stats?.awardedRfqs ?? 0, icon: Award, color: 'bg-yellow-100 text-yellow-700', href: '/buyer/rfqs?status=AWARDED' },
            { label: 'Award Rate', value: awardRate + '%', icon: TrendingUp, color: 'bg-blue-100 text-blue-700', href: '/buyer/reports' },
          ].map(({ label, value, icon: Icon, color, href }) => (
            <Link key={label} href={href} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
              <div className={\`w-9 h-9 \${color} rounded-lg flex items-center justify-center mb-3\`}>
                <Icon size={18} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </Link>
          ))}
        </div>

        {/* Activity tips */}
        {!loading && stats && stats.openRfqs === 0 && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle size={18} className="text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900">No open RFQs</p>
              <p className="text-sm text-blue-700 mt-0.5">Create an RFQ to invite suppliers and start receiving quotations.</p>
            </div>
          </div>
        )}

        {/* Recent RFQs */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">My Recent RFQs</h3>
            <Link href="/buyer/rfqs" className="text-sm text-green-700 font-medium flex items-center gap-1 hover:underline">
              View all <ArrowRight size={14} />
            </Link>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading...</div>
          ) : rfqs.length === 0 ? (
            <div className="p-8 text-center">
              <BarChart3 size={40} className="text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500">No RFQs yet.</p>
              <Link href="/buyer/rfqs/create" className="mt-3 inline-flex items-center gap-1.5 text-sm text-green-700 font-medium hover:underline">
                <Plus size={14} /> Create your first RFQ
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {rfqs.map((rfq) => {
                const hoursLeft = (new Date(rfq.submissionDeadline).getTime() - Date.now()) / 3600000
                const urgent = rfq.status === 'OPEN' && hoursLeft < 24
                const closingSoon = rfq.status === 'OPEN' && hoursLeft < 48 && hoursLeft >= 24
                const quotaWarning = rfq.status === 'OPEN' && rfq._count.quotations < 3
                return (
                  <Link key={rfq.id} href={\`/buyer/rfqs/\${rfq.id}\`}
                    className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <p className="font-medium text-gray-900 truncate">{rfq.title}</p>
                        <span className={\`text-xs px-2 py-0.5 rounded-full font-medium \${rfqStatusColor(rfq.status)}\`}>{rfq.status}</span>
                        {urgent && <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-semibold">Closing!</span>}
                        {closingSoon && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold">Closing Soon</span>}
                        {quotaWarning && <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-semibold flex items-center gap-0.5"><Users size={10} /> {rfq._count.quotations}/3 quotes</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                        <span>{rfq.referenceNo}</span>
                        <span>•</span>
                        <span>{rfq.category.name}</span>
                        <span>•</span>
                        <span>Deadline: {formatDate(rfq.submissionDeadline)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-4 shrink-0">
                      <div className="text-right">
                        <p className="text-xs text-gray-400">{rfq._count.quotations} quote{rfq._count.quotations !== 1 ? 's' : ''}</p>
                        {rfq.status === 'OPEN' && (
                          <p className={\`text-xs font-medium \${urgent ? 'text-red-600' : 'text-orange-500'}\`}>{timeUntilDeadline(rfq.submissionDeadline)}</p>
                        )}
                      </div>
                      <ArrowRight size={16} className="text-gray-300" />
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
`

fs.writeFileSync(path.join('C:\\', 'Users', 'MICHAELSALLAH', 'nrdpp', 'apps', 'web', 'src', 'app', 'buyer', 'dashboard', 'page.tsx'), content, 'utf8')
console.log('Buyer dashboard written, lines:', content.split('\n').length)
