'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Home, FileText, LogIn, UserPlus } from 'lucide-react'

const navLinks = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/rfqs', label: 'Browse RFQs', icon: FileText },
  { href: '/login', label: 'Login', icon: LogIn },
  { href: '/register', label: 'Register', icon: UserPlus },
]

export function PublicNav() {
  const pathname = usePathname()

  return (
    <header className="bg-green-900 border-b border-green-700 sticky top-0 z-30">
      {/* Brand row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-green-900 font-bold text-xs flex-shrink-0">GH</div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">NRDPP</p>
            <p className="text-green-400 text-xs leading-tight hidden sm:block">National RFQ Digital Procurement Platform</p>
          </div>
        </Link>
        <Link
          href="/login"
          className="bg-yellow-400 text-green-900 px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-yellow-300 transition-colors"
        >
          Sign In
        </Link>
      </div>

      {/* Tab strip */}
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 flex items-end gap-0 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {navLinks.map((item) => {
          const Icon = item.icon
          const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-all',
                active
                  ? 'border-yellow-400 text-yellow-400'
                  : 'border-transparent text-green-300 hover:text-white hover:border-green-500'
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
