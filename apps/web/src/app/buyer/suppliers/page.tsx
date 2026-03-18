'use client'
import { useEffect, useState } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { api } from '@/lib/api'
import { supplierStatusColor, formatDate } from '@/lib/utils'
import { Search, Building2, CheckCircle, XCircle, Clock } from 'lucide-react'
import Link from 'next/link'

interface Supplier {
  id: string
  companyName: string
  registrationNo: string
  businessType: string
  city: string
  region: string
  status: string
  riskScore: number
  createdAt: string
  user: { email: string }
  categories: Array<{ category: { name: string } }>
  _count: { documents: number; quotations: number }
}

export default function BuyerSuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('ACTIVE')

  useEffect(() => {
    const q = new URLSearchParams({ ...(search && { search }), ...(status && { status }) })
    api.get<{ suppliers: Supplier[] }>(`/api/suppliers?${q}`)
      .then((r) => setSuppliers(r.suppliers))
      .finally(() => setLoading(false))
  }, [search, status])

  const statusIcon = (s: string) => {
    if (s === 'ACTIVE') return <CheckCircle size={14} className="text-green-500" />
    if (s === 'DEBARRED') return <XCircle size={14} className="text-red-500" />
    return <Clock size={14} className="text-orange-400" />
  }

  return (
    <div>
      <TopBar title="Supplier Directory" />
      <div className="p-6 max-w-6xl mx-auto">
        <p className="text-sm text-gray-500 mb-4">Browse verified suppliers registered on the NRDPP platform.</p>
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by company name or registration number..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="PENDING">Pending</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="DEBARRED">Debarred</option>
          </select>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">Loading...</div>
        ) : suppliers.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Building2 size={48} className="text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500">No suppliers found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {suppliers.map((s) => (
              <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <Building2 size={20} className="text-green-700" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    {statusIcon(s.status)}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${supplierStatusColor(s.status)}`}>{s.status}</span>
                  </div>
                </div>
                <h3 className="font-semibold text-gray-900 mb-0.5">{s.companyName}</h3>
                <p className="text-xs text-gray-500 mb-3">{s.registrationNo} · {s.city}, {s.region}</p>

                {s.categories.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {s.categories.slice(0, 3).map((c, i) => (
                      <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{c.category.name}</span>
                    ))}
                    {s.categories.length > 3 && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">+{s.categories.length - 3}</span>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-gray-400 pt-3 border-t border-gray-100">
                  <span>{s._count.quotations} quotes submitted</span>
                  <span>Risk: {s.riskScore}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
