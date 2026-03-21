'use client'
import { useEffect, useState } from 'react'
import { AdminNav } from '@/components/layout/AdminNav'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { Search, UserCheck, UserX, ShieldCheck, ShoppingCart, Truck, Users as UsersIcon } from 'lucide-react'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'ADMIN' | 'BUYER' | 'SUPPLIER'
  isActive: boolean
  createdAt: string
  entity: { name: string } | null
}

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: typeof ShieldCheck }> = {
  ADMIN:    { label: 'Admin',    color: 'bg-red-100 text-red-700',    icon: ShieldCheck },
  BUYER:    { label: 'Buyer',    color: 'bg-blue-100 text-blue-700',  icon: ShoppingCart },
  SUPPLIER: { label: 'Supplier', color: 'bg-green-100 text-green-700', icon: Truck },
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [page, setPage] = useState(1)
  const [toggling, setToggling] = useState<string | null>(null)
  const limit = 20

  const load = () => {
    setLoading(true)
    const q = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...(search && { search }),
      ...(roleFilter && { role: roleFilter }),
    })
    api.get<{ users: User[]; total: number }>(`/api/admin/users?${q}`)
      .then((r) => { setUsers(r.users); setTotal(r.total) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { setPage(1) }, [search, roleFilter])
  useEffect(load, [search, roleFilter, page])

  const toggleUser = async (id: string) => {
    setToggling(id)
    try {
      await api.patch(`/api/admin/users/${id}/toggle`, {})
      load()
    } finally { setToggling(null) }
  }

  const totalPages = Math.ceil(total / limit)

  // Role counts
  const buyerCount = users.filter(u => u.role === 'BUYER').length
  const supplierCount = users.filter(u => u.role === 'SUPPLIER').length
  const adminCount = users.filter(u => u.role === 'ADMIN').length

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav title="User Management" />
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900">Users &amp; Accounts</h2>
          <p className="text-sm text-gray-500 mt-1">Manage all buyers, suppliers, and admin accounts on the platform.</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total Users', value: total, color: 'bg-gray-50 border-gray-200', textColor: 'text-gray-900', icon: UsersIcon },
            { label: 'Buyers', value: roleFilter === '' ? buyerCount : (roleFilter === 'BUYER' ? total : '-'), color: 'bg-blue-50 border-blue-200', textColor: 'text-blue-700', icon: ShoppingCart },
            { label: 'Suppliers', value: roleFilter === '' ? supplierCount : (roleFilter === 'SUPPLIER' ? total : '-'), color: 'bg-green-50 border-green-200', textColor: 'text-green-700', icon: Truck },
            { label: 'Admins', value: roleFilter === '' ? adminCount : (roleFilter === 'ADMIN' ? total : '-'), color: 'bg-red-50 border-red-200', textColor: 'text-red-700', icon: ShieldCheck },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl border p-4 ${s.color}`}>
              <div className="flex items-center gap-2 mb-1">
                <s.icon size={14} className={s.textColor} />
                <span className="text-xs text-gray-500 font-medium">{s.label}</span>
              </div>
              <p className={`text-xl font-bold ${s.textColor}`}>{loading ? '...' : s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {[
              { value: '', label: 'All' },
              { value: 'BUYER', label: 'Buyers' },
              { value: 'SUPPLIER', label: 'Suppliers' },
              { value: 'ADMIN', label: 'Admins' },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setRoleFilter(opt.value)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  roleFilter === opt.value
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Users table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading...</div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No users found.</div>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">User</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Email</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Entity</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Joined</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.map((u) => {
                    const rc = ROLE_CONFIG[u.role] || ROLE_CONFIG.BUYER
                    const RoleIcon = rc.icon
                    return (
                      <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                              {u.firstName[0]}{u.lastName[0]}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{u.firstName} {u.lastName}</p>
                              <p className="text-xs text-gray-400 sm:hidden">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-gray-500 hidden sm:table-cell">{u.email}</td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${rc.color}`}>
                            <RoleIcon size={12} />
                            {rc.label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-gray-500 text-xs hidden md:table-cell">
                          {u.entity?.name || <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3.5 text-gray-400 text-xs hidden md:table-cell">
                          {formatDate(u.createdAt)}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                            u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {u.isActive ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button
                            onClick={() => toggleUser(u.id)}
                            disabled={toggling === u.id}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-60 ${
                              u.isActive
                                ? 'bg-red-50 text-red-700 hover:bg-red-100'
                                : 'bg-green-50 text-green-700 hover:bg-green-100'
                            }`}
                          >
                            {u.isActive ? <UserX size={13} /> : <UserCheck size={13} />}
                            {toggling === u.id ? '...' : u.isActive ? 'Disable' : 'Enable'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                  <p className="text-xs text-gray-400">
                    Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total} users
                  </p>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium disabled:opacity-40 hover:bg-gray-50"
                    >
                      Prev
                    </button>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium disabled:opacity-40 hover:bg-gray-50"
                    >
                      Next
                    </button>
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
