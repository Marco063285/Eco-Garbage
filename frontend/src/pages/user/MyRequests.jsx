import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Filter } from 'lucide-react'
import { requestApi } from '../../services/api'
import { PageHeader, StatusBadge, PageLoader, EmptyState } from '../../components/common'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const STATUS_OPTIONS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'pending', label: 'En attente' },
  { value: 'assigned', label: 'Assignée' },
  { value: 'on_way', label: 'En route' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'completed', label: 'Complétée' },
  { value: 'cancelled', label: 'Annulée' },
]

export default function MyRequests() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')

  const fetchRequests = async (status = '') => {
    setLoading(true)
    try {
      const params = { limit: 50 }
      if (status) params.status = status
      const { data } = await requestApi.list(params)
      setRequests(data.data || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchRequests(statusFilter) }, [statusFilter])

  const filtered = requests.filter(r =>
    search === '' || r.category_name?.toLowerCase().includes(search.toLowerCase()) || r.address?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="fade-up">
      <PageHeader
        title="Mes demandes"
        subtitle={`${requests.length} demande(s) au total`}
        action={<Link to="/dashboard/new-request" className="btn-primary"><Plus size={16} />Nouvelle collecte</Link>}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-10" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-400" />
          <select className="input w-auto" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <PageLoader />
      ) : filtered.length === 0 ? (
        <EmptyState title="Aucune demande trouvée" description="Créez votre première demande de collecte."
          action={<Link to="/dashboard/new-request" className="btn-primary"><Plus size={16} />Nouvelle collecte</Link>} />
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(r => (
            <Link key={r.uuid} to={`/dashboard/requests/${r.uuid}`}
              className="card p-4 flex items-center gap-4 hover:border-[#1A8A3C]/30 hover:-translate-y-0.5 transition-all">
              <div className="w-12 h-12 bg-[#E8F5EE] rounded-xl flex items-center justify-center text-xl flex-shrink-0">🗑️</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <p className="font-semibold text-gray-800">{r.category_name}</p>
                  <StatusBadge status={r.status} />
                </div>
                <p className="text-sm text-gray-400 mt-1 truncate">{r.address}</p>
                <p className="text-xs text-gray-300 mt-0.5">
                  {format(new Date(r.created_at), "dd MMM yyyy 'à' HH:mm", { locale: fr })}
                  {r.collector_name && ` · Collecteur: ${r.collector_name}`}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                {r.estimated_price && <p className="text-sm font-semibold text-[#1A8A3C]">{parseFloat(r.estimated_price).toLocaleString()} FCFA</p>}
                <p className="text-xs text-gray-300 mt-0.5 uppercase tracking-wide text-right">{r.service_type}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
