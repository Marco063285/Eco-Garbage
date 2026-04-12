import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Send, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { categoryApi, requestApi } from '../../services/api'
import { PageHeader, PageLoader } from '../../components/common'

const SERVICE_TYPES = [
  { value: 'immediate', label: '⚡ Immédiate', desc: 'Dans les plus brefs délais' },
  { value: 'scheduled', label: '📅 Planifiée', desc: 'À la date choisie' },
  { value: 'recurring', label: '🔄 Récurrente', desc: 'Service régulier' },
  { value: 'business', label: '🏢 Entreprise', desc: 'Pour les professionnels' },
  { value: 'bulk', label: '📦 Gros volume', desc: 'Encombrants, chantier' },
  { value: 'recyclable', label: '♻️ Recyclables', desc: 'Matières recyclables' },
]

export default function NewRequest() {
  const navigate = useNavigate()
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    category_id: '',
    service_type: 'immediate',
    address: '',
    quantity_estimate: '',
    notes: '',
    scheduled_at: '',
  })

  useEffect(() => {
    categoryApi.list().then(r => setCategories(r.data.data || [])).finally(() => setLoading(false))
  }, [])

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const selectedCat = categories.find(c => c.id == form.category_id)
  const estimatedPrice = selectedCat?.base_price
    ? `${parseFloat(selectedCat.base_price).toLocaleString()} FCFA`
    : '—'

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.category_id || !form.address) return toast.error('Catégorie et adresse sont obligatoires')
    if (form.service_type !== 'immediate' && !form.scheduled_at) return toast.error('Veuillez choisir une date de collecte')
    setSubmitting(true)
    try {
      await requestApi.create(form)
      toast.success('Demande créée avec succès !')
      navigate('/dashboard/requests')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la création')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <PageLoader />

  return (
    <div className="fade-up max-w-2xl mx-auto">
      <PageHeader title="Nouvelle collecte" subtitle="Remplissez le formulaire pour créer une demande de collecte" />

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Service type */}
        <div className="card p-6">
          <h3 className="font-display font-bold mb-4">Type de service</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {SERVICE_TYPES.map(s => (
              <button key={s.value} type="button"
                onClick={() => set('service_type', s.value)}
                className={`p-3.5 rounded-xl border-2 text-left transition-all ${form.service_type === s.value ? 'border-[#1A8A3C] bg-[#E8F5EE]' : 'border-gray-200 hover:border-gray-300'}`}>
                <p className="text-sm font-semibold text-gray-800">{s.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Category */}
        <div className="card p-6">
          <h3 className="font-display font-bold mb-4">Type de déchet <span className="text-red-500">*</span></h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {categories.map(cat => (
              <button key={cat.id} type="button"
                onClick={() => set('category_id', cat.id)}
                className={`p-3.5 rounded-xl border-2 text-left transition-all ${form.category_id == cat.id ? 'border-[#1A8A3C] bg-[#E8F5EE]' : 'border-gray-200 hover:border-gray-300'}`}>
                <p className="text-sm font-semibold text-gray-800">{cat.name}</p>
                <p className="text-xs text-[#1A8A3C] mt-0.5 font-medium">{parseFloat(cat.base_price).toLocaleString()} FCFA</p>
                {cat.is_hazardous && <span className="text-[10px] text-red-500 font-bold">⚠️ Dangereux</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Details */}
        <div className="card p-6 flex flex-col gap-5">
          <h3 className="font-display font-bold">Détails de la collecte</h3>

          <div>
            <label className="label">Adresse de collecte <span className="text-red-500">*</span></label>
            <textarea className="input min-h-[80px] resize-none" placeholder="Entrez l'adresse complète du point de collecte..."
              value={form.address} onChange={e => set('address', e.target.value)} />
          </div>

          <div>
            <label className="label">Quantité estimée</label>
            <input className="input" placeholder="Ex: 3 sacs, 2m³, 1 canapé..." value={form.quantity_estimate}
              onChange={e => set('quantity_estimate', e.target.value)} />
          </div>

          {form.service_type !== 'immediate' && (
            <div>
              <label className="label">Date et heure souhaitées <span className="text-red-500">*</span></label>
              <input type="datetime-local" className="input" value={form.scheduled_at}
                min={new Date().toISOString().slice(0, 16)}
                onChange={e => set('scheduled_at', e.target.value)} />
            </div>
          )}

          <div>
            <label className="label">Instructions spéciales</label>
            <textarea className="input min-h-[80px] resize-none" placeholder="Indiquez toute information utile pour le collecteur..."
              value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
        </div>

        {/* Summary */}
        {selectedCat && (
          <div className="bg-[#E8F5EE] border border-[#C8EDDA] rounded-2xl p-5">
            <h3 className="font-display font-bold text-[#1A8A3C] mb-3">Récapitulatif</h3>
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Type de déchet</span><span className="font-medium">{selectedCat.name}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Type de service</span><span className="font-medium">{SERVICE_TYPES.find(s => s.value === form.service_type)?.label}</span></div>
              <div className="flex justify-between border-t border-[#C8EDDA] pt-2 mt-1"><span className="font-semibold text-[#1A8A3C]">Prix estimé</span><span className="font-bold text-[#1A8A3C] text-base">{estimatedPrice}</span></div>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button type="button" onClick={() => navigate(-1)} className="btn-ghost flex-1 justify-center border border-gray-200">
            Annuler
          </button>
          <button type="submit" disabled={submitting} className="btn-primary flex-1 justify-center py-3.5">
            {submitting ? <Loader2 size={16} className="spinner" /> : <Send size={16} />}
            {submitting ? 'Envoi...' : 'Soumettre la demande'}
          </button>
        </div>
      </form>
    </div>
  )
}
