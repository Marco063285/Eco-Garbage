import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Truck, CheckCircle, Clock, Star, Plus, ArrowRight } from 'lucide-react'
import { requestApi, paymentApi } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { StatCard, StatusBadge, PageLoader, EmptyState } from '../../components/common'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function UserDashboard() {
  const { user } = useAuth()
  const [requests, setRequests] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      requestApi.list({ limit: 5 }),
      paymentApi.list(),
    ]).then(([r, p]) => {
      setRequests(r.data.data || [])
      setPayments(p.data.data || [])
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <PageLoader />

  const completed = requests.filter(r => r.status === 'completed').length
  const pending = requests.filter(r => ['pending','approved','assigned','on_way','in_progress'].includes(r.status)).length
  const totalPaid = payments.filter(p => p.status === 'completed').reduce((s, p) => s + parseFloat(p.amount || 0), 0)

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'
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
            <h1 className="text-2xl font-display font-bold text-gray-900">{greeting}, {user?.name?.split(' ')[0]} 👋</h1>
            <p className="text-sm text-gray-400 mt-0.5">Voici un aperçu de votre activité</p>
          </div>
        </div>
        <Link to="/dashboard/new-request" className="btn-primary">
          <Plus size={16} /> Nouvelle collecte
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Truck} label="Total demandes" value={requests.length} color="green" />
        <StatCard icon={Clock} label="En cours" value={pending} color="yellow" />
        <StatCard icon={CheckCircle} label="Complétées" value={completed} color="blue" />
        <StatCard icon={Star} label="Montant payé" value={`${totalPaid.toLocaleString()} FCFA`} color="purple" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Requests */}
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-display font-bold">Demandes récentes</h2>
            <Link to="/dashboard/requests" className="text-sm text-[#1A8A3C] font-semibold hover:underline flex items-center gap-1">
              Voir tout <ArrowRight size={14} />
            </Link>
          </div>
          {requests.length === 0 ? (
            <EmptyState icon={Truck} title="Aucune demande" description="Créez votre première demande de collecte."
              action={<Link to="/dashboard/new-request" className="btn-primary"><Plus size={16} />Nouvelle collecte</Link>} />
          ) : (
            <div className="flex flex-col gap-3">
              {requests.slice(0, 5).map(r => (
                <Link key={r.uuid} to={`/dashboard/requests/${r.uuid}`}
                  className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 hover:bg-[#E8F5EE] transition-all group">
                  <div className="w-10 h-10 bg-[#E8F5EE] rounded-xl flex items-center justify-center flex-shrink-0 text-lg group-hover:bg-white">
                    🗑️
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{r.category_name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {r.address?.substring(0, 30)}{r.address?.length > 30 ? '...' : ''} ·{' '}
                      {format(new Date(r.created_at), 'dd MMM yyyy', { locale: fr })}
                    </p>
                  </div>
                  <StatusBadge status={r.status} />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions + Plan */}
        <div className="flex flex-col gap-5">
          <div className="card p-6">
            <h2 className="text-lg font-display font-bold mb-4">Actions rapides</h2>
            <div className="flex flex-col gap-2.5">
              {[
                { to: '/dashboard/new-request', icon: '➕', label: 'Demander une collecte' },
                { to: '/dashboard/requests', icon: '📋', label: 'Mes demandes' },
                { to: '/dashboard/payments', icon: '💳', label: 'Historique paiements' },
                { to: '/dashboard/complaints', icon: '💬', label: 'Soumettre une réclamation' },
              ].map(a => (
                <Link key={a.to} to={a.to}
                  className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:border-[#1A8A3C] hover:text-[#1A8A3C] hover:bg-[#E8F5EE] transition-all">
                  <span className="text-lg">{a.icon}</span>{a.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="bg-[#1A8A3C] rounded-2xl p-5 text-white">
            <div className="text-xs font-bold uppercase tracking-widest text-white/60 mb-1">Forfait actuel</div>
            <div className="text-2xl font-display font-bold mb-1">Standard</div>
            <div className="text-sm text-white/60 mb-4">4 500 FCFA / mois</div>
            <div className="flex justify-between text-xs text-white/70 mb-2">
              <span>Collectes utilisées</span><span>6 / 10</span>
            </div>
            <div className="bg-white/20 rounded-full h-2 mb-4">
              <div className="bg-white h-2 w-3/5 rounded-full" />
            </div>
            <button className="w-full bg-white/15 hover:bg-white/25 transition-all py-2 rounded-xl text-sm font-semibold">
              Passer au Premium
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
