'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import {
  LayoutDashboard, Users, Building2, FileText, ShieldCheck, BarChart3, LogOut, Shield, UserCog,
} from 'lucide-react'

const navLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/users', label: 'Users', icon: UserCog },
  { href: '/suppliers', label: 'Suppliers', icon: Users },
  { href: '/entities', label: 'Entities', icon: Building2 },
  { href: '/rfqs', label: 'All RFQs', icon: FileText },
  { href: '/audit', label: 'Audit Trail', icon: ShieldCheck },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
]

interface AdminNavProps {
  title?: string
}

export function AdminNav({ title }: AdminNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  return (
    <header className="bg-gray-900 border-b border-gray-700 sticky top-0 z-30">
      {/* Brand + user row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0">
            <Shield size={16} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">NRDPP Admin</p>
            <p className="text-gray-400 text-xs leading-tight hidden sm:block">
              {title || 'Administrator Console'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {user && (
            <span className="text-gray-400 text-xs hidden sm:block">
              {user.firstName} {user.lastName}
            </span>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-gray-400 hover:text-white text-xs px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      </div>

      {/* Tab strip */}
      <nav
        className="max-w-7xl mx-auto px-4 sm:px-6 flex items-end gap-0 overflow-x-auto"
        style={{ scrollbarWidth: 'none' }}
      >
        {navLinks.map((item) => {
          const Icon = item.icon
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-all',
                active
                  ? 'border-red-500 text-red-400'
                  : 'border-transparent text-gray-400 hover:text-white hover:border-gray-600'
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
