'use client'
import { useEffect, useState } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { api } from '@/lib/api'
import { formatDateTime } from '@/lib/utils'
import { Bell, CheckCheck } from 'lucide-react'

interface Notification {
  id: string; type: string; title: string; body: string
  read: boolean; createdAt: string
}

const TYPE_ICONS: Record<string, string> = {
  RFQ_PUBLISHED: '📋', RFQ_CLOSED: '🔒', RFQ_AWARDED: '🏆',
  QUOTATION_RECEIVED: '📥', EVALUATION_COMPLETE: '📊',
  DEADLINE_REMINDER: '⏰', COMPLIANCE_ALERT: '⚠️', SYSTEM: 'ℹ️',
}

export default function BuyerNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    api.get<{ notifications: Notification[] }>('/api/notifications')
      .then((r) => setNotifications(r.notifications))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const markRead = async (id: string) => {
    await api.patch(`/api/notifications/${id}/read`, {})
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.read)
    await Promise.all(unread.map(n => api.patch(`/api/notifications/${n.id}/read`, {})))
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div>
      <TopBar title="Notifications" />
      <div className="p-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-500">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="flex items-center gap-1.5 text-sm text-green-700 hover:text-green-800 font-medium">
              <CheckCheck size={15} /> Mark all read
            </button>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading...</div>
          ) : notifications.length === 0 ? (
            <div className="p-12 text-center">
              <Bell size={48} className="text-gray-200 mx-auto mb-4" />
              <p className="text-gray-500">No notifications yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-4 flex items-start gap-3 cursor-pointer hover:bg-gray-50 transition-colors ${!n.read ? 'bg-green-50/40' : ''}`}
                  onClick={() => !n.read && markRead(n.id)}
                >
                  <div className="text-xl shrink-0 mt-0.5">{TYPE_ICONS[n.type] || '🔔'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-medium ${!n.read ? 'text-gray-900' : 'text-gray-700'}`}>{n.title}</p>
                      <span className="text-xs text-gray-400 shrink-0 mt-0.5">{formatDateTime(n.createdAt)}</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{n.body}</p>
                  </div>
                  {!n.read && <div className="w-2 h-2 rounded-full bg-green-500 shrink-0 mt-2" />}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
