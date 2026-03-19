'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AdminNav } from '@/components/layout/AdminNav'
import { api } from '@/lib/api'
import { supplierStatusColor, formatDate } from '@/lib/utils'
import {
  CheckCircle2, XCircle, AlertTriangle, Upload, Trash2, FileText,
  ArrowLeft, User, Building2, Tag, Loader2, ExternalLink
} from 'lucide-react'

const REQUIRED_DOCS = [
  { type: 'BUSINESS_REGISTRATION', label: 'Business Registration Documents',       required: true },
  { type: 'VAT_REGISTRATION',      label: 'VAT Registration Certificate',           required: true },
  { type: 'TAX_CLEARANCE',         label: 'Valid Tax Clearance Certificate',        required: true },
  { type: 'SSNIT_CLEARANCE',       label: 'Valid SSNIT Clearance Certificate',      required: true },
  { type: 'PPA_REGISTRATION',      label: 'Evidence of Registration with the PPA', required: true },
]

interface Doc {
  id: string; type: string; fileName: string; fileUrl: string
  fileSize: number; expiryDate: string | null; notes: string | null
  verified: boolean; createdAt: string
}

interface Supplier {
  id: string; companyName: string; registrationNo: string; taxId: string
  businessType: string; address: string; city: string; region: string
  status: string; riskScore: number; website: string | null; description: string | null
  createdAt: string
  user: { email: string; firstName: string; lastName: string; phone: string | null; createdAt: string }
  documents: Doc[]
  categories: Array<{ category: { name: string } }>
  _count: { quotations: number }
}

