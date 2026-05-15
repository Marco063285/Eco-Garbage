import { useState, useEffect } from 'react'
import { Users, Truck, CheckCircle, DollarSign, Clock, MessageSquare, ArrowRight, BarChart3 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { adminApi } from '../../services/api'
import { StatCard, StatusBadge, PageLoader } from '../../components/common'
import { format } from 'date-fns'
import { fr, enUS } from 'date-fns/locale'
import getCategoryIcon from '../../utils/categoryIcons'

export default function AdminDashboard() {
  const { t, i18n } = useTranslation()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const dateLocale = i18n.language?.startsWith('en') ? enUS : fr

  useEffect(() => {
    adminApi.dashboard()
      .then(r => setData(r.data.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <PageLoader />
  if (error || !data) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <p className="text-gray-500">{t('common.serverError')}</p>
      <button className="btn-primary" onClick={() => {
        setLoading(true); setError(false)
        adminApi.dashboard().then(r => setData(r.data.data)).catch(() => setError(true)).finally(() => setLoading(false))
      }}>
        {t('common.retry')}
      </button>
    </div>
  )

  const { stats, recentRequests, topCollectors } = data
  const ad = t('admin.dashboard', { returnObjects: true })

  const quickLinks = [
    { to: '/admin/users',      emoji: '??', label: ad.manageUsers },
    { to: '/admin/requests',   emoji: '??', label: ad.manageCollections },
    { to: '/admin/categories', emoji: '???', label: ad.wasteCategories },
    { to: '/admin/complaints', emoji: '??', label: ad.complaints },
    { to: '/admin/reports',    emoji: '??', label: ad.reportsAnalytics },
  ]

  return (
    <div className="fade-up">
      <div className="mb-8">
        <h1 className="text-2xl font-display font-bold">{ad.title} ???</h1>
        <p className="text-gray-400 text-sm mt-0.5">{ad.subtitle}</p>
      </div>

      {/* KPIs row 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard icon={Users}       label={ad.users}            value={stats.users}         color="green" />
        <StatCard icon={Truck}       label={ad.collectors}       value={stats.collectors}    color="blue" />
        <StatCard icon={CheckCircle} label={ad.totalCollections} value={stats.totalRequests} color="purple" />
        <StatCard icon={DollarSign}  label={ad.totalRevenue}     value={`${stats.revenue.toLocaleString()} FCFA`} color="yellow" />
      </div>

      {/* KPIs row 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard icon={CheckCircle} label={ad.completed}       value={stats.completedRequests} color="green" />
        <StatCard icon={Clock}       label={ad.pending}         value={stats.pendingRequests}   color="yellow" />
        <StatCard icon={DollarSign}  label={ad.collected}       value={`${(stats.paidRevenue || 0).toLocaleString()} FCFA`} color="green" />
        <StatCard icon={Clock}       label={ad.pendingPayment}  value={`${(stats.pendingRevenue || 0).toLocaleString()} FCFA`} color="yellow" />
      </div>

      {/* KPIs row 3 */}
      <div className="grid grid-cols-2 lg:grid-cols-2 gap-4 mb-8">
        <StatCard icon={MessageSquare} label={ad.openComplaints}  value={stats.openComplaints} color="red" />
        <StatCard icon={BarChart3}     label={ad.completionRate}  value={stats.totalRequests > 0 ? `${Math.round((stats.completedRequests / stats.totalRequests) * 100)}%` : '0%'} color="blue" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent requests */}
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-display font-bold">{ad.recentRequests}</h2>
            <Link to="/admin/requests" className="text-sm text-[#1A8A3C] font-semibold flex items-center gap-1 hover:underline">
              {t('common.seeAll')} <ArrowRight size={14} />
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            {recentRequests.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">{ad.noRequests}</p>
            ) : recentRequests.map(r => (
              <div key={r.uuid} className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 hover:bg-[#E8F5EE] transition-all">
                <div className="w-9 h-9 bg-[#E8F5EE] rounded-xl flex items-center justify-center text-base flex-shrink-0">
                  {getCategoryIcon(r.category_icon)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{r.user_name} — {r.category_name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {format(new Date(r.created_at), 'dd MMM yyyy HH:mm', { locale: dateLocale })}
                  </p>
                </div>
                <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
                  <StatusBadge status={r.status} />
                  {r.estimated_price && (
                    <span className="text-xs font-semibold text-[#1A8A3C]">
                      {parseFloat(r.estimated_price).toLocaleString()} FCFA
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top collectors + Quick nav */}
        <div className="flex flex-col gap-5">
          <div className="card p-6">
            <h3 className="font-display font-bold mb-4">{ad.topCollectors}</h3>
            {topCollectors.length === 0 ? (
              <p className="text-sm text-gray-400">{ad.noCollectors}</p>
            ) : (
              <div className="flex flex-col gap-3">
                {topCollectors.map((c, i) => (
                  <div key={c.name} className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-500'}`}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{c.name}</p>
                      <p className="text-xs text-gray-400">{c.total_collections} collectes</p>
                    </div>
                    {c.rating_avg > 0 && (
                      <span className="text-xs font-semibold text-yellow-500">? {parseFloat(c.rating_avg).toFixed(1)}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card p-6">
            <h3 className="font-display font-bold mb-4">{ad.quickNav}</h3>
            <div className="flex flex-col gap-2">
              {quickLinks.map(item => (
                <Link key={item.to} to={item.to}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-[#E8F5EE] hover:text-[#1A8A3C] transition-all">
                  <span>{item.emoji}</span>{item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
