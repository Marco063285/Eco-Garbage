import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Truck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { collectorApi } from '../../services/api'
import { PageHeader, StatusBadge, PageLoader, EmptyState, Pagination } from '../../components/common'
import { format } from 'date-fns'
import { fr, enUS } from 'date-fns/locale'
import getCategoryIcon from '../../utils/categoryIcons'

export default function CollectorTasks() {
  const { t, i18n } = useTranslation()
  const dateLocale = i18n.language?.startsWith('en') ? enUS : fr
  const isEn = i18n.language?.startsWith('en')
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const LIMIT = 10

  const FILTERS = [
    { value: '',            label: isEn ? 'All'         : 'Toutes' },
    { value: 'assigned',    label: t('status.assigned') },
    { value: 'on_way',      label: t('status.on_way') },
    { value: 'in_progress', label: t('status.in_progress') },
    { value: 'completed',   label: t('status.completed') },
  ]

  const loadData = (status = '', p = 1) => {
    setLoading(true)
    const params = { limit: LIMIT, page: p }
    if (status) params.status = status
    collectorApi.tasks(params)
      .then(r => {
        setTasks(r.data.data || [])
        setTotal(r.data.pagination?.total || 0)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { setPage(1); loadData(filter, 1) }, [filter])

  return (
    <div className="fade-up">
      <PageHeader title={t('collector.tasks.title')} subtitle={`${total} ${isEn ? 'task(s)' : 'tâche(s)'}`} />

      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {FILTERS.map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
              filter === f.value
                ? 'bg-[#1A8A3C] text-white'
                : 'bg-white text-gray-500 border border-gray-200 hover:border-[#1A8A3C]'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? <PageLoader /> : tasks.length === 0 ? (
        <EmptyState icon={Truck} title={t('collector.tasks.noTasks')} description={t('collector.tasks.noTasksDesc')} />
      ) : (
        <div className="flex flex-col gap-3">
          {tasks.map(tk => (
            <Link key={tk.uuid} to={`/collector/tasks/${tk.uuid}`}
              className="card p-4 flex items-center gap-4 hover:border-[#1A8A3C]/30 hover:-translate-y-0.5 transition-all">
              <div className="w-12 h-12 bg-[#E8F5EE] rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                {getCategoryIcon(tk.category_icon)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-800">{tk.category_name}</p>
                  <StatusBadge status={tk.status} />
                </div>
                <p className="text-sm text-gray-400 mt-1 truncate">📍 {tk.address}</p>
                <p className="text-xs text-gray-300 mt-0.5">
                  👤 {tk.user_name}
                  {tk.user_phone && ` · 📞 ${tk.user_phone}`}
                  {' · '}{format(new Date(tk.created_at), 'dd MMM yyyy', { locale: dateLocale })}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                {tk.estimated_price && (
                  <p className="text-sm font-bold text-[#1A8A3C]">{parseFloat(tk.estimated_price).toLocaleString()} FCFA</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
      <Pagination page={page} total={total} limit={LIMIT} onChange={p => { setPage(p); loadData(filter, p) }} />
    </div>
  )
}