export default function AdminSupplierDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [uploadingType, setUploadingType] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const load = () => {
    setLoading(true)
    api.get<{ supplier: Supplier }>(`/api/admin/suppliers/${id}`)
      .then((r) => setSupplier(r.supplier))
      .catch(() => setError('Failed to load supplier'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [id])

  const changeStatus = async (newStatus: string) => {
    setActionLoading(newStatus)
    try {
      await api.patch(`/api/suppliers/${id}/status`, { status: newStatus })
      setSuccess(newStatus === 'ACTIVE' ? 'Supplier approved and activated.' : `Supplier ${newStatus.toLowerCase()}.`)
      load()
    } catch { setError('Failed to update status') }
    finally { setActionLoading(null) }
  }

  const uploadDoc = async (type: string, file: File) => {
    setUploadingType(type)
    setError(''); setSuccess('')
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('type', type)
      const BASE = process.env.NEXT_PUBLIC_API_URL || ''
      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_access_token') : null
      const res = await fetch(`${BASE}/api/admin/suppliers/${id}/documents`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Upload failed') }
      setSuccess(`Document uploaded successfully.`)
      load()
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Upload failed') }
    finally { setUploadingType(null) }
  }

  const deleteDoc = async (docId: string) => {
    if (!confirm('Delete this document?')) return
    setError(''); setSuccess('')
    try {
      await api.del(`/api/admin/suppliers/${id}/documents/${docId}`)
      setSuccess('Document removed.')
      load()
    } catch { setError('Failed to delete document') }
  }

  const getDocsOfType = (type: string) =>
    (supplier?.documents ?? []).filter((d) => d.type === type)

  const formatSize = (bytes: number) =>
    bytes > 1024 * 1024 ? (bytes / (1024 * 1024)).toFixed(1) + ' MB' : Math.round(bytes / 1024) + ' KB'

  const allUploaded = REQUIRED_DOCS.every((d) => getDocsOfType(d.type).length > 0)

  if (loading) return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav title="Supplier Detail" />
      <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>
    </div>
  )

  if (!supplier) return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav title="Supplier Detail" />
      <div className="flex items-center justify-center h-64 text-red-500">Supplier not found.</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav title="Supplier Detail" />
      <div className="p-6 max-w-5xl mx-auto">

        {/* Back button */}
        <button onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-5">
          <ArrowLeft size={16} /> Back to Suppliers
        </button>

        {/* Alerts */}
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
        {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{success}</div>}

        {/* Header card */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-xl font-bold text-gray-900">{supplier.companyName}</h1>
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${supplierStatusColor(supplier.status)}`}>
                  {supplier.status}
                </span>
                {supplier.status === 'PENDING' && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-semibold animate-pulse">
                    Awaiting Approval
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500">Reg No: {supplier.registrationNo} · Tax ID: {supplier.taxId}</p>
              <p className="text-xs text-gray-400 mt-0.5">Registered {formatDate(supplier.createdAt)}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {supplier.status === 'PENDING' && (
                <>
                  <button onClick={() => changeStatus('ACTIVE')} disabled={!!actionLoading}
                    className="flex items-center gap-1.5 bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-800 disabled:opacity-60">
                    {actionLoading === 'ACTIVE' ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    Approve Supplier
                  </button>
                  <button onClick={() => changeStatus('DEBARRED')} disabled={!!actionLoading}
                    className="flex items-center gap-1.5 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-60">
                    {actionLoading === 'DEBARRED' ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                    Reject
                  </button>
                </>
              )}
              {supplier.status === 'ACTIVE' && (
                <button onClick={() => changeStatus('SUSPENDED')} disabled={!!actionLoading}
                  className="flex items-center gap-1.5 bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-orange-600 disabled:opacity-60">
                  <AlertTriangle size={14} /> Suspend
                </button>
              )}
              {(supplier.status === 'SUSPENDED' || supplier.status === 'DEBARRED') && (
                <button onClick={() => changeStatus('ACTIVE')} disabled={!!actionLoading}
                  className="flex items-center gap-1.5 bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-800 disabled:opacity-60">
                  <CheckCircle2 size={14} /> Reinstate
                </button>
              )}
              {supplier.status === 'ACTIVE' && (
                <button onClick={() => changeStatus('DEBARRED')} disabled={!!actionLoading}
                  className="flex items-center gap-1.5 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-60">
                  <XCircle size={14} /> Debar
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left: Info */}
          <div className="space-y-4">
            {/* Contact */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-700">
                <User size={15} /> Contact Details
              </div>
              <dl className="space-y-1.5 text-sm">
                <div><dt className="text-gray-400 text-xs">Name</dt><dd className="text-gray-800">{supplier.user.firstName} {supplier.user.lastName}</dd></div>
                <div><dt className="text-gray-400 text-xs">Email</dt><dd className="text-gray-800 break-all">{supplier.user.email}</dd></div>
                {supplier.user.phone && <div><dt className="text-gray-400 text-xs">Phone</dt><dd className="text-gray-800">{supplier.user.phone}</dd></div>}
              </dl>
            </div>
            {/* Business */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-700">
                <Building2 size={15} /> Business Info
              </div>
              <dl className="space-y-1.5 text-sm">
                <div><dt className="text-gray-400 text-xs">Type</dt><dd className="text-gray-800">{supplier.businessType}</dd></div>
                <div><dt className="text-gray-400 text-xs">Location</dt><dd className="text-gray-800">{supplier.city}, {supplier.region}</dd></div>
                <div><dt className="text-gray-400 text-xs">Address</dt><dd className="text-gray-800">{supplier.address}</dd></div>
                {supplier.website && <div><dt className="text-gray-400 text-xs">Website</dt><dd><a href={supplier.website} target="_blank" className="text-blue-600 hover:underline text-xs flex items-center gap-1">{supplier.website} <ExternalLink size={10} /></a></dd></div>}
              </dl>
            </div>
            {/* Categories */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-700">
                <Tag size={15} /> Categories
              </div>
              <div className="flex flex-wrap gap-1.5">
                {supplier.categories.map((c, i) => (
                  <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{c.category.name}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Documents */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">Required Documents</h2>
                {allUploaded
                  ? <span className="flex items-center gap-1.5 text-xs text-green-700 font-semibold"><CheckCircle2 size={14} /> All documents uploaded</span>
                  : <span className="flex items-center gap-1.5 text-xs text-amber-600 font-semibold"><AlertTriangle size={14} /> {REQUIRED_DOCS.filter(d => getDocsOfType(d.type).length === 0).length} document(s) missing</span>
                }
              </div>

              <div className="space-y-4">
                {REQUIRED_DOCS.map(({ type, label }) => {
                  const docs = getDocsOfType(type)
                  const hasDoc = docs.length > 0
                  return (
                    <div key={type} className={`border rounded-xl p-4 ${hasDoc ? 'border-green-200 bg-green-50/30' : 'border-gray-200 bg-gray-50/50'}`}>
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex items-start gap-2.5">
                          {hasDoc
                            ? <CheckCircle2 size={18} className="text-green-600 shrink-0 mt-0.5" />
                            : <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                          }
                          <div>
                            <p className="text-sm font-medium text-gray-900">{label}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{hasDoc ? `${docs.length} file(s) uploaded` : 'No document uploaded yet'}</p>
                          </div>
                        </div>
                        <div>
                          <input
                            type="file"
                            ref={(el) => { fileInputRefs.current[type] = el }}
                            className="hidden"
                            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) uploadDoc(type, file)
                              e.target.value = ''
                            }}
                          />
                          <button
                            onClick={() => fileInputRefs.current[type]?.click()}
                            disabled={uploadingType === type}
                            className="flex items-center gap-1.5 text-xs bg-gray-800 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700 disabled:opacity-60 transition-colors"
                          >
                            {uploadingType === type
                              ? <><Loader2 size={12} className="animate-spin" /> Uploading...</>
                              : <><Upload size={12} /> Upload</>
                            }
                          </button>
                        </div>
                      </div>

                      {docs.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {docs.map((doc) => (
                            <div key={doc.id} className="flex items-center justify-between gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText size={14} className="text-gray-400 shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-xs font-medium text-gray-800 truncate">{doc.fileName}</p>
                                  <p className="text-xs text-gray-400">{formatSize(doc.fileSize)} · {formatDate(doc.createdAt)}</p>
                                </div>
                              </div>
                              <button onClick={() => deleteDoc(doc.id)}
                                className="text-red-400 hover:text-red-600 shrink-0 p-1">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
