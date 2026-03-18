import Link from 'next/link'
import { ArrowRight, Shield, BarChart3, Bell, FileText, Users, Clock } from 'lucide-react'
import { PublicNav } from '@/components/layout/PublicNav'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-700">
      <PublicNav />

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="inline-flex items-center gap-2 bg-green-800 border border-green-600 rounded-full px-4 py-1.5 text-green-200 text-sm mb-6">
          <Shield size={14} /> Trusted Digital Procurement
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
          Digital RFQ<br />
          <span className="text-yellow-400">Procurement Platform</span>
        </h1>
        <p className="text-green-200 text-lg max-w-2xl mx-auto mb-10">
          A secure, transparent digital marketplace connecting organisations across all sectors with verified suppliers — streamlining procurement from request to award.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/register?role=BUYER" className="bg-yellow-400 text-green-900 px-8 py-3 rounded-lg font-semibold hover:bg-yellow-300 transition-colors flex items-center justify-center gap-2">
            I'm a Buyer <ArrowRight size={18} />
          </Link>
          <Link href="/register?role=SUPPLIER" className="bg-white/10 text-white border border-white/20 px-8 py-3 rounded-lg font-semibold hover:bg-white/20 transition-colors flex items-center justify-center gap-2">
            I'm a Supplier <ArrowRight size={18} />
          </Link>
        </div>
        <div className="mt-6">
          <Link href="/rfqs" className="text-green-300 hover:text-white text-sm underline underline-offset-4 transition-colors">
            Browse Open RFQs (Public)
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: FileText, title: 'Structured RFQ Creation', desc: 'Multi-item RFQ wizard with budget thresholds, line items, and evaluation criteria.' },
            { icon: Users, title: 'Smart Supplier Matching', desc: 'AI-driven matching engine maps RFQs to eligible, verified suppliers automatically.' },
            { icon: Clock, title: 'Real-time Countdown', desc: 'Live marketplace with submission deadlines, status indicators, and locked submissions.' },
            { icon: Shield, title: 'Compliance Engine', desc: 'Automated document expiry tracking, risk scoring, and debarment management.' },
            { icon: BarChart3, title: 'Evaluation & Award', desc: 'Structured scoring matrix (price/technical/delivery) with full committee workflows.' },
            { icon: Bell, title: 'Full Audit Trail', desc: 'Immutable lifecycle logs covering every RFQ event for accountability and transparency.' },
          ].map((f) => (
            <div key={f.title} className="bg-white/10 border border-white/10 rounded-xl p-6 backdrop-blur">
              <f.icon className="text-yellow-400 mb-4" size={28} />
              <h3 className="text-white font-semibold mb-2">{f.title}</h3>
              <p className="text-green-200 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="border-t border-green-700 bg-green-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {[
            { label: 'Registered Suppliers', value: '1,200+' },
            { label: 'Active RFQs', value: '340+' },
            { label: 'Buying Organisations', value: '180+' },
            { label: 'Awards Processed', value: '₵2.4B+' },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-3xl font-bold text-yellow-400">{s.value}</div>
              <div className="text-green-300 text-sm mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <footer className="text-center py-8 text-green-400 text-sm">
        © {new Date().getFullYear()} NRDPP – National RFQ Digital Procurement Platform
      </footer>
    </div>
  )
}
