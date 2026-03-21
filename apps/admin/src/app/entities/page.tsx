'use client'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { AdminNav } from '@/components/layout/AdminNav'
import { api } from '@/lib/api'
import { Building2, Plus, X, Shield, Briefcase } from 'lucide-react'

interface Entity {
  id: string; name: string; code: string; region: string; type: string; sector: string
  address: string | null; phone: string | null; email: string | null
  _count: { users: number; rfqs: number }
}

const REGIONS = [
  'Greater Accra', 'Ashanti', 'Western', 'Eastern', 'Central',
  'Brong-Ahafo', 'Northern', 'Upper East', 'Upper West', 'Volta',
  'Oti', 'Savannah', 'North East', 'Bono', 'Bono East', 'Western North',
]

const GOVERNMENT_TYPES = ['MINISTRY', 'AGENCY', 'DISTRICT_ASSEMBLY', 'COMMISSION', 'AUTHORITY', 'CORPORATION', 'OTHER']
const PRIVATE_TYPES = ['COMPANY', 'NGO', 'PARTNERSHIP', 'SOLE_PROPRIETORSHIP', 'OTHER']

interface FormData {
  name: string; code: string; region: string; type: string; sector: string
  address: string; phone: string; email: string
}

export default function AdminEntitiesPage() {
  const [entities, setEntities] = useState<Entity[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, reset, watch, setValue } = useForm<FormData>({
    defaultValues: { sector: 'GOVERNMENT' },
  })

  const selectedSector = watch('sector')

  const loadEntities = () => {
    api.get<{ entities: Entity[] }>('/api/admin/entities')
      .then((r) => setEntities(r.entities))
      .finally(() => setLoading(false))
  }

  useEffect(loadEntities, [])

  // Reset type when sector changes
  useEffect(() => {
    setValue('type', '')
  }, [selectedSector, setValue])

  const typeOptions = selectedSector === 'PRIVATE' ? PRIVATE_TYPES : GOVERNMENT_TYPES

  const onSubmit = async (data: FormData) => {
    setSaving(true)
    try {
      await api.post('/api/admin/entities', data)
      reset({ sector: 'GOVERNMENT' })
      setShowForm(false)
      loadEntities()
    } finally { setSaving(false) }
  }

  const govCount = entities.filter((e) => e.sector === 'GOVERNMENT' || !e.sector).length
  const privateCount = entities.filter((e) => e.sector === 'PRIVATE').length

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav title="Buying Entities" />
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <p className="text-sm text-gray-500">{entities.length} registered buying institutions</p>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                <Shield size={12} /> {govCount} Government
              </span>
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                <Briefcase size={12} /> {privateCount} Private
              </span>
            </div>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors"
          >
            {showForm ? <X size={16} /> : <Plus size={16} />}
            {showForm ? 'Cancel' : 'Add Entity'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h2 className="font-semibold text-gray-900 mb-4">Register New Buying Entity</h2>

            {/* Sector selector */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">Entity Sector *</label>
              <div className="flex gap-3">
                <label className={`flex-1 flex items-center gap-3 border-2 rounded-xl p-4 cursor-pointer transition-colors ${selectedSector === 'GOVERNMENT' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" value="GOVERNMENT" {...register('sector', { required: true })} className="sr-only" />
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${selectedSector === 'GOVERNMENT' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>
                    <Shield size={20} />
                  </div>
                  <div>
                    <p className={`font-semibold ${selectedSector === 'GOVERNMENT' ? 'text-blue-900' : 'text-gray-700'}`}>Government Entity</p>
                    <p className="text-xs text-gray-500">Ministry, Agency, District Assembly, etc.</p>
                    <p className="text-xs text-blue-600 mt-0.5 font-medium">PPA Registration required for suppliers</p>
                  </div>
                </label>
                <label className={`flex-1 flex items-center gap-3 border-2 rounded-xl p-4 cursor-pointer transition-colors ${selectedSector === 'PRIVATE' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" value="PRIVATE" {...register('sector', { required: true })} className="sr-only" />
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${selectedSector === 'PRIVATE' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-400'}`}>
                    <Briefcase size={20} />
                  </div>
                  <div>
                    <p className={`font-semibold ${selectedSector === 'PRIVATE' ? 'text-purple-900' : 'text-gray-700'}`}>Private Entity</p>
                    <p className="text-xs text-gray-500">Company, NGO, Partnership, etc.</p>
                    <p className="text-xs text-purple-600 mt-0.5 font-medium">PPA Registration NOT required</p>
                  </div>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input {...register('name', { required: true })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" placeholder={selectedSector === 'GOVERNMENT' ? 'Ministry of Finance...' : 'Acme Corporation...'} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code / Acronym *</label>
                <input {...register('code', { required: true })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="MOFEP" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Region *</label>
                <select {...register('region', { required: true })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                  <option value="">Select region</option>
                  {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                <select {...register('type', { required: true })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                  <option value="">Select type</option>
                  {typeOptions.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input {...register('address')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="P.O. Box ..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input {...register('phone')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="+233..." />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input {...register('email')} type="email" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="procurement@ministry.gov.gh" />
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button type="submit" disabled={saving} className="bg-red-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-60">
                {saving ? 'Saving...' : 'Create Entity'}
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {entities.map((e) => {
              const isGov = e.sector === 'GOVERNMENT' || !e.sector
              return (
                <div key={e.id} className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isGov ? 'bg-blue-100' : 'bg-purple-100'}`}>
                      {isGov
                        ? <Shield size={20} className="text-blue-700" />
                        : <Briefcase size={20} className="text-purple-700" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900 truncate">{e.name}</h3>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full shrink-0">{e.code}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 font-medium ${isGov ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                          {isGov ? 'Government' : 'Private'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{e.type.replace(/_/g, ' ')} · {e.region}</p>
                      {!isGov && <p className="text-xs text-purple-500 mt-0.5">PPA Registration not required</p>}
                      {e.email && <p className="text-xs text-gray-400 mt-0.5">{e.email}</p>}
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                        <span>{e._count.users} user{e._count.users !== 1 ? 's' : ''}</span>
                        <span>{e._count.rfqs} RFQ{e._count.rfqs !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
