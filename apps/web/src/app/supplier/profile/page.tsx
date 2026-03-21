'use client'
import { useEffect, useState, useRef } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { api } from '@/lib/api'
import { formatDate, supplierStatusColor } from '@/lib/utils'
import { Building2, Upload, FileText, CheckCircle, AlertTriangle, Plus } from 'lucide-react'

interface SupplierProfile {
  id: string
  companyName: string
  registrationNo: string
  taxId: string
  ssnitNo: string | null
  procurementRegNo: string | null
  businessType: string
  yearEstablished: number | null
  address: string
  city: string
  region: string
  website: string | null
  description: string | null
  status: string
  riskScore: number
  verifiedAt: string | null
  categories: Array<{ category: { id: string; name: string } }>
  documents: Array<{
    id: string; type: string; fileName: string
    fileUrl: string; expiryDate: string | null; verified: boolean
  }>
}

const DOC_LABELS: Record<string, string> = {
  BUSINESS_REGISTRATION: 'Business Registration',
  TAX_CLEARANCE: 'Tax Clearance Certificate',
  SSNIT_CLEARANCE: 'SSNIT Clearance',
  COMPANY_CERTIFICATE: 'Company Certificate',
  COMPANY_PROFILE: 'Company Profile',
  OTHER: 'Other Document',
}

export default function SupplierProfilePage() {
  const [profile, setProfile] = useState<SupplierProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploadType, setUploadType] = useState('BUSINESS_REGISTRATION')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const loadProfile = () => {
    api.get<{ supplier: SupplierProfile }>('/api/suppliers/me/profile')
      .then((r) => setProfile(r.supplier))
      .finally(() => setLoading(false))
  }

  useEffect(loadProfile, [])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('type', uploadType)
      await api.upload(`/api/suppliers/${profile.id}/documents`, fd)
      loadProfile()
    } catch (err) {
      alert('Upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  if (loading) return (
    <div><TopBar title="Company Profile" /><div className="p-8 text-center text-gray-400">Loading...</div></div>
  )

  if (!profile) return (
    <div>
      <TopBar title="Company Profile" />
      <div className="p-8 text-center">
        <p className="text-gray-500 mb-4">You haven&apos;t set up a supplier profile yet.</p>
        <a href="/register/supplier" className="bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-800">
          Complete Registration
        </a>
      </div>
    </div>
  )

  return (
    <div>
      <TopBar title="Company Profile" />
      <div className="p-6 max-w-4xl mx-auto space-y-6">

        {/* Header card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
              <Building2 size={32} className="text-blue-700" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-xl font-bold text-gray-900">{profile.companyName}</h1>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${supplierStatusColor(profile.status)}`}>
                  {profile.status}
                </span>
              </div>
              <p className="text-sm text-gray-500">{profile.registrationNo} · {profile.businessType}</p>
              <p className="text-sm text-gray-500">{profile.city}, {profile.region}</p>
              {profile.verifiedAt && (
                <div className="flex items-center gap-1.5 mt-2 text-xs text-green-600">
                  <CheckCircle size={12} />
                  <span>Verified on {formatDate(profile.verifiedAt)}</span>
                </div>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Risk Score</p>
              <p className="text-2xl font-bold text-gray-700">{profile.riskScore}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Company Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Company Information</h2>
            <dl className="space-y-3 text-sm">
              {[
                ['Tax ID', profile.taxId],
                ['SSNIT No.', profile.ssnitNo || '—'],
                ['Procurement Reg No.', profile.procurementRegNo || '—'],
                ['Year Established', profile.yearEstablished?.toString() || '—'],
                ['Address', profile.address],
                ['Website', profile.website || '—'],
              ].map(([label, value]) => (
                <div key={label} className="flex gap-3">
                  <dt className="text-gray-400 w-36 shrink-0">{label}</dt>
                  <dd className="text-gray-700 font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Categories */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Business Categories</h2>
            {profile.categories.length === 0 ? (
              <p className="text-sm text-gray-400">No categories assigned.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {profile.categories.map((c) => (
                  <span key={c.category.id} className="px-3 py-1.5 bg-green-50 text-green-800 text-sm rounded-lg font-medium">
                    {c.category.name}
                  </span>
                ))}
              </div>
            )}
            {profile.description && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-400 mb-1">Description</p>
                <p className="text-sm text-gray-700">{profile.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Documents */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Compliance Documents</h2>
            <div className="flex items-center gap-2">
              <select
                value={uploadType}
                onChange={(e) => setUploadType(e.target.value)}
                className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(DOC_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
              <label className={`flex items-center gap-1.5 bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer hover:bg-green-800 transition-colors ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
                <Plus size={12} />
                {uploading ? 'Uploading...' : 'Upload'}
                <input ref={fileRef} type="file" className="hidden" onChange={handleUpload} accept=".pdf,.jpg,.jpeg,.png" />
              </label>
            </div>
          </div>

          {profile.documents.length === 0 ? (
            <div className="text-center py-8">
              <FileText size={40} className="text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400">No documents uploaded yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {profile.documents.map((doc) => {
                const expired = doc.expiryDate && new Date(doc.expiryDate) < new Date()
                return (
                  <div key={doc.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <FileText size={16} className="text-gray-400 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-800">{DOC_LABELS[doc.type] || doc.type}</p>
                        <p className="text-xs text-gray-400">{doc.fileName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {doc.expiryDate && (
                        <div className={`flex items-center gap-1 text-xs ${expired ? 'text-red-500' : 'text-gray-400'}`}>
                          {expired && <AlertTriangle size={12} />}
                          Exp: {formatDate(doc.expiryDate)}
                        </div>
                      )}
                      {doc.verified ? (
                        <div className="flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle size={12} /> Verified
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Pending review</span>
                      )}
                      <a href={`http://localhost:5000${doc.fileUrl}`} target="_blank" rel="noreferrer" className="text-xs text-blue-700 hover:underline">
                        View
                      </a>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
