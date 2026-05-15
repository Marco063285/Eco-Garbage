import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, X, Star, ShieldCheck, User, Archive } from 'lucide-react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { requestApi, ratingApi } from '../../services/api'
import { StatusBadge, PageLoader, ConfirmDialog, Modal } from '../../components/common'
import LiveRouteMap from '../../components/common/LiveRouteMap'
import { format } from 'date-fns'
import { fr, enUS } from 'date-fns/locale'

export default function RequestDetail() {
  const { t, i18n } = useTranslation()
  const dateLocale = i18n.language?.startsWith('en') ? enUS : fr
  const isEn = i18n.language?.startsWith('en')
  const { uuid } = useParams()
  const navigate = useNavigate()
  const [req, setReq] = useState(null)
  const [loading, setLoading] = useState(true)
  const [cancelDialog, setCancelDialog] = useState(false)
  const [ratingModal, setRatingModal] = useState(false)
  const [score, setScore] = useState(5)
  const [comment, setComment] = useState('')
  const [archiving, setArchiving] = useState(false)

  const TIMELINE = [
    { status: 'pending',     label: isEn ? 'Request received'   : 'Demande reçue',       icon: '📨' },
    { status: 'approved',    label: isEn ? 'Request approved'   : 'Demande approuvée',    icon: '✅' },
    { status: 'assigned',    label: isEn ? 'Collector assigned' : 'Collecteur assigné',   icon: '👤' },
    { status: 'on_way',      label: isEn ? 'Collector en route' : 'Collecteur en route',  icon: '🚛' },
    { status: 'in_progress', label: isEn ? 'Collection ongoing' : 'Collecte en cours',    icon: '⚙️' },
    { status: 'completed',   label: isEn ? 'Collection done'    : 'Collecte terminée',    icon: '🎉' },
  ]

  const fetchReq = async () => {
    try {
      const { data } = await requestApi.get(uuid)
      setReq(data.data)
    } catch {
      toast.error(isEn ? 'Request not found' : 'Demande introuvable')
      navigate('/dashboard/requests')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchReq() }, [uuid])

  // Auto-refresh every 10s when collector is on the way
  useEffect(() => {
    if (!req) return
    if (!['on_way', 'in_progress'].includes(req.status)) return
    const timer = setInterval(fetchReq, 10000)
    return () => clearInterval(timer)
  }, [req?.status])

  const handleCancel = async () => {
    try {
      await requestApi.cancel(uuid)
      toast.success(t('user.requests.cancelSuccess'))
      fetchReq()
    } catch (err) {
      toast.error(err.response?.data?.message || t('common.serverError'))
    }
  }

  const handleRating = async () => {
    try {
      await ratingApi.create({ request_uuid: uuid, score, comment })
      toast.success(isEn ? 'Rating saved!' : 'Note enregistrée !')
      setRatingModal(false)
      fetchReq()
    } catch (err) {
      toast.error(err.response?.data?.message || t('common.serverError'))
    }
  }

  const handleArchive = async () => {
    setArchiving(true)
    try {
      await requestApi.archive(uuid)
      toast.success(isEn ? 'Request archived' : 'Demande archivée')
      navigate('/dashboard/archived')
    } catch (err) {
      toast.error(err.response?.data?.message || t('common.serverError'))
    } finally {
      setArchiving(false)
    }
  }

  if (loading) return <PageLoader />
  if (!req) return null

  const canCancel = !['completed','cancelled','in_progress'].includes(req.status)
  const canRate = req.status === 'completed' && !req.rating_score
  const canArchive = ['completed','cancelled','failed'].includes(req.status)

  const ORDER = ['pending','approved','assigned','on_way','in_progress','completed']
  const currentIdx = ORDER.indexOf(req.status)

  const details = [
    [isEn ? 'Waste type'      : 'Type de déchet',  req.category_name],
    [isEn ? 'Service type'    : 'Type de service',  req.service_type],
    [isEn ? 'Address'         : 'Adresse',           req.address],
    [isEn ? 'Quantity'        : 'Quantité',          req.quantity_number ? `${req.quantity_number} ${isEn ? 'unit(s)' : 'unité(s)'}` : req.quantity_estimate || '—'],
    [isEn ? 'Distance'        : 'Distance',          req.distance_km ? `${req.distance_km} km` : '—'],
    [isEn ? 'Estimated price' : 'Prix estimé',       req.estimated_price ? `${parseFloat(req.estimated_price).toLocaleString()} FCFA` : '—'],
    [isEn ? 'Final price'     : 'Prix final',        req.final_price ? `${parseFloat(req.final_price).toLocaleString()} FCFA` : '—'],
    [isEn ? 'Created on'      : 'Créée le',          format(new Date(req.created_at), 'dd MMM yyyy HH:mm', { locale: dateLocale })],
    [isEn ? 'Collector'       : 'Collecteur',        req.collector_name || (isEn ? 'Not assigned' : 'Non assigné')],
    [isEn ? 'Collector phone' : 'Tél. collecteur',   req.collector_phone || '—'],
  ]

  return (
    <div className="fade-up max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="btn-ghost p-2"><ArrowLeft size={18} /></button>
        <div>
          <h1 className="text-xl font-display font-bold">{isEn ? 'Collection detail' : 'Détail de la collecte'}</h1>
          <p className="text-sm text-gray-400">#{req.uuid?.slice(0,8).toUpperCase()}</p>
        </div>
        <div className="ml-auto"><StatusBadge status={req.status} /></div>
      </div>

      {/* Timeline */}
      {!['cancelled','failed'].includes(req.status) && (
        <div className="card p-6 mb-5">
          <h3 className="font-display font-bold mb-5">{isEn ? 'Progress' : 'Progression'}</h3>
          <div className="flex items-start gap-0">
            {TIMELINE.map((step, i) => {
              const done = i <= currentIdx
              const active = i === currentIdx
              return (
                <div key={step.status} className="flex-1 flex flex-col items-center gap-1 relative">
                  {i < TIMELINE.length - 1 && (
                    <div className={`absolute top-4 left-1/2 w-full h-0.5 ${done && i < currentIdx ? 'bg-[#1A8A3C]' : 'bg-gray-200'}`} />
                  )}
                  <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all ${done ? 'bg-[#1A8A3C] text-white' : 'bg-gray-100 text-gray-400'} ${active ? 'ring-4 ring-[#E8F5EE] scale-110' : ''}`}>
                    {step.icon}
                  </div>
                  <p className={`text-[10px] text-center leading-tight mt-1 ${done ? 'text-[#1A8A3C] font-semibold' : 'text-gray-400'}`}>{step.label}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Live route map — shown when collector is on the way */}
      {['assigned','on_way','in_progress'].includes(req.status) && (
        <div className="card p-6 mb-5">
          <h3 className="font-display font-bold mb-4">
            {isEn ? '🗺️ Live route' : '🗺️ Trajet en temps réel'}
          </h3>
          <LiveRouteMap
            userLocation={req.latitude && req.longitude ? { latitude: req.latitude, longitude: req.longitude } : null}
            collectorLocation={req.collector_location}
            userLabel={isEn ? 'Collection address' : 'Adresse de collecte'}
            collectorLabel={isEn ? 'Collector' : 'Collecteur'}
          />
          <p className="text-xs text-gray-400 mt-3">
            {isEn
              ? 'Updates every 10 seconds while the collector is on the way.'
              : 'Mise à jour toutes les 10 secondes pendant le trajet du collecteur.'}
          </p>
        </div>
      )}

      {/* Collector security card */}
      {req.collector_name && ['assigned','on_way','in_progress','completed'].includes(req.status) && (
        <div className="card p-5 mb-5 border-2 border-[#C8EDDA] bg-gradient-to-br from-[#F0FBF7] to-white">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck size={16} className="text-[#1A8A3C]" />
            <h3 className="font-display font-bold text-[#1A8A3C]">
              {isEn ? 'Your collector — security verification' : 'Votre collecteur — vérification sécurité'}
            </h3>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-xl overflow-hidden bg-[#E8F5EE] flex-shrink-0 flex items-center justify-center border-2 border-[#1A8A3C]">
              {req.collector_avatar_url
                ? <img src={req.collector_avatar_url} alt={req.collector_name} className="w-full h-full object-cover" />
                : <User size={32} className="text-[#1A8A3C]" />}
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-900 text-lg">{req.collector_name}</p>
              {req.collector_phone && (
                <a href={`tel:${req.collector_phone}`} className="text-sm text-[#1A8A3C] font-medium hover:underline block">
                  📞 {req.collector_phone}
                </a>
              )}
              <div className="mt-2 p-2 bg-white rounded-lg border border-[#C8EDDA] text-xs text-gray-600">
                <p className="font-semibold text-[#1A8A3C] mb-0.5">🔒 {isEn ? 'Security measure' : 'Mesure de sécurité'}</p>
                <p>{isEn
                  ? 'Please verify this photo matches the person coming to your home.'
                  : 'Vérifiez que cette photo correspond à la personne venant à votre domicile.'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Details */}
      <div className="card p-6 mb-5">
        <h3 className="font-display font-bold mb-4">{isEn ? 'Information' : 'Informations'}</h3>
        <div className="grid grid-cols-2 gap-4">
          {details.map(([k, v]) => (
            <div key={k}>
              <p className="text-xs text-gray-400 mb-0.5">{k}</p>
              <p className="text-sm font-medium text-gray-800 break-words">{v}</p>
            </div>
          ))}
        </div>
        {req.notes && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-1">{isEn ? 'Instructions' : 'Instructions'}</p>
            <p className="text-sm text-gray-600">{req.notes}</p>
          </div>
        )}
      </div>

      {/* Payment */}
      {req.status === 'completed' && (
        <div className={`rounded-2xl p-4 mb-5 flex items-center justify-between ${req.payment_status === 'completed' ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
          <div>
            <p className="text-sm font-semibold">
              {req.payment_status === 'completed'
                ? (isEn ? '✅ Payment completed' : '✅ Paiement effectué')
                : (isEn ? '⏳ Payment pending'   : '⏳ Paiement en attente')}
            </p>
            {(req.payment_amount || req.final_price) && (
              <p className="text-xs text-gray-500 mt-0.5">
                {parseFloat(req.payment_amount || req.final_price).toLocaleString()} FCFA
              </p>
            )}
          </div>
          {req.payment_status !== 'completed' && (
            <Link to="/dashboard/payments" className="btn-primary text-xs px-4 py-2">
              {isEn ? 'Pay now' : 'Payer maintenant'}
            </Link>
          )}
        </div>
      )}

      {/* Rating */}
      {req.rating_score && (
        <div className="card p-4 mb-5">
          <p className="text-sm font-semibold mb-1">{isEn ? 'Your rating' : 'Votre évaluation'}</p>
          <div className="flex gap-0.5 text-yellow-400">{'★'.repeat(req.rating_score)}{'☆'.repeat(5-req.rating_score)}</div>
          {req.rating_comment && <p className="text-xs text-gray-400 mt-1 italic">"{req.rating_comment}"</p>}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 flex-wrap">
        {canRate && (
          <button onClick={() => setRatingModal(true)} className="btn-primary flex-1 justify-center">
            <Star size={16} /> {isEn ? 'Rate collector' : 'Noter le collecteur'}
          </button>
        )}
        {canCancel && (
          <button onClick={() => setCancelDialog(true)}
            className="flex-1 justify-center inline-flex items-center gap-2 border-2 border-red-300 text-red-500 px-6 py-3 rounded-xl font-semibold text-sm hover:bg-red-50 transition-all">
            <X size={16} /> {isEn ? 'Cancel request' : 'Annuler la demande'}
          </button>
        )}
        {canArchive && (
          <button onClick={handleArchive} disabled={archiving}
            className="flex-1 justify-center inline-flex items-center gap-2 border-2 border-gray-300 text-gray-600 px-6 py-3 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-all disabled:opacity-50">
            <Archive size={16} /> {archiving ? (isEn ? 'Archiving...' : 'Archivage...') : (isEn ? 'Archive' : 'Archiver')}
          </button>
        )}
        <Link to="/dashboard/complaints" className="btn-ghost flex-1 justify-center border border-gray-200">
          💬 {isEn ? 'Report a problem' : 'Signaler un problème'}
        </Link>
      </div>

      <ConfirmDialog isOpen={cancelDialog} onClose={() => setCancelDialog(false)} onConfirm={handleCancel}
        title={isEn ? 'Cancel request' : 'Annuler la demande'}
        message={isEn ? 'Are you sure you want to cancel this request? This action is irreversible.' : 'Êtes-vous sûr de vouloir annuler cette demande ? Cette action est irréversible.'}
        confirmLabel={isEn ? 'Yes, cancel' : 'Oui, annuler'} danger />

      <Modal isOpen={ratingModal} onClose={() => setRatingModal(false)} title={isEn ? 'Rate the collector' : 'Évaluer le collecteur'}>
        <div className="flex flex-col gap-4">
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-3">
              {isEn ? 'Collector:' : 'Collecteur :'} <strong>{req.collector_name}</strong>
            </p>
            <div className="flex justify-center gap-2">
              {[1,2,3,4,5].map(n => (
                <button key={n} type="button" onClick={() => setScore(n)}
                  className={`text-3xl transition-transform hover:scale-125 ${n <= score ? 'text-yellow-400' : 'text-gray-300'}`}>★</button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">{score}/5</p>
          </div>
          <textarea className="input resize-none min-h-[80px]"
            placeholder={isEn ? 'Optional comment...' : 'Commentaire optionnel...'}
            value={comment} onChange={e => setComment(e.target.value)} />
          <div className="flex gap-3">
            <button onClick={() => setRatingModal(false)} className="btn-ghost flex-1 justify-center border border-gray-200">{t('common.cancel')}</button>
            <button onClick={handleRating} className="btn-primary flex-1 justify-center">{t('common.send')}</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
