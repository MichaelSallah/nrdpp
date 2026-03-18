const fs = require('fs'), path = require('path')

const content = `'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { TopBar } from '@/components/layout/TopBar'
import { api } from '@/lib/api'
import { supplierStatusColor } from '@/lib/utils'
import { FileText, ArrowRight, AlertTriangle, CheckCircle2, Award, ShieldCheck } from 'lucide-react'
import { Countdown } from '@/components/ui/Countdown'

interface Rfq {
  id: string; referenceNo: string; title: string; status: string
  submissionDeadline: string; category: { name: string }
  entity: { name: string }
  _count: { quotations: number }
}
interface Supplier { id: string; companyName: string; status: string; riskScore: number }
interface Compliance { compliant: boolean; issues: string[] }
interface QuotationStats { total: number; awarded: number; pending: number }

export default function SupplierDashboard() {
  const [rfqs, setRfqs] = useState<Rfq[]>([])
  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [compliance, setCompliance] = useState<Compliance | null>(null)
  const [quotationStats, setQuotationStats] = useState<QuotationStats>({ total: 0, awarded: 0, pending: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get<{ rfqs: Rfq[] }>('/api/rfqs?status=OPEN&limit=5'),
      api.get<{ supplier: Supplier }>('/api/suppliers/me/profile').catch(() => ({ supplier: null })),
    ]).then(([r, s]) => {
      setRfqs(r.rfqs)
      if (s.supplier) {
        setSupplier(s.supplier)
        api.get<Compliance>(\`/api/suppliers/\${s.supplier.id}/compliance\`).then(setCompliance)
        api.get<{ quotations: Array<{ status: string }> }>('/api/quotations/my').then((q) => {
          const total = q.quotations.length
          const awarded = q.quotations.filter((x) => x.status === 'AWARDED').length
          const pending = q.quotations.filter((x) => x.status === 'SUBMITTED').length
          setQuotationStats({ total, awarded, pending })
        }).catch(() => {})
      }
    }).finally(() => setLoading(false))
  }, [])

  const riskScore = supplier?.riskScore ?? 0
  const riskColor = riskScore >= 80 ? 'text-green-700' : riskScore >= 60 ? 'text-yellow-600' : 'text-red-600'
  const riskBg = riskScore >= 80 ? 'bg-green-500' : riskScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
  const riskLabel = riskScore >= 80 ? 'Low Risk' : riskScore >= 60 ? 'Medium Risk' : 'High Risk'

  return (
    <div>
      <TopBar title="Supplier Dashboard" />
      <div className="p-6 max-w-6xl mx-auto">

        {/* Compliance Status Banner */}
        {supplier && (
          <div className={\`mb-6 rounded-xl border p-4 \${compliance?.compliant ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}\`}>
            <div className="flex items-start gap-4">
              {compliance?.compliant
                ? <CheckCircle2 className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
                : <AlertTriangle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />}
              <div className="flex-1">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="font-semibold text-gray-900">{supplier.companyName}</p>
                  <span className={\`text-xs px-2 py-1 rounded-full font-semibold \${supplierStatusColor(supplier.status)}\`}>{supplier.status}</span>
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

        {/* Stats cards */}
        {supplier && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="w-9 h-9 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center mb-3">
                <FileText size={18} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{quotationStats.total}</p>
              <p className="text-xs text-gray-500 mt-0.5">Quotes Submitted</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="w-9 h-9 bg-green-100 text-green-700 rounded-lg flex items-center justify-center mb-3">
                <Award size={18} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{quotationStats.awarded}</p>
              <p className="text-xs text-gray-500 mt-0.5">Awards Won</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="w-9 h-9 bg-orange-100 text-orange-700 rounded-lg flex items-center justify-center mb-3">
                <FileText size={18} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{quotationStats.pending}</p>
              <p className="text-xs text-gray-500 mt-0.5">Pending Review</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 bg-purple-100 text-purple-700 rounded-lg flex items-center justify-center">
                  <ShieldCheck size={18} />
                </div>
                <span className={\`text-xs font-semibold \${riskColor}\`}>{riskLabel}</span>
              </div>
              <p className={\`text-2xl font-bold \${riskColor}\`}>{riskScore}</p>
              <p className="text-xs text-gray-500 mt-0.5 mb-2">Risk Score</p>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className={\`h-full \${riskBg} rounded-full transition-all\`} style={{ width: riskScore + '%' }} />
              </div>
            </div>
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
              <FileText size={40} className="text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500">No open RFQs at the moment.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {rfqs.map((rfq) => {
                const hoursLeft = (new Date(rfq.submissionDeadline).getTime() - Date.now()) / 3600000
                const urgent = hoursLeft < 24
                const closing = hoursLeft < 48 && hoursLeft >= 24
                return (
                  <Link key={rfq.id} href={\`/supplier/rfqs/\${rfq.id}\`} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <p className="font-medium text-gray-900 truncate">{rfq.title}</p>
                        {urgent && <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-semibold shrink-0">Urgent</span>}
                        {closing && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold shrink-0">Closing Soon</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                        <span>{rfq.referenceNo}</span><span>•</span>
                        <span>{rfq.entity.name}</span><span>•</span>
                        <span>{rfq.category.name}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-4 shrink-0">
                      <Countdown deadline={rfq.submissionDeadline} variant="compact" />
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

fs.writeFileSync(path.join('C:\\', 'Users', 'MICHAELSALLAH', 'nrdpp', 'apps', 'web', 'src', 'app', 'supplier', 'dashboard', 'page.tsx'), content, 'utf8')
console.log('Supplier dashboard with countdown written')
