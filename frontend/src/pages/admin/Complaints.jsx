import { useState, useEffect } from 'react'
import { MessageSquare } from 'lucide-react'
import toast from 'react-hot-toast'
import { adminApi } from '../../services/api'
import { PageHeader, PageLoader, EmptyState, StatusBadge, Modal } from '../../components/common'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const TYPE_LABELS = {
  missed_pickup: 'Collecte manquée', incorrect_pricing: 'Tarif incorrect',
  collector_misconduct: 'Comportement collecteur', service_quality: 'Qualité service', other: 'Autre',
}

export default function AdminComplaints() {
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [response, setResponse] = useState('')
  const [status, setStatus] = useState('in_review')
  const [saving, setSaving] = useState(false)

  const fetch = () => {
    adminApi.complaints().then(r => setComplaints(r.data.data || [])).finally(() => setLoading(false))
  }
  useEffect(() => { fetch() }, [])

  const openComplaint = (c) => {
    setSelected(c)
    setResponse(c.admin_response || '')
    setStatus(c.status === 'open' ? 'in_review' : c.status)
  }

  const handleRespond = async () => {
    if (!response.trim()) return toast.error('Réponse requise')
    setSaving(true)
    try {
      await adminApi.respondComplaint(selected.uuid, { status, admin_response: response })
      toast.success('Réclamation mise à jour')
      setSelected(null)
      fetch()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  const open = complaints.filter(c => c.status === 'open').length

  return (
    <div className="fade-up">
      <PageHeader title="Réclamations" subtitle={`${open} ouverte(s) sur ${complaints.length} total`} />

      {open > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 flex items-center gap-3">
          <MessageSquare size={18} className="text-red-500" />
          <p className="text-sm font-semibold text-red-700">{open} réclamation(s) en attente de réponse</p>
        </div>
      )}

      {loading ? <PageLoader /> : complaints.length === 0 ? (
        <EmptyState icon={MessageSquare} title="Aucune réclamation" description="Tout va bien !" />
      ) : (
        <div className="flex flex-col gap-3">
          {complaints.map(c => (
            <div key={c.uuid}
              onClick={() => openComplaint(c)}
              className={`card p-5 cursor-pointer hover:border-[#1A8A3C]/30 hover:-translate-y-0.5 transition-all ${c.status === 'open' ? 'border-red-200 bg-red-50/30' : ''}`}>
              <div className="flex items-start justify-between gap-4 mb-2">
                <div>
                  <span className="text-sm font-semibold text-gray-800">{TYPE_LABELS[c.type] || c.type}</span>
                  <span className="text-xs text-gray-400 ml-2">— {c.user_name}</span>
                </div>
                <StatusBadge status={c.status} />
              </div>
              <p className="text-sm text-gray-500 line-clamp-2">{c.description}</p>
              <p className="text-xs text-gray-300 mt-2">{format(new Date(c.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}</p>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title="Répondre à la réclamation" size="lg">
        {selected && (
          <div className="flex flex-col gap-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-500 mb-1">Réclamation de {selected.user_name}</p>
              <p className="text-sm text-gray-700">{selected.description}</p>
            </div>
            <div>
              <label className="label">Statut</label>
              <select className="input" value={status} onChange={e => setStatus(e.target.value)}>
                <option value="in_review">En révision</option>
                <option value="resolved">Résolu</option>
                <option value="closed">Fermé</option>
              </select>
            </div>
            <div>
              <label className="label">Réponse <span className="text-red-500">*</span></label>
              <textarea className="input resize-none min-h-[120px]" placeholder="Écrivez votre réponse..."
                value={response} onChange={e => setResponse(e.target.value)} />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setSelected(null)} className="btn-ghost flex-1 justify-center border border-gray-200">Annuler</button>
              <button onClick={handleRespond} disabled={saving} className="btn-primary flex-1 justify-center">
                {saving ? 'Envoi...' : 'Envoyer la réponse'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
