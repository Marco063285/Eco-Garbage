import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
<<<<<<< HEAD
import { Plus, Search, Filter } from 'lucide-react'
import { useTranslation } from 'react-i18next'
=======
import { Plus, Search, Filter, Archive, ArchiveRestore } from 'lucide-react'
import toast from 'react-hot-toast'
>>>>>>> a2e4304 (......./.)
import { requestApi } from '../../services/api'
import { PageHeader, StatusBadge, PageLoader, EmptyState, Pagination } from '../../components/common'
import { format } from 'date-fns'
import { fr, enUS } from 'date-fns/locale'
import getCategoryIcon from '../../utils/categoryIcons'

export default function MyRequests() {
  const { t, i18n } = useTranslation()
  const dateLocale = i18n.language?.startsWith('en') ? enUS : fr

  const STATUS_OPTIONS = [
    { value: '', label: t('user.requests.filterAll') },
    { value: 'pending',     label: t('status.pending') },
    { value: 'assigned',    label: t('status.assigned') },
    { value: 'on_way',      label: t('status.on_way') },
    { value: 'in_progress', label: t('status.in_progress') },
    { value: 'completed',   label: t('status.completed') },
    { value: 'cancelled',   label: t('status.cancelled') },
  ]

  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [archiving, setArchiving] = useState(null)
  const LIMIT = 10

  const fetchRequests = async (status = '', p = 1) => {
    setLoading(true)
    try {
      const params = { limit: LIMIT, page: p }
      if (status) params.status = status
      const { data } = await requestApi.list(params)
      setRequests(data.data || [])
      setTotal(data.pagination?.total || 0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { setPage(1); fetchRequests(statusFilter, 1) }, [statusFilter])

  const handlePageChange = (p) => { setPage(p); fetchRequests(statusFilter, p) }

  const handleArchive = async (uuid, e) => {
    e.preventDefault() // Prevent navigation to detail page
    e.stopPropagation()
    setArchiving(uuid)
    try {
      await requestApi.archive(uuid)
      toast.success('Demande archivée avec succès')
      fetchRequests(statusFilter, page) // Refresh the list
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de l\'archivage')
    } finally {
      setArchiving(null)
    }
  }

  const filtered = requests.filter(r =>
    search === '' ||
    r.category_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.address?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="fade-up">
      <PageHeader
<<<<<<< HEAD
        title={t('user.requests.title')}
        subtitle={`${total} ${i18n.language?.startsWith('en') ? 'request(s)' : 'demande(s)'}`}
        action={<Link to="/dashboard/new-request" className="btn-primary"><Plus size={16} />{t('user.requests.newRequest')}</Link>}
=======
        title="Mes demandes"
        subtitle={`${total} demande(s) au total`}
        action={
          <div className="flex gap-3">
            <Link to="/dashboard/archived" className="btn-ghost">
              <ArchiveRestore size={16} /> Archives
            </Link>
            <Link to="/dashboard/new-request" className="btn-primary">
              <Plus size={16} />Nouvelle collecte
            </Link>
          </div>
        }
>>>>>>> a2e4304 (......./.)
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-10" placeholder={`${t('common.search')}...`} value={search} onChange={e => setSearch(e.target.value)} />
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
        <EmptyState
          title={t('user.requests.noRequests')}
          description={t('user.requests.noRequestsDesc')}
          action={<Link to="/dashboard/new-request" className="btn-primary"><Plus size={16} />{t('user.requests.newRequest')}</Link>}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(r => (
<<<<<<< HEAD
            <Link key={r.uuid} to={`/dashboard/requests/${r.uuid}`}
              className="card p-4 flex items-center gap-4 hover:border-[#1A8A3C]/30 hover:-translate-y-0.5 transition-all">
              <div className="w-12 h-12 bg-[#E8F5EE] rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                {getCategoryIcon(r.category_icon)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <p className="font-semibold text-gray-800">{r.category_name}</p>
                  <StatusBadge status={r.status} />
                </div>
                <p className="text-sm text-gray-400 mt-1 truncate">{r.address}</p>
                <p className="text-xs text-gray-300 mt-0.5">
                  {format(new Date(r.created_at), "dd MMM yyyy · HH:mm", { locale: dateLocale })}
                  {r.collector_name && ` · ${r.collector_name}`}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                {r.estimated_price && (
                  <p className="text-sm font-semibold text-[#1A8A3C]">
                    {parseFloat(r.estimated_price).toLocaleString()} FCFA
                  </p>
                )}
                <p className="text-xs text-gray-300 mt-0.5 uppercase tracking-wide">{r.service_type}</p>
              </div>
            </Link>
=======
            <div key={r.uuid} className="card p-4 flex items-center gap-4 hover:border-[#1A8A3C]/30 hover:-translate-y-0.5 transition-all">
              <Link to={`/dashboard/requests/${r.uuid}`} className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-12 h-12 bg-[#E8F5EE] rounded-xl flex items-center justify-center text-xl flex-shrink-0">{getCategoryIcon(r.category_icon)}</div>
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
              {['completed', 'cancelled', 'failed'].includes(r.status) && (
                <button
                  onClick={(e) => handleArchive(r.uuid, e)}
                  disabled={archiving === r.uuid}
                  className="btn-outline p-2 ml-2 flex-shrink-0"
                  title="Archiver cette demande"
                >
                  <Archive size={16} />
                </button>
              )}
            </div>
>>>>>>> a2e4304 (......./.)
          ))}
        </div>
      )}
      <Pagination page={page} total={total} limit={LIMIT} onChange={handlePageChange} />
    </div>
  )
}
