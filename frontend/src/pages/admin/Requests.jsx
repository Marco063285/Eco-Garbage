import { useState, useEffect } from 'react'
import { Search, UserPlus } from 'lucide-react'
import toast from 'react-hot-toast'
import { adminApi, requestApi } from '../../services/api'
import { PageHeader, StatusBadge, PageLoader, EmptyState, Modal } from '../../components/common'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function AdminRequests() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [collectors, setCollectors] = useState([])
  const [assignModal, setAssignModal] = useState(null)
  const [selectedCollector, setSelectedCollector] = useState('')

  const fetch = async () => {
    setLoading(true)
    try {
      const params = { limit: 50 }
      if (statusFilter) params.status = statusFilter
      const { data } = await adminApi.requests(params)
      setRequests(data.data || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetch() }, [statusFilter])

  useEffect(() => {
    adminApi.users({ role: 'collector', limit: 100 }).then(r => setCollectors(r.data.data || []))
  }, [])

  const handleAssign = async () => {
    if (!selectedCollector) return toast.error('Sélectionnez un collecteur')
    try {
      await requestApi.assign(assignModal.uuid, { collector_id: parseInt(selectedCollector) })
      toast.success('Collecteur assigné !')
      setAssignModal(null)
      fetch()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur')
    }
  }

  const filtered = requests.filter(r =>
    !search || r.user_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.category_name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="fade-up">
      <PageHeader title="Toutes les collectes" subtitle={`${requests.length} demande(s)`} />

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-10" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-auto" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">Tous les statuts</option>
          {['pending','approved','assigned','on_way','in_progress','completed','cancelled','failed'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {loading ? <PageLoader /> : filtered.length === 0 ? (
        <EmptyState title="Aucune collecte" description="Aucune demande ne correspond." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50/50">
                <tr>
                  {['Client', 'Catégorie', 'Adresse', 'Statut', 'Prix', 'Date', 'Collecteur', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(r => (
                  <tr key={r.uuid} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{r.user_name}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.category_name}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-[180px] truncate">{r.address}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3 text-[#1A8A3C] font-semibold whitespace-nowrap">
                      {r.estimated_price ? `${parseFloat(r.estimated_price).toLocaleString()} FCFA` : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                      {format(new Date(r.created_at), 'dd MMM', { locale: fr })}
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{r.collector_name || '—'}</td>
                    <td className="px-4 py-3">
                      {['pending','approved'].includes(r.status) && (
                        <button onClick={() => setAssignModal(r)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#E8F5EE] text-[#1A8A3C] rounded-lg text-xs font-semibold hover:bg-[#C8EDDA] transition-all">
                          <UserPlus size={13} /> Assigner
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

      <Modal isOpen={!!assignModal} onClose={() => setAssignModal(null)} title="Assigner un collecteur">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-500">Demande de : <strong>{assignModal?.user_name}</strong> — {assignModal?.category_name}</p>
          <div>
            <label className="label">Collecteur</label>
            <select className="input" value={selectedCollector} onChange={e => setSelectedCollector(e.target.value)}>
              <option value="">Sélectionnez un collecteur...</option>
              {collectors.map(c => <option key={c.id} value={c.id}>{c.name} ({c.email})</option>)}
            </select>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setAssignModal(null)} className="btn-ghost flex-1 justify-center border border-gray-200">Annuler</button>
            <button onClick={handleAssign} className="btn-primary flex-1 justify-center">Confirmer</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
