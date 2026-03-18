'use client'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { TopBar } from '@/components/layout/TopBar'
import { api } from '@/lib/api'
import { Building2, Plus, X } from 'lucide-react'

interface Entity {
  id: string; name: string; code: string; region: string; type: string
  address: string | null; phone: string | null; email: string | null
  _count: { users: number; rfqs: number }
}

const REGIONS = [
  'Greater Accra', 'Ashanti', 'Western', 'Eastern', 'Central',
  'Brong-Ahafo', 'Northern', 'Upper East', 'Upper West', 'Volta',
  'Oti', 'Savannah', 'North East', 'Bono', 'Bono East', 'Western North',
]

const TYPES = ['MINISTRY', 'AGENCY', 'DISTRICT_ASSEMBLY', 'COMMISSION', 'AUTHORITY', 'CORPORATION', 'OTHER']

interface FormData {
  name: string; code: string; region: string; type: string
  address: string; phone: string; email: string
}

export default function AdminEntitiesPage() {
  const [entities, setEntities] = useState<Entity[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>()

  const loadEntities = () => {
    api.get<{ entities: Entity[] }>('/api/admin/entities')
      .then((r) => setEntities(r.entities))
      .finally(() => setLoading(false))
  }

  useEffect(loadEntities, [])

  const onSubmit = async (data: FormData) => {
    setSaving(true)
    try {
      await api.post('/api/admin/entities', data)
      reset()
      setShowForm(false)
      loadEntities()
    } finally { setSaving(false) }
  }

  return (
    <div>
      <TopBar title="Buying Entities" />
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <p className="text-sm text-gray-500">{entities.length} registered buying institutions</p>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-800 transition-colors"
          >
            {showForm ? <X size={16} /> : <Plus size={16} />}
            {showForm ? 'Cancel' : 'Add Entity'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h2 className="font-semibold text-gray-900 mb-4">Register New Buying Entity</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input {...register('name', { required: true })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="Ministry of Finance..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code / Acronym *</label>
                <input {...register('code', { required: true })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="MOFEP" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Region *</label>
                <select {...register('region', { required: true })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                  <option value="">Select region</option>
                  {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                <select {...register('type', { required: true })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                  <option value="">Select type</option>
                  {TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input {...register('address')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="P.O. Box ..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input {...register('phone')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="+233..." />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input {...register('email')} type="email" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="procurement@ministry.gov.gh" />
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button type="submit" disabled={saving} className="bg-green-700 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-green-800 disabled:opacity-60">
                {saving ? 'Saving...' : 'Create Entity'}
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {entities.map((e) => (
              <div key={e.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                    <Building2 size={20} className="text-green-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 truncate">{e.name}</h3>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full shrink-0">{e.code}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{e.type.replace(/_/g, ' ')} · {e.region}</p>
                    {e.email && <p className="text-xs text-gray-400 mt-0.5">{e.email}</p>}
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      <span>{e._count.users} user{e._count.users !== 1 ? 's' : ''}</span>
                      <span>{e._count.rfqs} RFQ{e._count.rfqs !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
