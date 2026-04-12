import { useState, useEffect } from 'react'
import { Search, UserCheck, UserX, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { adminApi } from '../../services/api'
import { PageHeader, PageLoader, EmptyState, ConfirmDialog } from '../../components/common'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const ROLE_LABELS = { user: 'Utilisateur', collector: 'Collecteur', admin: 'Admin' }
const ROLE_COLORS = { user: 'bg-blue-100 text-blue-700', collector: 'bg-green-100 text-green-700', admin: 'bg-purple-100 text-purple-700' }

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [confirmDialog, setConfirmDialog] = useState(null) // { userId, is_active, name }

  const fetchUsers = async (params = {}) => {
    setLoading(true)
    try {
      const { data } = await adminApi.users({ ...params, limit: 50 })
      setUsers(data.data || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchUsers({ role: roleFilter, search }) }, [roleFilter, search])

  const handleToggle = async () => {
    if (!confirmDialog) return
    try {
      await adminApi.toggleUser(confirmDialog.userId, { is_active: !confirmDialog.is_active })
      toast.success(confirmDialog.is_active ? 'Compte suspendu' : 'Compte activé')
      fetchUsers({ role: roleFilter, search })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur')
    }
  }

  return (
    <div className="fade-up">
      <PageHeader title="Utilisateurs" subtitle={`${users.length} utilisateur(s)`} />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-10" placeholder="Rechercher par nom ou email..." value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-auto" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="">Tous les rôles</option>
          <option value="user">Utilisateurs</option>
          <option value="collector">Collecteurs</option>
          <option value="admin">Admins</option>
        </select>
      </div>

      {loading ? <PageLoader /> : users.length === 0 ? (
        <EmptyState icon={Users} title="Aucun utilisateur" description="Aucun utilisateur ne correspond à votre recherche." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50/50">
                <tr>
                  {['Utilisateur', 'Rôle', 'Téléphone', 'Statut', 'Inscrit le', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#E8F5EE] rounded-lg flex items-center justify-center text-[#1A8A3C] font-bold text-xs flex-shrink-0">
                          {u.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">{u.name}</p>
                          <p className="text-xs text-gray-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${ROLE_COLORS[u.role]}`}>{ROLE_LABELS[u.role]}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{u.phone || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {u.is_active ? '✓ Actif' : '✗ Suspendu'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                      {format(new Date(u.created_at), 'dd MMM yyyy', { locale: fr })}
                    </td>
                    <td className="px-4 py-3">
                      {u.role !== 'admin' && (
                        <button
                          onClick={() => setConfirmDialog({ userId: u.id, is_active: u.is_active, name: u.name })}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            u.is_active
                              ? 'bg-red-50 text-red-500 hover:bg-red-100'
                              : 'bg-green-50 text-green-600 hover:bg-green-100'
                          }`}>
                          {u.is_active ? <><UserX size={13} />Suspendre</> : <><UserCheck size={13} />Activer</>}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!confirmDialog}
        onClose={() => setConfirmDialog(null)}
        onConfirm={handleToggle}
        title={confirmDialog?.is_active ? 'Suspendre le compte' : 'Activer le compte'}
        message={`Êtes-vous sûr de vouloir ${confirmDialog?.is_active ? 'suspendre' : 'activer'} le compte de ${confirmDialog?.name} ?`}
        confirmLabel={confirmDialog?.is_active ? 'Suspendre' : 'Activer'}
        danger={confirmDialog?.is_active}
      />
    </div>
  )
}
