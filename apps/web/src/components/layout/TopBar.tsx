'use client'
import { useEffect, useState } from 'react'
import { Bell, LayoutDashboard, FileText, Users, BarChart3, Plus, Award, Building2, Shield } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const buyerNav = [
  { href: '/buyer/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/buyer/rfqs', label: 'My RFQs', icon: FileText },
  { href: '/buyer/rfqs/create', label: 'New RFQ', icon: Plus },
  { href: '/buyer/suppliers', label: 'Suppliers', icon: Users },
  { href: '/buyer/reports', label: 'Reports', icon: BarChart3 },
]

const supplierNav = [
  { href: '/supplier/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/supplier/rfqs', label: 'Open RFQs', icon: FileText },
  { href: '/supplier/quotations', label: 'Quotations', icon: Award },
  { href: '/supplier/profile', label: 'Profile', icon: Building2 },
]

const adminNav = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/suppliers', label: 'Suppliers', icon: Users },
  { href: '/admin/entities', label: 'Entities', icon: Building2 },
  { href: '/admin/rfqs', label: 'All RFQs', icon: FileText },
  { href: '/admin/audit', label: 'Audit Logs', icon: Shield },
  { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
]

export function TopBar({ title }: { title: string }) {
  const { user } = useAuthStore()
  const pathname = usePathname()
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    api.get<{ count: number }>('/api/notifications/unread-count')
      .then((r) => setUnread(r.count))
      .catch(() => {})
  }, [])

  const nav =
    user?.role === 'ADMIN' ? adminNav :
    user?.role === 'BUYER' ? buyerNav :
    supplierNav

  const roleBase = `/${user?.role?.toLowerCase()}`

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
      {/* Title row */}
      <div className="px-6 py-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
        <Link
          href={`${roleBase}/notifications`}
          className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Bell size={20} />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Link>
      </div>

      {/* Navigation tab strip */}
      <nav className="flex items-end gap-0 px-4 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {nav.map((item) => {
          const Icon = item.icon
          // Active: exact match, or path starts with tab href (but avoid dashboard being active on sub-paths)
          const active =
            pathname === item.href ||
            (pathname.startsWith(item.href + '/') && item.href !== `${roleBase}/dashboard`)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-all',
                active
                  ? 'border-blue-700 text-blue-700 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              )}
            >
              <Icon size={14} />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </header>
  )
}
