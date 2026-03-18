'use client'
import { useEffect, useState } from 'react'
import { AdminNav } from '@/components/layout/AdminNav'
import { api } from '@/lib/api'
import { supplierStatusColor, formatDate } from '@/lib/utils'
import { Search, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

interface Supplier {
  id: string; companyName: string; registrationNo: string; status: string
  riskScore: number; createdAt: string
  user: { email: string; firstName: string; lastName: string }
  categories: Array<{ category: { name: string } }>
  _count: { documents: number; quotations: number }
}

function SuppliersContent() {
  const searchParams = useSearchParams()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState(searchParams.get('status') || 'PENDING')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const load = () => {
    const q = new URLSearchParams({ ...(search && { search }), ...(status && { status }) })
    api.get<{ suppliers: Supplier[] }>(`/api/suppliers?${q}`)
      .then((r) => setSuppliers(r.suppliers))
      .finally(() => setLoading(false))
  }

  useEffect(load, [search, status])

  const changeStatus = async (id: string, newStatus: string) => {
    setActionLoading(id)
    try {
      await api.patch(`/api/suppliers/${id}/status`, { status: newStatus })
      load()
    } finally { setActionLoading(null) }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav title="Supplier Management" />
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search suppliers..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="DEBARRED">Debarred</option>
          </select>
        </div>

        {status === 'PENDING' && suppliers.length > 0 && (
          <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3">
            <AlertTriangle size={18} className="text-yellow-600 shrink-0" />
            <p className="text-sm text-yellow-800 font-medium">{suppliers.length} supplier{suppliers.length !== 1 ? 's' : ''} awaiting verification — review and approve or reject below.</p>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading...</div>
          ) : suppliers.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No suppliers found.</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {suppliers.map((s) => (
                <div key={s.id} className={`p-4 flex items-start justify-between gap-4 ${s.status === 'PENDING' ? 'bg-yellow-50/40' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900">{s.companyName}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${supplierStatusColor(s.status)}`}>{s.status}</span>
                      {s.status === 'PENDING' && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-semibold animate-pulse">Awaiting Approval</span>}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{s.user.firstName} {s.user.lastName} · {s.user.email}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Reg No: {s.registrationNo} · Joined {formatDate(s.createdAt)}</p>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className="text-xs text-gray-400">{s.categories.map(c => c.category.name).join(', ')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    {s.status === 'PENDING' && (
                      <>
                        <button onClick={() => changeStatus(s.id, 'ACTIVE')} disabled={actionLoading === s.id}
                          className="flex items-center gap-1.5 bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-green-800 disabled:opacity-60">
                          <CheckCircle2 size={14} /> Approve
                        </button>
                        <button onClick={() => changeStatus(s.id, 'DEBARRED')} disabled={actionLoading === s.id}
                          className="flex items-center gap-1.5 bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-red-700 disabled:opacity-60">
                          <XCircle size={14} /> Reject
                        </button>
                      </>
                    )}
                    {s.status === 'ACTIVE' && (
                      <button onClick={() => changeStatus(s.id, 'SUSPENDED')} disabled={actionLoading === s.id}
                        className="flex items-center gap-1.5 bg-orange-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-orange-600 disabled:opacity-60">
                        <AlertTriangle size={14} /> Suspend
                      </button>
                    )}
                    {(s.status === 'ACTIVE' || s.status === 'SUSPENDED') && (
                      <button onClick={() => changeStatus(s.id, 'DEBARRED')} disabled={actionLoading === s.id}
                        className="flex items-center gap-1.5 bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-red-700 disabled:opacity-60">
                        <XCircle size={14} /> Debar
                      </button>
                    )}
                    {(s.status === 'SUSPENDED' || s.status === 'DEBARRED') && (
                      <button onClick={() => changeStatus(s.id, 'ACTIVE')} disabled={actionLoading === s.id}
                        className="flex items-center gap-1.5 bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-green-800 disabled:opacity-60">
                        <CheckCircle2 size={14} /> Reinstate
                      </button>
                    )}
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

export default function AdminSuppliersPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-400">Loading...</p></div>}>
      <SuppliersContent />
    </Suspense>
  )
}
