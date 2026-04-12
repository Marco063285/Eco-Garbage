import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, X, Star } from 'lucide-react'
import toast from 'react-hot-toast'
import { requestApi, ratingApi, complaintApi } from '../../services/api'
import { StatusBadge, PageLoader, ConfirmDialog, Modal } from '../../components/common'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function RequestDetail() {
  const { uuid } = useParams()
  const navigate = useNavigate()
  const [req, setReq] = useState(null)
  const [loading, setLoading] = useState(true)
  const [cancelDialog, setCancelDialog] = useState(false)
  const [ratingModal, setRatingModal] = useState(false)
  const [score, setScore] = useState(5)
  const [comment, setComment] = useState('')

  const fetchReq = async () => {
    try {
      const { data } = await requestApi.get(uuid)
      setReq(data.data)
    } catch {
      toast.error('Demande introuvable')
      navigate('/dashboard/requests')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { fetchReq() }, [uuid])

  const handleCancel = async () => {
    try {
      await requestApi.cancel(uuid)
      toast.success('Demande annulée')
      fetchReq()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Impossible d\'annuler')
    }
  }

  const handleRating = async () => {
    try {
      await ratingApi.create({ request_uuid: uuid, score, comment })
      toast.success('Note enregistrée !')
      setRatingModal(false)
      fetchReq()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur')
    }
  }

  if (loading) return <PageLoader />
  if (!req) return null

  const canCancel = !['completed','cancelled','in_progress'].includes(req.status)
  const canRate = req.status === 'completed' && !req.rating_score

  const TIMELINE = [
    { status: 'pending', label: 'Demande reçue', icon: '📨' },
    { status: 'approved', label: 'Demande approuvée', icon: '✅' },
    { status: 'assigned', label: 'Collecteur assigné', icon: '👤' },
    { status: 'on_way', label: 'Collecteur en route', icon: '🚛' },
    { status: 'in_progress', label: 'Collecte en cours', icon: '⚙️' },
    { status: 'completed', label: 'Collecte terminée', icon: '🎉' },
  ]

  const ORDER = ['pending','approved','assigned','on_way','in_progress','completed']
  const currentIdx = ORDER.indexOf(req.status)

  return (
    <div className="fade-up max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="btn-ghost p-2"><ArrowLeft size={18} /></button>
        <div>
          <h1 className="text-xl font-display font-bold">Détail de la collecte</h1>
          <p className="text-sm text-gray-400">#{req.uuid?.slice(0,8).toUpperCase()}</p>
        </div>
        <div className="ml-auto"><StatusBadge status={req.status} /></div>
      </div>

      {/* Timeline */}
      {!['cancelled','failed'].includes(req.status) && (
        <div className="card p-6 mb-5">
          <h3 className="font-display font-bold mb-5">Progression</h3>
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

      {/* Details */}
      <div className="card p-6 mb-5">
        <h3 className="font-display font-bold mb-4">Informations</h3>
        <div className="grid grid-cols-2 gap-4">
          {[
            ['Type de déchet', req.category_name],
            ['Type de service', req.service_type],
            ['Adresse', req.address],
            ['Quantité', req.quantity_estimate || '—'],
            ['Prix estimé', req.estimated_price ? `${parseFloat(req.estimated_price).toLocaleString()} FCFA` : '—'],
            ['Prix final', req.final_price ? `${parseFloat(req.final_price).toLocaleString()} FCFA` : '—'],
            ['Créée le', format(new Date(req.created_at), 'dd MMM yyyy HH:mm', { locale: fr })],
            ['Collecteur', req.collector_name || 'Non assigné'],
          ].map(([k, v]) => (
            <div key={k}>
              <p className="text-xs text-gray-400 mb-0.5">{k}</p>
              <p className="text-sm font-medium text-gray-800 break-words">{v}</p>
            </div>
          ))}
        </div>
        {req.notes && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-1">Instructions</p>
            <p className="text-sm text-gray-600">{req.notes}</p>
          </div>
        )}
      </div>

      {/* Paiement */}
      {req.payment_status && (
        <div className={`rounded-2xl p-4 mb-5 flex items-center justify-between ${req.payment_status === 'completed' ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
          <div>
            <p className="text-sm font-semibold">{req.payment_status === 'completed' ? '✅ Paiement effectué' : '⏳ Paiement en attente'}</p>
            {req.payment_amount && <p className="text-xs text-gray-500 mt-0.5">{parseFloat(req.payment_amount).toLocaleString()} FCFA</p>}
          </div>
          {req.payment_status !== 'completed' && (
            <button className="btn-primary text-xs px-4 py-2">Payer</button>
          )}
        </div>
      )}

      {/* Rating */}
      {req.rating_score && (
        <div className="card p-4 mb-5">
          <p className="text-sm font-semibold mb-1">Votre évaluation</p>
          <div className="flex gap-0.5 text-yellow-400">{'★'.repeat(req.rating_score)}{'☆'.repeat(5-req.rating_score)}</div>
          {req.rating_comment && <p className="text-xs text-gray-400 mt-1 italic">"{req.rating_comment}"</p>}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 flex-wrap">
        {canRate && (
          <button onClick={() => setRatingModal(true)} className="btn-primary flex-1 justify-center">
            <Star size={16} /> Noter le collecteur
          </button>
        )}
        {canCancel && (
          <button onClick={() => setCancelDialog(true)}
            className="flex-1 justify-center inline-flex items-center gap-2 border-2 border-red-300 text-red-500 px-6 py-3 rounded-xl font-semibold text-sm hover:bg-red-50 transition-all">
            <X size={16} /> Annuler la demande
          </button>
        )}
        <Link to="/dashboard/complaints" className="btn-ghost flex-1 justify-center border border-gray-200">💬 Signaler un problème</Link>
      </div>

      {/* Cancel confirm */}
      <ConfirmDialog isOpen={cancelDialog} onClose={() => setCancelDialog(false)} onConfirm={handleCancel}
        title="Annuler la demande" message="Êtes-vous sûr de vouloir annuler cette demande ? Cette action est irréversible."
        confirmLabel="Oui, annuler" danger />

      {/* Rating modal */}
      <Modal isOpen={ratingModal} onClose={() => setRatingModal(false)} title="Évaluer le collecteur">
        <div className="flex flex-col gap-4">
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-3">Collecteur : <strong>{req.collector_name}</strong></p>
            <div className="flex justify-center gap-2">
              {[1,2,3,4,5].map(n => (
                <button key={n} type="button" onClick={() => setScore(n)}
                  className={`text-3xl transition-transform hover:scale-125 ${n <= score ? 'text-yellow-400' : 'text-gray-300'}`}>★</button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">{score}/5</p>
          </div>
          <textarea className="input resize-none min-h-[80px]" placeholder="Commentaire optionnel..."
            value={comment} onChange={e => setComment(e.target.value)} />
          <div className="flex gap-3">
            <button onClick={() => setRatingModal(false)} className="btn-ghost flex-1 justify-center border border-gray-200">Annuler</button>
            <button onClick={handleRating} className="btn-primary flex-1 justify-center">Envoyer la note</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
