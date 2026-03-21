'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AdminNav } from '@/components/layout/AdminNav'
import { api } from '@/lib/api'
import { supplierStatusColor, formatDate } from '@/lib/utils'
import {
  CheckCircle2, XCircle, AlertTriangle, Upload, Trash2, FileText,
  ArrowLeft, User, Building2, Tag, Loader2, ExternalLink, Clock, CalendarDays
} from 'lucide-react'

// Ghana legal framework — document compliance tiers
type DocTier = 'UNIVERSAL' | 'GOVERNMENT' | 'RECOMMENDED'
const ALL_DOCS = [
  { type: 'BUSINESS_REGISTRATION', label: 'Business Registration Documents',     legalRef: 'Companies Act 2019, Act 992',        tier: 'UNIVERSAL' as DocTier,    description: 'Certificate of Incorporation, Constitution, Company Profile' },
  { type: 'TAX_CLEARANCE',         label: 'Valid Tax Clearance Certificate',      legalRef: 'Income Tax Act 2015, Act 896',       tier: 'GOVERNMENT' as DocTier,   description: 'Issued by Ghana Revenue Authority (GRA)' },
  { type: 'SSNIT_CLEARANCE',       label: 'Valid SSNIT Clearance Certificate',    legalRef: 'National Pensions Act 2008, Act 766', tier: 'GOVERNMENT' as DocTier,  description: 'Required for companies with employees' },
  { type: 'PPA_REGISTRATION',      label: 'Evidence of Registration with the PPA', legalRef: 'Public Procurement Act 2003, Act 663', tier: 'GOVERNMENT' as DocTier, description: 'Registration on GHANEPS or PPA portal' },
  { type: 'VAT_REGISTRATION',      label: 'VAT Registration Certificate',         legalRef: 'VAT Act 2013, Act 870',              tier: 'RECOMMENDED' as DocTier,  description: 'Required only if company meets VAT threshold' },
]
const TIER_LABELS: Record<DocTier, { label: string; color: string; bgColor: string }> = {
  UNIVERSAL:   { label: 'Mandatory',                    color: 'text-red-700',    bgColor: 'bg-red-100' },
  GOVERNMENT:  { label: 'Gov\'t Procurement Required',  color: 'text-blue-700',   bgColor: 'bg-blue-100' },
  RECOMMENDED: { label: 'Recommended',                  color: 'text-gray-600',   bgColor: 'bg-gray-100' },
}

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
  user: { email: string; firstName: string; lastName: string; phone: string | null }
  documents: Doc[]
  categories: Array<{ category: { name: string } }>
  _count: { quotations: number }
}

// Returns: 'expired' | 'expiring' | 'ok' | 'none'
function expiryStatus(doc: Doc): 'expired' | 'expiring' | 'ok' | 'none' {
  if (!doc.expiryDate) return 'none'
  const diff = new Date(doc.expiryDate).getTime() - Date.now()
  if (diff < 0) return 'expired'
  if (diff < 30 * 86_400_000) return 'expiring'
  return 'ok'
}

function ExpiryBadge({ doc }: { doc: Doc }) {
  const status = expiryStatus(doc)
  if (status === 'none') return <span className="text-xs text-gray-400">No expiry set</span>
  const date = new Date(doc.expiryDate!).toLocaleDateString('en-GH', { day:'numeric', month:'short', year:'numeric' })
  if (status === 'expired') return (
    <span className="flex items-center gap-1 text-xs text-red-600 font-semibold">
      <XCircle size={12} /> Expired {date}
    </span>
  )
  if (status === 'expiring') return (
    <span className="flex items-center gap-1 text-xs text-amber-600 font-semibold">
      <Clock size={12} /> Expires {date}
    </span>
  )
  return (
    <span className="flex items-center gap-1 text-xs text-green-700">
      <CalendarDays size={12} /> Valid until {date}
    </span>
  )
}

