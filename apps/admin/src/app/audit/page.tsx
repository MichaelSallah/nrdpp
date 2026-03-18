'use client'
import { useEffect, useState } from 'react'
import { AdminNav } from '@/components/layout/AdminNav'
import { api } from '@/lib/api'
import { formatDateTime } from '@/lib/utils'
import { ShieldCheck } from 'lucide-react'

interface AuditLog {
  id: string
  entityType: string
  entityId: string
  action: string
  ipAddress: string | null
  createdAt: string
  actor: { firstName: string; lastName: string; role: string } | null
}

const ACTION_COLORS: Record<string, string> = {
  registered: 'bg-blue-50 text-blue-700',
  created: 'bg-green-50 text-green-700',
  published: 'bg-yellow-50 text-yellow-700',
  awarded: 'bg-purple-50 text-purple-700',
  cancelled: 'bg-red-50 text-red-700',
  submitted: 'bg-indigo-50 text-indigo-700',
  uploaded: 'bg-gray-50 text-gray-600',
}

const actionColor = (action: string) => {
  for (const [key, cls] of Object.entries(ACTION_COLORS)) {
    if (action.includes(key)) return cls
  }
  return 'bg-gray-50 text-gray-600'
}

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [entityType, setEntityType] = useState('')
  const [page, setPage] = useState(1)
  const limit = 50

  useEffect(() => {
    setLoading(true)
    const q = new URLSearchParams({ page: String(page), limit: String(limit), ...(entityType && { entityType }) })
    api.get<{ logs: AuditLog[]; total: number }>(`/api/audit?${q}`)
      .then((r) => { setLogs(r.logs); setTotal(r.total) })
      .finally(() => setLoading(false))
  }, [entityType, page])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav title="Audit Trail" />
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <ShieldCheck size={16} className="text-red-600" />
            <span>{total.toLocaleString()} total events — append-only, immutable</span>
          </div>
          <select
            value={entityType}
            onChange={(e) => { setEntityType(e.target.value); setPage(1) }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="">All Entity Types</option>
            <option value="rfq">RFQ</option>
            <option value="quotation">Quotation</option>
            <option value="supplier">Supplier</option>
            <option value="supplier_document">Document</option>
            <option value="evaluation">Evaluation</option>
            <option value="award">Award</option>
          </select>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading audit logs...</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No audit logs found.</div>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Timestamp</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actor</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Entity</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDateTime(log.createdAt)}</td>
                      <td className="px-4 py-3">
                        {log.actor ? (
                          <div>
                            <p className="text-sm font-medium text-gray-800">{log.actor.firstName} {log.actor.lastName}</p>
                            <p className="text-xs text-gray-400">{log.actor.role}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">System</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${actionColor(log.action)}`}>
                          {log.action.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-xs text-gray-500 capitalize">{log.entityType}</span>
                        <p className="text-xs text-gray-300 font-mono">{log.entityId.slice(0, 8)}…</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 hidden lg:table-cell">{log.ipAddress || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                  <p className="text-xs text-gray-400">Page {page} of {totalPages}</p>
                  <div className="flex gap-2">
                    <button onClick={() => setPage(p => p - 1)} disabled={page === 1} className="px-3 py-1 text-xs border border-gray-300 rounded-lg disabled:opacity-40">Prev</button>
                    <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages} className="px-3 py-1 text-xs border border-gray-300 rounded-lg disabled:opacity-40">Next</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
