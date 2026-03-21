'use client'
import { useEffect, useState } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { api } from '@/lib/api'
import { Users, UserPlus, Shield, Eye, EyeOff, Settings, ToggleLeft, ToggleRight, Trash2, Loader2, Check, X } from 'lucide-react'

const passwordRules = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'One uppercase letter (A-Z)', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter (a-z)', test: (p: string) => /[a-z]/.test(p) },
  { label: 'One number (0-9)', test: (p: string) => /[0-9]/.test(p) },
  { label: 'One special character (!@#$%^&*)', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
]

interface TeamMember {
  id: string
  email: string
  firstName: string
  lastName: string
  phone: string | null
  teamRole: 'OWNER' | 'MANAGER' | 'VIEWER'
  isActive: boolean
  createdAt: string
}

const ROLE_LABELS: Record<string, { label: string; color: string; icon: typeof Shield }> = {
  OWNER: { label: 'Owner', color: 'bg-green-100 text-green-800', icon: Shield },
  MANAGER: { label: 'Manager', color: 'bg-blue-100 text-blue-800', icon: Settings },
  VIEWER: { label: 'Viewer', color: 'bg-gray-100 text-gray-700', icon: Eye },
}

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [maxSize, setMaxSize] = useState(5)
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [isOwner, setIsOwner] = useState(false)

  // Invite form state
  const [invite, setInvite] = useState({ email: '', firstName: '', lastName: '', phone: '', password: '', teamRole: 'MANAGER' })
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [inviteSuccess, setInviteSuccess] = useState('')

  const fetchTeam = async () => {
    try {
      const res = await api.get<{ members: TeamMember[]; maxSize: number }>('/api/team')
      setMembers(res.members)
      setMaxSize(res.maxSize)
      // Check if current user is owner
      const token = localStorage.getItem('access_token')
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]))
          setIsOwner(res.members.some(m => m.id === payload.userId && m.teamRole === 'OWNER'))
        } catch { setIsOwner(false) }
      }
    } catch {
      setError('Failed to load team')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchTeam() }, [])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviteLoading(true)
    setInviteError('')
    setInviteSuccess('')
    try {
      await api.post('/api/team/invite', invite)
      setInviteSuccess(`${invite.firstName} ${invite.lastName} has been added to your team.`)
      setInvite({ email: '', firstName: '', lastName: '', phone: '', password: '', teamRole: 'MANAGER' })
      fetchTeam()
      setTimeout(() => { setShowInvite(false); setInviteSuccess('') }, 2000)
    } catch (err: unknown) {
      setInviteError(err instanceof Error ? err.message : 'Failed to invite member')
    } finally {
      setInviteLoading(false)
    }
  }

  const handleToggle = async (userId: string) => {
    setActionLoading(userId)
    try {
      await api.patch(`/api/team/${userId}/toggle`)
      fetchTeam()
    } catch { /* ignore */ }
    setActionLoading(null)
  }

  const handleRoleChange = async (userId: string, teamRole: string) => {
    setActionLoading(userId)
    try {
      await api.patch(`/api/team/${userId}/role`, { teamRole })
      fetchTeam()
    } catch { /* ignore */ }
    setActionLoading(null)
  }

  const handleRemove = async (userId: string, name: string) => {
    if (!confirm(`Remove ${name} from the team? This cannot be undone.`)) return
    setActionLoading(userId)
    try {
      await api.del(`/api/team/${userId}`)
      fetchTeam()
    } catch { /* ignore */ }
    setActionLoading(null)
  }

  if (loading) {
    return (
      <div>
        <TopBar title="Team Management" />
        <div className="p-6 flex justify-center"><Loader2 className="animate-spin text-blue-700" size={28} /></div>
      </div>
    )
  }

  return (
    <div>
      <TopBar title="Team Management" />
      <div className="p-6 max-w-3xl mx-auto">
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users size={20} className="text-blue-700" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Your Team</h2>
              <p className="text-sm text-gray-500">{members.length} of {maxSize} seats used</p>
            </div>
          </div>
          {isOwner && members.length < maxSize && (
            <button
              onClick={() => setShowInvite(!showInvite)}
              className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-semibold hover:bg-green-800 transition-colors"
            >
              <UserPlus size={16} /> Add Member
            </button>
          )}
        </div>

        {/* Seat bar */}
        <div className="mb-6">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-600 rounded-full transition-all"
              style={{ width: `${(members.length / maxSize) * 100}%` }}
            />
          </div>
        </div>

        {/* Invite Form */}
        {showInvite && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Add Team Member</h3>
            {inviteSuccess && <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">{inviteSuccess}</div>}
            {inviteError && <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{inviteError}</div>}
            <form onSubmit={handleInvite} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">First Name *</label>
                  <input
                    value={invite.firstName} onChange={e => setInvite(p => ({ ...p, firstName: e.target.value }))}
                    required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Last Name *</label>
                  <input
                    value={invite.lastName} onChange={e => setInvite(p => ({ ...p, lastName: e.target.value }))}
                    required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
                <input
                  type="email" value={invite.email} onChange={e => setInvite(p => ({ ...p, email: e.target.value }))}
                  required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Password *</label>
                  <input
                    type="password" value={invite.password} onChange={e => setInvite(p => ({ ...p, password: e.target.value }))}
                    required minLength={8} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Create a strong password"
                  />
                  {invite.password.length > 0 && (
                    <div className="mt-1.5 space-y-0.5">
                      {passwordRules.map(rule => {
                        const passed = rule.test(invite.password)
                        return (
                          <div key={rule.label} className="flex items-center gap-1.5">
                            {passed ? <Check size={11} className="text-green-600 flex-shrink-0" /> : <X size={11} className="text-gray-300 flex-shrink-0" />}
                            <span className={`text-xs ${passed ? 'text-green-700' : 'text-gray-400'}`}>{rule.label}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Role *</label>
                  <select
                    value={invite.teamRole} onChange={e => setInvite(p => ({ ...p, teamRole: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="MANAGER">Manager — can create & submit</option>
                    <option value="VIEWER">Viewer — read-only access</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                <input
                  value={invite.phone} onChange={e => setInvite(p => ({ ...p, phone: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={inviteLoading}
                  className="px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-semibold hover:bg-green-800 disabled:opacity-60 transition-colors"
                >
                  {inviteLoading ? 'Adding...' : 'Add to Team'}
                </button>
                <button type="button" onClick={() => setShowInvite(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Members List */}
        <div className="space-y-3">
          {members.map(member => {
            const roleInfo = ROLE_LABELS[member.teamRole]
            const isCurrentOwner = member.teamRole === 'OWNER'
            return (
              <div key={member.id} className={`bg-white border rounded-xl p-4 flex items-center justify-between ${!member.isActive ? 'opacity-60' : ''} ${isCurrentOwner ? 'border-blue-200' : 'border-gray-200'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${isCurrentOwner ? 'bg-blue-700 text-white' : 'bg-gray-200 text-gray-600'}`}>
                    {member.firstName[0]}{member.lastName[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900">{member.firstName} {member.lastName}</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleInfo.color}`}>{roleInfo.label}</span>
                      {!member.isActive && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Disabled</span>}
                    </div>
                    <p className="text-xs text-gray-500">{member.email}</p>
                  </div>
                </div>

                {/* Actions — only for owner, not on themselves */}
                {isOwner && !isCurrentOwner && (
                  <div className="flex items-center gap-2">
                    {/* Role toggle */}
                    <select
                      value={member.teamRole}
                      onChange={e => handleRoleChange(member.id, e.target.value)}
                      disabled={actionLoading === member.id}
                      className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="MANAGER">Manager</option>
                      <option value="VIEWER">Viewer</option>
                    </select>

                    {/* Enable/Disable */}
                    <button
                      onClick={() => handleToggle(member.id)}
                      disabled={actionLoading === member.id}
                      title={member.isActive ? 'Disable member' : 'Enable member'}
                      className={`p-1.5 rounded-lg transition-colors ${member.isActive ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
                    >
                      {member.isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                    </button>

                    {/* Remove */}
                    <button
                      onClick={() => handleRemove(member.id, `${member.firstName} ${member.lastName}`)}
                      disabled={actionLoading === member.id}
                      title="Remove member"
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Permissions Guide */}
        <div className="mt-8 bg-gray-50 rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-3">Role Permissions</h3>
          <div className="grid grid-cols-4 gap-2 text-xs">
            <div className="font-medium text-gray-500">Permission</div>
            <div className="font-medium text-center text-green-700">Owner</div>
            <div className="font-medium text-center text-blue-700">Manager</div>
            <div className="font-medium text-center text-gray-600">Viewer</div>

            <div className="text-gray-700">View RFQs & Quotations</div>
            <div className="text-center text-green-600">Yes</div>
            <div className="text-center text-green-600">Yes</div>
            <div className="text-center text-green-600">Yes</div>

            <div className="text-gray-700">Create & Submit</div>
            <div className="text-center text-green-600">Yes</div>
            <div className="text-center text-green-600">Yes</div>
            <div className="text-center text-red-500">No</div>

            <div className="text-gray-700">Manage Profile</div>
            <div className="text-center text-green-600">Yes</div>
            <div className="text-center text-red-500">No</div>
            <div className="text-center text-red-500">No</div>

            <div className="text-gray-700">Manage Team</div>
            <div className="text-center text-green-600">Yes</div>
            <div className="text-center text-red-500">No</div>
            <div className="text-center text-red-500">No</div>
          </div>
        </div>
      </div>
    </div>
  )
}
