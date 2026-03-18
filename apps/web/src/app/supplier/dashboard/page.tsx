'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { TopBar } from '@/components/layout/TopBar'
import { api } from '@/lib/api'
import { rfqStatusColor, timeUntilDeadline, supplierStatusColor } from '@/lib/utils'
import { FileText, ArrowRight, AlertTriangle, CheckCircle2, Clock } from 'lucide-react'

interface Rfq {
  id: string; referenceNo: string; title: string; status: string
  submissionDeadline: string; category: { name: string }
  entity: { name: string }
  _count: { quotations: number }
}
interface Supplier { id: string; companyName: string; status: string; riskScore: number }
interface Compliance { compliant: boolean; issues: string[] }

export default function SupplierDashboard() {
  const [rfqs, setRfqs] = useState<Rfq[]>([])
  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [compliance, setCompliance] = useState<Compliance | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get<{ rfqs: Rfq[] }>('/api/rfqs?status=OPEN&limit=5'),
      api.get<{ supplier: Supplier }>('/api/suppliers/me/profile').catch(() => ({ supplier: null })),
    ]).then(([r, s]) => {
      setRfqs(r.rfqs)
      if (s.supplier) {
        setSupplier(s.supplier)
        api.get<Compliance>(`/api/suppliers/${s.supplier.id}/compliance`).then(setCompliance)
      }
    }).finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <TopBar title="Supplier Dashboard" />
      <div className="p-6 max-w-6xl mx-auto">
        {/* Compliance Status */}
        {supplier && (
          <div className={`mb-6 rounded-xl border p-4 flex items-start gap-4 ${compliance?.compliant ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
            {compliance?.compliant ? <CheckCircle2 className="text-green-600 flex-shrink-0 mt-0.5" size={20} /> : <AlertTriangle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />}
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="font-medium text-gray-900">{supplier.companyName}</p>
                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${supplierStatusColor(supplier.status)}`}>{supplier.status}</span>
              </div>
              {compliance?.compliant ? (
                <p className="text-sm text-green-700 mt-1">Your account is fully compliant and eligible to participate in RFQs.</p>
              ) : (
                <div className="mt-1">
                  <p className="text-sm text-yellow-700 font-medium">Compliance issues found:</p>
                  <ul className="list-disc list-inside text-sm text-yellow-700 mt-1 space-y-0.5">
                    {compliance?.issues.map((issue) => <li key={issue}>{issue}</li>)}
                  </ul>
                  <Link href="/supplier/profile" className="text-sm font-medium text-yellow-800 hover:underline mt-2 inline-block">Update your documents →</Link>
                </div>
              )}
            </div>
          </div>
        )}

        {!supplier && !loading && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-5">
            <p className="font-medium text-blue-900">Complete your supplier profile to participate in RFQs</p>
            <Link href="/supplier/onboarding" className="mt-2 inline-flex items-center gap-1.5 text-sm text-blue-700 font-medium hover:underline">
              Complete Profile <ArrowRight size={14} />
            </Link>
          </div>
        )}

        {/* Open RFQs */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Open RFQs Matching Your Categories</h3>
            <Link href="/supplier/rfqs" className="text-sm text-green-700 font-medium flex items-center gap-1 hover:underline">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading...</div>
          ) : rfqs.length === 0 ? (
            <div className="p-8 text-center">
              <Clock size={40} className="text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500">No open RFQs at the moment.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {rfqs.map((rfq) => (
                <Link key={rfq.id} href={`/supplier/rfqs/${rfq.id}`} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{rfq.title}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      <span>{rfq.referenceNo}</span>
                      <span>•</span>
                      <span>{rfq.entity.name}</span>
                      <span>•</span>
                      <span>{rfq.category.name}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <p className="text-xs text-orange-600 font-medium">{timeUntilDeadline(rfq.submissionDeadline)}</p>
                    <ArrowRight size={16} className="text-gray-300" />
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
