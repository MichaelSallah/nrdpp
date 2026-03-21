'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import {
  LayoutDashboard, FileText, Users, Bell, BarChart3,
  Settings, LogOut, Package, Award, MessageSquare, Shield, Building2
} from 'lucide-react'

const buyerNav = [
  { href: '/buyer/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/buyer/rfqs', label: 'My RFQs', icon: FileText },
  { href: '/buyer/rfqs/create', label: 'Create RFQ', icon: Package },
  { href: '/buyer/suppliers', label: 'Suppliers', icon: Users },
  { href: '/buyer/team', label: 'Team', icon: Shield },
  { href: '/buyer/reports', label: 'Reports', icon: BarChart3 },
]

const supplierNav = [
  { href: '/supplier/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/supplier/rfqs', label: 'Open RFQs', icon: FileText },
  { href: '/supplier/quotations', label: 'My Quotations', icon: Award },
  { href: '/supplier/profile', label: 'Company Profile', icon: Building2 },
  { href: '/supplier/team', label: 'Team', icon: Shield },
]

const adminNav = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/suppliers', label: 'Suppliers', icon: Users },
  { href: '/admin/entities', label: 'Entities', icon: Building2 },
  { href: '/admin/rfqs', label: 'All RFQs', icon: FileText },
  { href: '/admin/audit', label: 'Audit Logs', icon: Shield },
  { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuthStore()

  const nav = user?.role === 'ADMIN' ? adminNav : user?.role === 'BUYER' ? buyerNav : supplierNav
  const portalLabel = user?.role === 'ADMIN' ? 'Admin Portal' : user?.role === 'BUYER' ? 'Buyer Portal' : 'Supplier Portal'

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  return (
    <aside className="w-64 bg-blue-900 min-h-screen flex flex-col">
      {/* Logo */}
      <div className="p-5 border-b border-blue-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-yellow-400 rounded-full flex items-center justify-center text-blue-900 font-bold text-sm flex-shrink-0">GH</div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">NRDPP</p>
            <p className="text-blue-300 text-xs">{portalLabel}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {nav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                active
                  ? 'bg-blue-700 text-white shadow-sm'
                  : 'text-blue-300 hover:text-white hover:bg-blue-800'
              )}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User + Logout */}
      <div className="p-4 border-t border-blue-700">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-blue-700 rounded-full flex items-center justify-center text-white text-sm font-medium">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{user?.firstName} {user?.lastName}</p>
            <p className="text-blue-300 text-xs truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-blue-300 hover:text-white hover:bg-blue-800 rounded-lg text-sm transition-colors"
        >
          <LogOut size={16} /> Sign Out
        </button>
      </div>
    </aside>
  )
}
