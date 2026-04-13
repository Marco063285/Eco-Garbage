import { useState, useEffect } from 'react'
import { MessageSquare, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { complaintApi } from '../../services/api'
import { PageHeader, PageLoader, EmptyState, StatusBadge, Modal } from '../../components/common'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const TYPES = [
  { value: 'missed_pickup', label: 'Collecte manquée' },
  { value: 'incorrect_pricing', label: 'Tarif incorrect' },
  { value: 'collector_misconduct', label: 'Comportement du collecteur' },
  { value: 'service_quality', label: 'Qualité du service' },
  { value: 'other', label: 'Autre' },
]

export default function Complaints() {
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ type: 'other', description: '' })
  const [submitting, setSubmitting] = useState(false)

  const loadData = () => {
    complaintApi.mine().then(r => setComplaints(r.data.data || [])).finally(() => setLoading(false))
  }
  useEffect(() => { loadData() }, [])

  const handleSubmit = async () => {
    if (!form.description.trim()) return toast.error('Description requise')
    setSubmitting(true)
    try {
      await complaintApi.create(form)
      toast.success('Réclamation enregistrée !')
      setModal(false)
      setForm({ type: 'other', description: '' })
      loadData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fade-up">
      <PageHeader title="Réclamations" subtitle="Signalez un problème ou une insatisfaction"
        action={<button onClick={() => setModal(true)} className="btn-primary"><Plus size={16} />Nouvelle réclamation</button>} />
      {loading ? <PageLoader /> : complaints.length === 0 ? (
        <EmptyState icon={MessageSquare} title="Aucune réclamation" description="Tout va bien ! Signalez un problème si nécessaire."
          action={<button onClick={() => setModal(true)} className="btn-primary"><Plus size={16} />Nouvelle réclamation</button>} />
      ) : (
        <div className="flex flex-col gap-3">
          {complaints.map(c => (
            <div key={c.uuid} className="card p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <p className="font-semibold text-gray-800">{TYPES.find(t => t.value === c.type)?.label || c.type}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{format(new Date(c.created_at), 'dd MMM yyyy', { locale: fr })}</p>
                </div>
                <StatusBadge status={c.status} />
              </div>
              <p className="text-sm text-gray-500">{c.description}</p>
              {c.admin_response && (
                <div className="mt-3 pt-3 border-t border-gray-100 bg-[#E8F5EE] rounded-xl p-3">
                  <p className="text-xs font-semibold text-[#1A8A3C] mb-1">Réponse de l'administrateur :</p>
                  <p className="text-sm text-gray-600">{c.admin_response}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modal} onClose={() => setModal(false)} title="Nouvelle réclamation">
        <div className="flex flex-col gap-4">
          <div>
            <label className="label">Type de réclamation</label>
            <select className="input" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
              {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Description <span className="text-red-500">*</span></label>
            <textarea className="input resize-none min-h-[120px]" placeholder="Décrivez votre problème en détail..."
              value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setModal(false)} className="btn-ghost flex-1 justify-center border border-gray-200">Annuler</button>
            <button onClick={handleSubmit} disabled={submitting} className="btn-primary flex-1 justify-center">
              {submitting ? 'Envoi...' : 'Envoyer'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
