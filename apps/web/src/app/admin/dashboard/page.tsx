'use client'
import { useEffect, useState } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { api } from '@/lib/api'
import { Users, FileText, Award, BarChart3, AlertTriangle, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

interface PlatformStats {
  users: number
  suppliers: Array<{ status: string; _count: boolean }>
  rfqs: Array<{ status: string; _count: boolean }>
  quotations: number
  awards: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<PlatformStats>('/api/admin/stats').then(setStats).finally(() => setLoading(false))
  }, [])

  const getCount = (arr: Array<{ status: string; _count: boolean }> | undefined, key: string) =>
    (arr as unknown as Array<{ status: string; _count: { _all: number } }>)?.find((s) => s.status === key)?._count?._all ?? 0

  return (
    <div>
      <TopBar title="Admin Dashboard" />
      <div className="p-6 max-w-6xl mx-auto">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Platform Overview</h2>
          <p className="text-gray-500 text-sm mt-1">Real-time system statistics and compliance metrics.</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Users', value: stats?.users ?? '-', icon: Users, color: 'text-blue-600 bg-blue-50' },
            { label: 'Total Quotations', value: stats?.quotations ?? '-', icon: FileText, color: 'text-green-600 bg-green-50' },
            { label: 'Awards Issued', value: stats?.awards ?? '-', icon: Award, color: 'text-purple-600 bg-purple-50' },
            { label: 'Pending Suppliers', value: loading ? '-' : getCount(stats?.suppliers, 'PENDING'), icon: AlertTriangle, color: 'text-yellow-600 bg-yellow-50' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${s.color}`}>
                <s.icon size={20} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{loading ? '...' : s.value}</p>
              <p className="text-sm text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Supplier status breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Supplier Status</h3>
            {['ACTIVE', 'PENDING', 'SUSPENDED', 'DEBARRED'].map((status) => {
              const count = loading ? 0 : getCount(stats?.suppliers, status)
              const total = loading ? 1 : (stats?.suppliers as unknown as Array<{ _count: { _all: number } }>)?.reduce((s, c) => s + c._count._all, 0) || 1
              const pct = Math.round((count / total) * 100)
              const colors: Record<string, string> = { ACTIVE: 'bg-green-500', PENDING: 'bg-yellow-500', SUSPENDED: 'bg-orange-500', DEBARRED: 'bg-red-500' }
              return (
                <div key={status} className="mb-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{status}</span>
                    <span className="font-medium text-gray-900">{count}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${colors[status]} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              {[
                { href: '/admin/suppliers?status=PENDING', label: 'Review Pending Suppliers', desc: 'Verify documents and activate accounts', icon: Users },
                { href: '/admin/rfqs', label: 'Monitor All RFQs', desc: 'Oversight of all platform RFQs', icon: FileText },
                { href: '/admin/audit', label: 'View Audit Logs', desc: 'Platform-wide audit trail', icon: BarChart3 },
              ].map((a) => (
                <Link key={a.href} href={a.href} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100">
                  <div className="w-9 h-9 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center flex-shrink-0">
                    <a.icon size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{a.label}</p>
                    <p className="text-xs text-gray-400">{a.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