export default function AdminSupplierDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [uploadingType, setUploadingType] = useState<string | null>(null)
  const [pendingUpload, setPendingUpload] = useState<{ type: string; file: File } | null>(null)
  const [expiryDate, setExpiryDate] = useState('')
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
    setActionLoading(newStatus); setError(''); setSuccess('')
    try {
      await api.patch(`/api/suppliers/${id}/status`, { status: newStatus })
      setSuccess(newStatus === 'ACTIVE' ? 'Supplier approved and activated.' : `Supplier ${newStatus.toLowerCase()}.`)
      load()
    } catch { setError('Failed to update status') }
    finally { setActionLoading(null) }
  }

  const confirmUpload = async () => {
    if (!pendingUpload) return
    if (!expiryDate) { setError('Please set an expiry date for this document.'); return }
    setUploadingType(pendingUpload.type); setError(''); setSuccess('')
    try {
      const form = new FormData()
      form.append('file', pendingUpload.file)
      form.append('type', pendingUpload.type)
      form.append('expiryDate', expiryDate)
      const BASE = process.env.NEXT_PUBLIC_API_URL || ''
      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_access_token') : null
      const res = await fetch(`${BASE}/api/admin/suppliers/${id}/documents`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Upload failed') }
      setSuccess('Document uploaded successfully.')
      setPendingUpload(null); setExpiryDate('')
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

  // Universal docs (Act 992) — blocks ALL bidding if missing/expired
  const universalDocs = ALL_DOCS.filter((d) => d.tier === 'UNIVERSAL')
  const universalCompliant = universalDocs.every((d) => {
    const docs = getDocsOfType(d.type)
    return docs.length > 0 && docs.every((doc) => expiryStatus(doc) !== 'expired')
  })
  const universalIssues = universalDocs.filter((d) => {
    const docs = getDocsOfType(d.type)
    return docs.length === 0 || docs.some((doc) => expiryStatus(doc) === 'expired')
  }).length

  // Government docs (Acts 896, 766, 663) — blocks Gov't RFQ bidding if missing/expired
  const govDocs = ALL_DOCS.filter((d) => d.tier === 'GOVERNMENT')
  const govCompliant = govDocs.every((d) => {
    const docs = getDocsOfType(d.type)
    return docs.length > 0 && docs.every((doc) => expiryStatus(doc) !== 'expired')
  })
  const govIssues = govDocs.filter((d) => {
    const docs = getDocsOfType(d.type)
    return docs.length === 0 || docs.some((doc) => expiryStatus(doc) === 'expired')
  }).length

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

        <button onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-5">
          <ArrowLeft size={16} /> Back to Suppliers
        </button>

        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
        {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{success}</div>}

        {/* Expiry date modal overlay */}
        {pendingUpload && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
              <h3 className="font-bold text-gray-900 mb-1">Set Document Expiry Date</h3>
              <p className="text-sm text-gray-500 mb-4">
                {ALL_DOCS.find(d => d.type === pendingUpload.type)?.label}
                <br /><span className="text-xs text-gray-400">{pendingUpload.file.name}</span>
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  value={expiryDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <p className="text-xs text-gray-400 mt-1">Suppliers cannot bid once this document expires.</p>
              </div>
              {error && <p className="text-xs text-red-600 mb-3">{error}</p>}
              <div className="flex gap-2">
                <button onClick={() => { setPendingUpload(null); setExpiryDate(''); setError('') }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                  Cancel
                </button>
                <button onClick={confirmUpload} disabled={!!uploadingType}
                  className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-semibold hover:bg-gray-800 disabled:opacity-60 flex items-center justify-center gap-2">
                  {uploadingType ? <><Loader2 size={14} className="animate-spin" /> Uploading...</> : 'Upload Document'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header card */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1 flex-wrap">
                <h1 className="text-xl font-bold text-gray-900">{supplier.companyName}</h1>
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${supplierStatusColor(supplier.status)}`}>{supplier.status}</span>
                {supplier.status === 'PENDING' && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-semibold animate-pulse">Awaiting Approval</span>
                )}
                {!universalCompliant && supplier.status === 'ACTIVE' && (
                  <span className="text-xs bg-red-100 text-red-700 px-2.5 py-1 rounded-full font-semibold">All Bidding Blocked — {universalIssues} mandatory doc(s) missing/expired</span>
                )}
                {universalCompliant && !govCompliant && supplier.status === 'ACTIVE' && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-semibold">Cannot bid on Gov&apos;t RFQs — {govIssues} doc(s) missing</span>
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
                    {actionLoading === 'ACTIVE' ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Approve
                  </button>
                  <button onClick={() => changeStatus('DEBARRED')} disabled={!!actionLoading}
                    className="flex items-center gap-1.5 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-60">
                    {actionLoading === 'DEBARRED' ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />} Reject
                  </button>
                </>
              )}
              {supplier.status === 'ACTIVE' && (
                <button onClick={() => changeStatus('SUSPENDED')} disabled={!!actionLoading}
                  className="flex items-center gap-1.5 bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-orange-600 disabled:opacity-60">
                  <AlertTriangle size={14} /> Suspend
                </button>
              )}
              {supplier.status === 'ACTIVE' && (
                <button onClick={() => changeStatus('DEBARRED')} disabled={!!actionLoading}
                  className="flex items-center gap-1.5 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-60">
                  <XCircle size={14} /> Debar
                </button>
              )}
              {(supplier.status === 'SUSPENDED' || supplier.status === 'DEBARRED') && (
                <button onClick={() => changeStatus('ACTIVE')} disabled={!!actionLoading}
                  className="flex items-center gap-1.5 bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-800 disabled:opacity-60">
                  <CheckCircle2 size={14} /> Reinstate
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left: Info */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-700"><User size={15} /> Contact Details</div>
              <dl className="space-y-1.5 text-sm">
                <div><dt className="text-gray-400 text-xs">Name</dt><dd className="text-gray-800">{supplier.user.firstName} {supplier.user.lastName}</dd></div>
                <div><dt className="text-gray-400 text-xs">Email</dt><dd className="text-gray-800 break-all">{supplier.user.email}</dd></div>
                {supplier.user.phone && <div><dt className="text-gray-400 text-xs">Phone</dt><dd className="text-gray-800">{supplier.user.phone}</dd></div>}
              </dl>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-700"><Building2 size={15} /> Business Info</div>
              <dl className="space-y-1.5 text-sm">
                <div><dt className="text-gray-400 text-xs">Type</dt><dd className="text-gray-800">{supplier.businessType}</dd></div>
                <div><dt className="text-gray-400 text-xs">Location</dt><dd className="text-gray-800">{supplier.city}, {supplier.region}</dd></div>
                <div><dt className="text-gray-400 text-xs">Address</dt><dd className="text-gray-800">{supplier.address}</dd></div>
                {supplier.website && <div><dt className="text-gray-400 text-xs">Website</dt><dd><a href={supplier.website} target="_blank" className="text-blue-600 hover:underline text-xs flex items-center gap-1">{supplier.website} <ExternalLink size={10} /></a></dd></div>}
              </dl>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-700"><Tag size={15} /> Categories</div>
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
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h2 className="font-semibold text-gray-900">Required Documents</h2>
                <div className="flex items-center gap-2 flex-wrap">
                  {universalCompliant
                    ? <span className="flex items-center gap-1.5 text-xs text-green-700 font-semibold bg-green-50 px-2.5 py-1 rounded-full"><CheckCircle2 size={13} /> Mandatory docs OK</span>
                    : <span className="flex items-center gap-1.5 text-xs text-red-700 font-semibold bg-red-50 px-2.5 py-1 rounded-full"><XCircle size={13} /> {universalIssues} mandatory issue(s)</span>
                  }
                  {govCompliant
                    ? <span className="flex items-center gap-1.5 text-xs text-blue-700 font-semibold bg-blue-50 px-2.5 py-1 rounded-full"><CheckCircle2 size={13} /> Gov&apos;t procurement ready</span>
                    : <span className="flex items-center gap-1.5 text-xs text-amber-700 font-semibold bg-amber-50 px-2.5 py-1 rounded-full"><AlertTriangle size={13} /> {govIssues} gov&apos;t doc(s) missing</span>
                  }
                </div>
              </div>

              <div className="space-y-4">
                {ALL_DOCS.map(({ type, label, legalRef, tier, description }) => {
                  const docs = getDocsOfType(type)
                  const hasDoc = docs.length > 0
                  const anyExpired = docs.some((d) => expiryStatus(d) === 'expired')
                  const anyExpiring = docs.some((d) => expiryStatus(d) === 'expiring')
                  const isBlocking = tier !== 'RECOMMENDED'
                  const borderCls = isBlocking && anyExpired ? 'border-red-200 bg-red-50/30' : anyExpiring ? 'border-amber-200 bg-amber-50/30' : hasDoc ? 'border-green-200 bg-green-50/30' : tier === 'RECOMMENDED' ? 'border-gray-200 bg-gray-50/30' : 'border-gray-200'
                  const tierStyle = TIER_LABELS[tier]
                  const iconEl = isBlocking && anyExpired
                    ? <XCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
                    : anyExpiring
                      ? <Clock size={18} className="text-amber-500 shrink-0 mt-0.5" />
                      : hasDoc
                        ? <CheckCircle2 size={18} className="text-green-600 shrink-0 mt-0.5" />
                        : tier === 'RECOMMENDED'
                          ? <FileText size={18} className="text-gray-400 shrink-0 mt-0.5" />
                          : <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />

                  return (
                    <div key={type} className={`border rounded-xl p-4 ${borderCls}`}>
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex items-start gap-2.5">
                          {iconEl}
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium text-gray-900">{label}</p>
                              <span className={`text-xs ${tierStyle.bgColor} ${tierStyle.color} px-1.5 py-0.5 rounded font-medium`}>{tierStyle.label}</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">{description}</p>
                            <p className="text-xs text-gray-400 mt-0.5 italic">{legalRef}</p>
                            {!hasDoc && tier === 'RECOMMENDED' && (
                              <p className="text-xs text-gray-400 mt-0.5">Optional — does not block bidding. Only required if company meets VAT threshold.</p>
                            )}
                            {!hasDoc && tier === 'GOVERNMENT' && (
                              <p className="text-xs text-amber-600 mt-0.5">Required for Government Entity RFQs only — not needed for Private Entity RFQs</p>
                            )}
                            {!hasDoc && tier === 'UNIVERSAL' && (
                              <p className="text-xs text-red-600 mt-0.5 font-medium">Missing — supplier cannot bid on ANY RFQ</p>
                            )}
                            {anyExpired && isBlocking && (
                              <p className="text-xs text-red-600 mt-0.5 font-medium">Document expired — {tier === 'UNIVERSAL' ? 'blocks all bidding' : 'blocks Government RFQ bidding'}</p>
                            )}
                            {!anyExpired && hasDoc && !anyExpiring && (
                              <p className="text-xs text-green-600 mt-0.5">{docs.length} file(s) uploaded</p>
                            )}
                            {anyExpiring && (
                              <p className="text-xs text-amber-600 mt-0.5">Expiring soon — renew urgently</p>
                            )}
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
                              if (file) { setPendingUpload({ type, file }); setError('') }
                              e.target.value = ''
                            }}
                          />
                          <button
                            onClick={() => fileInputRefs.current[type]?.click()}
                            disabled={!!uploadingType}
                            className="flex items-center gap-1.5 text-xs bg-gray-800 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700 disabled:opacity-60 transition-colors"
                          >
                            <Upload size={12} /> {hasDoc ? 'Replace' : 'Upload'}
                          </button>
                        </div>
                      </div>

                      {docs.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {docs.map((doc) => {
                            const es = expiryStatus(doc)
                            const rowBorder = es === 'expired' ? 'border-red-200 bg-red-50' : es === 'expiring' ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-white'
                            return (
                              <div key={doc.id} className={`flex items-center justify-between gap-2 border rounded-lg px-3 py-2 ${rowBorder}`}>
                                <div className="flex items-center gap-2 min-w-0">
                                  <FileText size={14} className="text-gray-400 shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-xs font-medium text-gray-800 truncate">{doc.fileName}</p>
                                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                      <span className="text-xs text-gray-400">{formatSize(doc.fileSize)}</span>
                                      <span className="text-gray-300">·</span>
                                      <span className="text-xs text-gray-400">Uploaded {formatDate(doc.createdAt)}</span>
                                      <span className="text-gray-300">·</span>
                                      <ExpiryBadge doc={doc} />
                                    </div>
                                  </div>
                                </div>
                                <button onClick={() => deleteDoc(doc.id)}
                                  className="text-red-400 hover:text-red-600 shrink-0 p-1">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 space-y-1">
                <p className="text-xs text-gray-500 font-medium">Document Compliance Tiers:</p>
                <p className="text-xs text-gray-400"><span className="font-semibold text-red-600">Mandatory</span> — Business Registration (Act 992): blocks ALL bidding if missing or expired</p>
                <p className="text-xs text-gray-400"><span className="font-semibold text-blue-600">Gov&apos;t Procurement</span> — Tax Clearance (Act 896), SSNIT (Act 766), PPA (Act 663): required for Government Entity RFQs only</p>
                <p className="text-xs text-gray-400"><span className="font-semibold text-gray-500">Recommended</span> — VAT Registration (Act 870): threshold-dependent, never blocks bidding</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
