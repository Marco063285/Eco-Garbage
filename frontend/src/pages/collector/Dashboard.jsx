import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Truck, CheckCircle, Star, ToggleLeft, ToggleRight, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { collectorApi } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { StatCard, StatusBadge, PageLoader, EmptyState } from '../../components/common'
import { format } from 'date-fns'
import getCategoryIcon from '../../utils/categoryIcons'
import { fr } from 'date-fns/locale'

export default function CollectorDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [tasks, setTasks] = useState([])
  const [available, setAvailable] = useState(false)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)

  useEffect(() => {
    Promise.all([
      collectorApi.stats(),
      collectorApi.tasks({ limit: 5 }),
    ]).then(([s, t]) => {
      setStats(s.data.data)
      setTasks(t.data.data || [])
      setAvailable(s.data.data?.profile?.is_available || false)
    }).finally(() => setLoading(false))
  }, [])

  const toggleAvailability = async () => {
    setToggling(true)
    try {
      await collectorApi.setAvailability({ is_available: !available })
      setAvailable(!available)
      toast.success(!available ? 'Vous êtes maintenant disponible' : 'Vous êtes maintenant indisponible')
    } catch {
      toast.error('Erreur lors de la mise à jour')
    } finally {
      setToggling(false)
    }
  }

  if (loading) return <PageLoader />

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'C'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'

  return (
    <div className="fade-up">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-[#E8F5EE] rounded-2xl flex items-center justify-center text-[#1A8A3C] font-bold text-xl font-display">
            {initials}
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">{greeting}, {user?.name?.split(' ')[0]} 🚛</h1>
            <p className="text-sm text-gray-400 mt-0.5">Tableau de bord collecteur</p>
          </div>
        </div>
        {/* Availability toggle */}
        <button
          onClick={toggleAvailability}
          disabled={toggling}
          className={`flex items-center gap-3 px-5 py-3 rounded-xl font-semibold text-sm transition-all border-2 ${
            available
              ? 'bg-[#E8F5EE] border-[#1A8A3C] text-[#1A8A3C]'
              : 'bg-gray-50 border-gray-200 text-gray-500'
          }`}
        >
          {available
            ? <ToggleRight size={20} className="text-[#1A8A3C]" />
            : <ToggleLeft size={20} />}
          {available ? 'Disponible' : 'Indisponible'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Truck} label="Total collectes" value={stats?.completed ?? 0} color="green" />
        <StatCard icon={CheckCircle} label="Ce mois" value={tasks.filter(t => t.status === 'completed').length} color="blue" />
        <StatCard icon={Star} label="Note moyenne" value={stats?.profile?.rating_avg ? parseFloat(stats.profile.rating_avg).toFixed(1) : '—'} color="yellow" />
        <StatCard icon={Truck} label="Gains totaux" value={`${(stats?.earnings || 0).toLocaleString()} FCFA`} color="purple" />
      </div>

      {/* Status banner */}
      <div className={`rounded-2xl p-4 mb-6 flex items-center gap-3 ${available ? 'bg-[#E8F5EE] border border-[#C8EDDA]' : 'bg-gray-100 border border-gray-200'}`}>
        <div className={`w-3 h-3 rounded-full ${available ? 'bg-[#1A8A3C] animate-pulse' : 'bg-gray-400'}`} />
        <p className={`text-sm font-semibold ${available ? 'text-[#1A8A3C]' : 'text-gray-500'}`}>
          {available ? 'Vous êtes disponible pour recevoir des tâches' : 'Vous êtes indisponible — activez votre disponibilité pour recevoir des tâches'}
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Tasks */}
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-display font-bold">Tâches récentes</h2>
            <Link to="/collector/tasks" className="text-sm text-[#1A8A3C] font-semibold flex items-center gap-1 hover:underline">
              Voir tout <ArrowRight size={14} />
            </Link>
          </div>
          {tasks.length === 0 ? (
            <EmptyState icon={Truck} title="Aucune tâche" description="Les tâches qui vous sont assignées apparaîtront ici." />
          ) : (
            <div className="flex flex-col gap-3">
              {tasks.slice(0, 5).map(t => (
                <Link key={t.uuid} to={`/collector/tasks/${t.uuid}`}
                  className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 hover:bg-[#E8F5EE] transition-all group">
                  <div className="w-10 h-10 bg-[#E8F5EE] rounded-xl flex items-center justify-center text-lg flex-shrink-0 group-hover:bg-white">{getCategoryIcon(t.category_icon)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{t.category_name}</p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{t.address}</p>
                    <p className="text-xs text-gray-300 mt-0.5">
                      {t.user_name} · {format(new Date(t.created_at), 'dd MMM', { locale: fr })}
                    </p>
                  </div>
                  <StatusBadge status={t.status} />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Quick stats */}
        <div className="flex flex-col gap-5">
          <div className="card p-6">
            <h3 className="font-display font-bold mb-4">Performance</h3>
            <div className="flex flex-col gap-4">
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-gray-500">Taux de complétion</span>
                  <span className="font-semibold text-[#1A8A3C]">92%</span>
                </div>
                <div className="bg-gray-100 rounded-full h-2">
                  <div className="bg-[#1A8A3C] h-2 rounded-full" style={{ width: '92%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-gray-500">Satisfaction client</span>
                  <span className="font-semibold text-yellow-500">{stats?.profile?.rating_avg ? `${parseFloat(stats.profile.rating_avg).toFixed(1)}/5` : '—'}</span>
                </div>
                <div className="bg-gray-100 rounded-full h-2">
                  <div className="bg-yellow-400 h-2 rounded-full" style={{ width: `${((stats?.profile?.rating_avg || 0) / 5) * 100}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#1A8A3C] rounded-2xl p-5 text-white">
            <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-2">Gains ce mois</p>
            <p className="text-3xl font-display font-bold">{(stats?.earnings || 0).toLocaleString()}</p>
            <p className="text-white/60 text-sm mt-0.5">FCFA</p>
            <div className="mt-4 pt-4 border-t border-white/20">
              <p className="text-sm text-white/70">{stats?.completed || 0} collectes complétées</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
