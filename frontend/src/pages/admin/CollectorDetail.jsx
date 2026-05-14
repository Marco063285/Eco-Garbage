import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, User, Truck, Star, CheckCircle, Clock, ShieldCheck, ShieldX, MapPin } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { adminApi } from '../../services/api'
import { PageLoader, StatCard } from '../../components/common'
import { format } from 'date-fns'
import { fr, enUS } from 'date-fns/locale'
import toast from 'react-hot-toast'

const VERIFICATION_COLORS = {
  verified:  'bg-green-100 text-green-700',
  submitted: 'bg-blue-100 text-blue-700',
  pending:   'bg-yellow-100 text-yellow-700',
  rejected:  'bg-red-100 text-red-600',
}

export default function CollectorDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { i18n } = useTranslation()
  const isEn = i18n.language?.startsWith('en')
  const dateLocale = isEn ? enUS : fr
  const [collector, setCollector] = useState(null)
  const [loading, setLoading] = useState(true)
  const [imgModal, setImgModal] = useState(null)

  useEffect(() => {
    adminApi.getCollectorDetails(id)
      .then(r => setCollector(r.data.data))
      .catch(() => { toast.error(isEn ? 'Collector not found' : 'Collecteur introuvable'); navigate('/admin/users') })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <PageLoader />
  if (!collector) return null

  const cp = collector.collector_profile || {}
  const initials = collector.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'C'

  const verificationLabel = {
    verified:  isEn ? 'Verified'  : 'Vérifié',
    submitted: isEn ? 'Submitted' : 'Soumis',
    pending:   isEn ? 'Pending'   : 'En attente',
    rejected:  isEn ? 'Rejected'  : 'Rejeté',
  }[cp.verification_status] || cp.verification_status

  const photoSections = [
    { label: isEn ? 'ID — Front side' : 'CNI — Recto', url: cp.id_front_url },
    { label: isEn ? 'ID — Back side'  : 'CNI — Verso', url: cp.id_back_url  },
    { label: isEn ? 'Selfie photo'    : 'Photo selfie', url: cp.selfie_url   },
  ].filter(p => p.url)

  return (
    <div className="fade-up max-w-3xl mx-auto">
      {/* Back */}
      <button onClick={() => navigate('/admin/users')} className="btn-ghost p-2 mb-4 -ml-1">
        <ArrowLeft size={18} />
      </button>

      {/* Header card */}
      <div className="card p-6 mb-5">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl overflow-hidden bg-[#E8F5EE] flex-shrink-0 flex items-center justify-center">
            {collector.avatar_url ? (
              <img src={collector.avatar_url} alt={collector.name} className="w-full h-full object-cover cursor-pointer" onClick={() => setImgModal(collector.avatar_url)} />
            ) : (
              <span className="text-3xl font-bold text-[#1A8A3C] font-display">{initials}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-display font-bold text-gray-900">{collector.name}</h1>
            <p className="text-sm text-gray-400">{collector.email}</p>
            {collector.phone && <p className="text-sm text-gray-500 mt-0.5">📞 {collector.phone}</p>}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className={`badge ${VERIFICATION_COLORS[cp.verification_status] || 'bg-gray-100 text-gray-500'}`}>
                {cp.verification_status === 'verified' ? <ShieldCheck size={12} /> : <ShieldX size={12} />}
                {verificationLabel}
              </span>
              <span className={`badge ${cp.is_available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {cp.is_available ? `🟢 ${isEn ? 'Available' : 'Disponible'}` : `⚫ ${isEn ? 'Offline' : 'Hors ligne'}`}
              </span>
              <span className={`badge ${collector.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                {collector.is_active ? (isEn ? '✓ Active' : '✓ Actif') : (isEn ? '✗ Suspended' : '✗ Suspendu')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-5">
        <StatCard icon={Truck}       label={isEn ? 'Total collections' : 'Total collectes'} value={collector.stats?.totalRequests ?? 0}   color="green" />
        <StatCard icon={CheckCircle} label={isEn ? 'Completed'         : 'Terminées'}        value={collector.stats?.completedRequests ?? 0} color="blue"  />
        <StatCard icon={Star}        label={isEn ? 'Rating'            : 'Note moyenne'}      value={cp.rating_avg ? `${parseFloat(cp.rating_avg).toFixed(1)}/5` : '—'} color="yellow" />
      </div>

      {/* Vehicle & service info */}
      <div className="card p-6 mb-5">
        <h3 className="font-display font-bold mb-4">{isEn ? 'Vehicle & zone' : 'Véhicule & zone'}</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {[
            [isEn ? 'Vehicle type'  : 'Type de véhicule', cp.vehicle_type  || '—'],
            [isEn ? 'Plate number'  : 'Immatriculation',   cp.vehicle_plate || '—'],
            [isEn ? 'Service area'  : 'Zone de service',   cp.service_area  || '—'],
            [isEn ? 'National ID'   : 'N° CNI',             cp.national_id_number || '—'],
          ].map(([k, v]) => (
            <div key={k}>
              <p className="text-xs text-gray-400 mb-0.5">{k}</p>
              <p className="font-medium text-gray-800">{v}</p>
            </div>
          ))}
        </div>
        {cp.last_location_update && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-400">
            <MapPin size={12} />
            {isEn ? 'Last GPS update:' : 'Dernière mise à jour GPS :'}{' '}
            {format(new Date(cp.last_location_update), 'dd MMM yyyy HH:mm', { locale: dateLocale })}
          </div>
        )}
      </div>

      {/* Verification documents */}
      {photoSections.length > 0 && (
        <div className="card p-6 mb-5">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck size={16} className="text-[#1A8A3C]" />
            <h3 className="font-display font-bold">{isEn ? 'Verification documents' : 'Documents de vérification'}</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {photoSections.map(({ label, url }) => (
              <div key={label} className="flex flex-col gap-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
                <div className="rounded-xl overflow-hidden border border-gray-100 bg-gray-50 aspect-video flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setImgModal(url)}>
                  <img src={url} alt={label} className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none' }} />
                </div>
              </div>
            ))}
          </div>
          {cp.selfie_video_url && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{isEn ? 'Selfie video' : 'Vidéo selfie'}</p>
              <video src={cp.selfie_video_url} controls className="w-full max-w-sm rounded-xl" />
            </div>
          )}
          {cp.verification_notes && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400 mb-1">{isEn ? 'Verification notes' : 'Notes de vérification'}</p>
              <p className="text-sm text-gray-600 italic">{cp.verification_notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Account info */}
      <div className="card p-6">
        <h3 className="font-display font-bold mb-4">{isEn ? 'Account info' : 'Informations du compte'}</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">{isEn ? 'Registered on' : 'Inscrit le'}</p>
            <p className="font-medium text-gray-800">{format(new Date(collector.created_at), 'dd MMM yyyy', { locale: dateLocale })}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">{isEn ? 'Email verified' : 'Email vérifié'}</p>
            <p className="font-medium text-gray-800">{collector.is_verified ? `✅ ${isEn ? 'Yes' : 'Oui'}` : `❌ ${isEn ? 'No' : 'Non'}`}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">{isEn ? 'Total ratings' : 'Total évaluations'}</p>
            <p className="font-medium text-gray-800">{collector.stats?.ratings ?? 0}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">{isEn ? 'Completion rate' : 'Taux de complétion'}</p>
            <p className="font-medium text-gray-800">
              {collector.stats?.totalRequests > 0
                ? `${Math.round((collector.stats.completedRequests / collector.stats.totalRequests) * 100)}%`
                : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Image lightbox */}
      {imgModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setImgModal(null)}>
          <img src={imgModal} alt="" className="max-w-full max-h-full rounded-xl object-contain" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  )
}
