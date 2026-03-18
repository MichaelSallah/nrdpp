const fs = require('fs')
const path = require('path')

const content = `'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Shield, BarChart3, Bell, FileText, Users, Clock, CheckCircle2, Monitor, Truck, Building2, FlaskConical, Package } from 'lucide-react'
import { PublicNav } from '@/components/layout/PublicNav'
import { api } from '@/lib/api'
import { timeUntilDeadline, formatCurrency } from '@/lib/utils'

interface PlatformStats { users: number; quotations: number; awards: number; suppliers: Array<{ status: string; _count: { _all: number } }> }
interface Rfq { id: string; referenceNo: string; title: string; submissionDeadline: string; budget: number | null; currency: string; category: { name: string }; entity: { name: string } }

const categories = [
  { label: 'ICT & Technology', icon: Monitor, code: 'ICT', color: 'bg-blue-50 text-blue-700 border-blue-100' },
  { label: 'Construction & Works', icon: Building2, code: 'CONST', color: 'bg-orange-50 text-orange-700 border-orange-100' },
  { label: 'Office Supplies', icon: Package, code: 'OFFICE', color: 'bg-purple-50 text-purple-700 border-purple-100' },
  { label: 'Logistics & Transport', icon: Truck, code: 'LOG', color: 'bg-green-50 text-green-700 border-green-100' },
  { label: 'Medical & Pharma', icon: FlaskConical, code: 'MED', color: 'bg-red-50 text-red-700 border-red-100' },
  { label: 'All Categories', icon: FileText, code: '', color: 'bg-gray-50 text-gray-700 border-gray-100' },
]

const steps = [
  { step: '01', title: 'Register & Get Verified', desc: 'Create your account as a Buyer or Supplier. Suppliers upload compliance documents for verification before participating.' },
  { step: '02', title: 'Post or Browse RFQs', desc: 'Buyers publish structured RFQs. Suppliers receive instant alerts for matching opportunities in their categories.' },
  { step: '03', title: 'Submit & Evaluate Quotes', desc: 'Suppliers submit structured quotations before the deadline. Buyers evaluate using a scoring matrix and award transparently.' },
]

export default function HomePage() {
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [urgentRfqs, setUrgentRfqs] = useState<Rfq[]>([])

  useEffect(() => {
    api.get<PlatformStats>('/api/admin/stats').then(setStats).catch(() => {})
    api.get<{ rfqs: Rfq[] }>('/api/rfqs?status=OPEN&limit=3').then((r) => setUrgentRfqs(r.rfqs)).catch(() => {})
  }, [])

  const activeSuppliers = stats?.suppliers?.find(s => s.status === 'ACTIVE')?._count?._all ?? 0

  return (
    <div className="min-h-screen bg-white">
      <PublicNav />

      {/* Hero */}
      <section className="bg-gradient-to-br from-green-900 via-green-800 to-green-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <div className="inline-flex items-center gap-2 bg-green-800 border border-green-600 rounded-full px-4 py-1.5 text-green-200 text-sm mb-6">
            <Shield size={14} /> {"Ghana's National Digital Procurement Platform"}
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            Transparent, Fast &amp;<br />
            <span className="text-yellow-400">Compliant Procurement</span>
          </h1>
          <p className="text-green-200 text-lg max-w-2xl mx-auto mb-10">
            NRDPP connects verified suppliers with public and private sector buyers across Ghana — from RFQ to award in one secure, auditable platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register?role=BUYER" className="bg-yellow-400 text-green-900 px-8 py-3 rounded-lg font-semibold hover:bg-yellow-300 transition-colors flex items-center justify-center gap-2">
              Post an RFQ <ArrowRight size={18} />
            </Link>
            <Link href="/register?role=SUPPLIER" className="bg-white/10 text-white border border-white/20 px-8 py-3 rounded-lg font-semibold hover:bg-white/20 transition-colors flex items-center justify-center gap-2">
              Register as Supplier <ArrowRight size={18} />
            </Link>
          </div>
          <div className="mt-6">
            <Link href="/rfqs" className="text-green-300 hover:text-white text-sm underline underline-offset-4 transition-colors">
              Browse Open RFQs — No Account Needed
            </Link>
          </div>
        </div>
        <div className="border-t border-green-700 bg-green-900/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {[
              { label: 'Verified Suppliers', value: activeSuppliers > 0 ? activeSuppliers + '+' : '1,200+' },
              { label: 'Total Users', value: stats ? stats.users + '+' : '2,400+' },
              { label: 'Quotations Submitted', value: stats ? stats.quotations + '+' : '8,000+' },
              { label: 'Awards Processed', value: stats ? stats.awards + '+' : '340+' },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-3xl font-bold text-yellow-400">{s.value}</div>
                <div className="text-green-300 text-sm mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Category quick-links */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Browse by Category</h2>
          <p className="text-gray-500 text-sm mt-2">Jump directly to open RFQs in your sector</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((cat) => {
            const Icon = cat.icon
            return (
              <Link key={cat.code} href={cat.code ? '/rfqs?category=' + cat.code : '/rfqs'}
                className={\`flex flex-col items-center gap-3 p-5 rounded-xl border \${cat.color} hover:shadow-md transition-all text-center group\`}>
                <Icon size={28} className="group-hover:scale-110 transition-transform" />
                <span className="text-xs font-semibold leading-snug">{cat.label}</span>
              </Link>
            )
          })}
        </div>
      </section>

      {/* Featured open RFQs */}
      {urgentRfqs.length > 0 && (
        <section className="bg-gray-50 border-y border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Open RFQs</h2>
                <p className="text-gray-500 text-sm mt-1">Currently accepting quotations</p>
              </div>
              <Link href="/rfqs" className="flex items-center gap-1.5 text-green-700 font-medium text-sm hover:underline">
                View all <ArrowRight size={14} />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {urgentRfqs.map((rfq) => {
                const hoursLeft = (new Date(rfq.submissionDeadline).getTime() - Date.now()) / 3600000
                const closing = hoursLeft < 48
                return (
                  <div key={rfq.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <span className="text-xs font-mono text-gray-400">{rfq.referenceNo}</span>
                      {closing && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold shrink-0">Closing Soon</span>}
                    </div>
                    <h3 className="font-semibold text-gray-900 text-sm mb-2 line-clamp-2">{rfq.title}</h3>
                    <p className="text-xs text-gray-500 mb-3">{rfq.entity.name}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-orange-600 font-medium">
                        <Clock size={12} />{timeUntilDeadline(rfq.submissionDeadline)}
                      </div>
                      {rfq.budget && <span className="text-xs text-gray-500">{formatCurrency(rfq.budget)}</span>}
                    </div>
                    <Link href="/login" className="mt-4 block w-full bg-green-700 text-white text-xs font-semibold py-2 rounded-lg text-center hover:bg-green-800 transition-colors">
                      View &amp; Quote
                    </Link>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-gray-900">How NRDPP Works</h2>
          <p className="text-gray-500 text-sm mt-2">From registration to award in three simple steps</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {steps.map((s) => (
            <div key={s.step} className="text-center">
              <div className="w-14 h-14 bg-green-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-lg">{s.step}</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{s.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Platform features */}
      <section className="bg-green-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-white">{"Built for Ghana's Procurement Framework"}</h2>
            <p className="text-green-300 text-sm mt-2">Compliant with Public Procurement Authority guidelines</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: FileText, title: 'Structured RFQ Creation', desc: 'Multi-item RFQ wizard with budget thresholds, line items, and evaluation criteria.' },
              { icon: Users, title: 'Verified Supplier Network', desc: 'Suppliers undergo document verification, risk scoring, and compliance checks before participating.' },
              { icon: Clock, title: 'Real-time Countdown', desc: 'Live marketplace with submission deadlines, status indicators, and automatically locked submissions.' },
              { icon: Shield, title: 'Compliance Engine', desc: 'Automated document expiry tracking, risk scoring, and debarment management for suppliers.' },
              { icon: BarChart3, title: 'Evaluation & Award', desc: 'Structured scoring matrix (price/technical/delivery) with full committee workflows.' },
              { icon: Bell, title: 'Immutable Audit Trail', desc: 'Full lifecycle logs covering every RFQ event for complete accountability and transparency.' },
            ].map((f) => (
              <div key={f.title} className="bg-white/10 border border-white/10 rounded-xl p-6 backdrop-blur">
                <f.icon className="text-yellow-400 mb-4" size={28} />
                <h3 className="text-white font-semibold mb-2">{f.title}</h3>
                <p className="text-green-200 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-yellow-400">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-14 text-center">
          <h2 className="text-2xl font-bold text-green-900 mb-3">Ready to get started?</h2>
          <p className="text-green-800 text-sm mb-8">Join thousands of organisations and suppliers already using NRDPP.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register?role=BUYER" className="bg-green-900 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-800 transition-colors flex items-center justify-center gap-2">
              Register as Buyer <ArrowRight size={18} />
            </Link>
            <Link href="/register?role=SUPPLIER" className="bg-white text-green-900 px-8 py-3 rounded-lg font-semibold hover:bg-green-50 transition-colors flex items-center justify-center gap-2">
              Register as Supplier <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-8">
            <div className="col-span-2 sm:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-green-900 font-bold text-xs">GH</div>
                <span className="text-white font-bold text-sm">NRDPP</span>
              </div>
              <p className="text-xs leading-relaxed">National RFQ Digital Procurement Platform — Ghana</p>
            </div>
            <div>
              <p className="text-white text-xs font-semibold mb-3 uppercase tracking-wide">Platform</p>
              <div className="space-y-2 text-xs">
                <Link href="/rfqs" className="block hover:text-white transition-colors">Browse RFQs</Link>
                <Link href="/register?role=SUPPLIER" className="block hover:text-white transition-colors">Supplier Registration</Link>
                <Link href="/register?role=BUYER" className="block hover:text-white transition-colors">Buyer Registration</Link>
              </div>
            </div>
            <div>
              <p className="text-white text-xs font-semibold mb-3 uppercase tracking-wide">Portals</p>
              <div className="space-y-2 text-xs">
                <Link href="/login" className="block hover:text-white transition-colors">Buyer Login</Link>
                <Link href="/login" className="block hover:text-white transition-colors">Supplier Login</Link>
              </div>
            </div>
            <div>
              <p className="text-white text-xs font-semibold mb-3 uppercase tracking-wide">Compliance</p>
              <div className="space-y-2 text-xs">
                <span className="flex items-center gap-1.5"><CheckCircle2 size={11} className="text-green-400" /> PPA Act Compliant</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 size={11} className="text-green-400" /> Audit Trails Enabled</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 size={11} className="text-green-400" /> Supplier Verification</span>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-6 text-center text-xs">
            © {new Date().getFullYear()} NRDPP — National RFQ Digital Procurement Platform v1.0
          </div>
        </div>
      </footer>
    </div>
  )
}
`

fs.writeFileSync(path.join('C:\\', 'Users', 'MICHAELSALLAH', 'nrdpp', 'apps', 'web', 'src', 'app', 'page.tsx'), content, 'utf8')
console.log('Home page written successfully, lines:', content.split('\n').length)
