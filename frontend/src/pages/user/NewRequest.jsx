import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Send, Loader2, MapPin, Navigation, User, Phone, TrendingUp, Minus, Plus } from 'lucide-react'
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
  const [locating, setLocating] = useState(false)
  const [estimating, setEstimating] = useState(false)
  const [estimate, setEstimate] = useState(null)
  const [assignResult, setAssignResult] = useState(null)
  const [form, setForm] = useState({
    category_id: '',
    service_type: 'immediate',
    address: '',
    quantity_estimate: '',
    quantity_number: 1,
    notes: '',
    scheduled_at: '',
    latitude: null,
    longitude: null,
  })

  useEffect(() => {
    categoryApi.list().then(r => setCategories(r.data.data || [])).finally(() => setLoading(false))
  }, [])

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  // Get user's GPS location
  const getLocation = () => {
    if (!navigator.geolocation) return toast.error('Géolocalisation non supportée par votre navigateur')
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm(p => ({ ...p, latitude: pos.coords.latitude, longitude: pos.coords.longitude }))
        toast.success('Position GPS obtenue !')
        setLocating(false)
      },
      (err) => {
        toast.error('Impossible d\'obtenir votre position. Vérifiez les permissions.')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  // Fetch live price estimate
  const fetchEstimate = useCallback(async () => {
    if (!form.category_id) return
    setEstimating(true)
    try {
      const res = await requestApi.estimate({
        category_id: form.category_id,
        latitude: form.latitude,
        longitude: form.longitude,
        quantity_number: form.quantity_number,
      })
      setEstimate(res.data.data)
    } catch {
      setEstimate(null)
    } finally {
      setEstimating(false)
    }
  }, [form.category_id, form.latitude, form.longitude, form.quantity_number])

  // Auto-estimate when key fields change
  useEffect(() => {
    if (form.category_id) fetchEstimate()
  }, [fetchEstimate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.category_id || !form.address) return toast.error('Catégorie et adresse sont obligatoires')
    if (form.service_type !== 'immediate' && !form.scheduled_at) return toast.error('Veuillez choisir une date de collecte')
    if (!form.latitude || !form.longitude) return toast.error('Veuillez activer la géolocalisation pour une attribution automatique')
    setSubmitting(true)
    try {
      const res = await requestApi.create(form)
      const data = res.data.data
      if (data.collector_name) {
        setAssignResult(data)
        toast.success('Collecteur assigné automatiquement !')
      } else {
        toast.success('Demande créée ! Nous recherchons un collecteur.')
        navigate('/dashboard/requests')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la création')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <PageLoader />

  // Show success screen with assigned collector info
  if (assignResult) {
    return (
      <div className="fade-up max-w-lg mx-auto mt-10">
        <div className="card p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[#E8F5EE] flex items-center justify-center">
            <Navigation size={36} className="text-[#1A8A3C]" />
          </div>
          <h2 className="font-display text-2xl font-bold text-gray-900 mb-2">Collecteur en route !</h2>
          <p className="text-gray-500 mb-6">Un collecteur a été assigné automatiquement à votre demande.</p>

          <div className="bg-[#E8F5EE] rounded-2xl p-5 mb-6 text-left">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-[#1A8A3C] flex items-center justify-center">
                <User size={24} className="text-white" />
              </div>
              <div>
                <p className="font-bold text-gray-900">{assignResult.collector_name}</p>
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <Phone size={12} /> {assignResult.collector_phone}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Distance</span>
                <span className="font-semibold">{assignResult.distance_km} km</span>
              </div>
              <div className="flex justify-between border-t border-[#C8EDDA] pt-2">
                <span className="font-semibold text-[#1A8A3C]">Prix estimé</span>
                <span className="font-bold text-[#1A8A3C] text-lg">{assignResult.estimated_price?.toLocaleString()} FCFA</span>
              </div>
            </div>
          </div>

          <button onClick={() => navigate('/dashboard/requests')} className="btn-primary w-full justify-center py-3">
            Voir mes demandes
          </button>
        </div>
      </div>
    )
  }

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

        {/* Quantity picker */}
        <div className="card p-6">
          <h3 className="font-display font-bold mb-4">Quantité de déchets</h3>
          <div className="flex items-center justify-center gap-5">
            <button type="button"
              onClick={() => set('quantity_number', Math.max(1, form.quantity_number - 1))}
              className="w-12 h-12 rounded-full border-2 border-gray-200 flex items-center justify-center hover:border-[#1A8A3C] transition-colors">
              <Minus size={20} />
            </button>
            <div className="text-center">
              <span className="text-4xl font-bold text-[#1A8A3C]">{form.quantity_number}</span>
              <p className="text-xs text-gray-400 mt-1">unité(s) / sac(s)</p>
            </div>
            <button type="button"
              onClick={() => set('quantity_number', Math.min(20, form.quantity_number + 1))}
              className="w-12 h-12 rounded-full border-2 border-gray-200 flex items-center justify-center hover:border-[#1A8A3C] transition-colors">
              <Plus size={20} />
            </button>
          </div>
        </div>

        {/* Details */}
        <div className="card p-6 flex flex-col gap-5">
          <h3 className="font-display font-bold">Détails de la collecte</h3>

          {/* GPS Location */}
          <div>
            <label className="label">Votre position GPS <span className="text-red-500">*</span></label>
            <button type="button" onClick={getLocation} disabled={locating}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all ${form.latitude ? 'border-[#1A8A3C] bg-[#E8F5EE] text-[#1A8A3C]' : 'border-dashed border-gray-300 text-gray-500 hover:border-[#1A8A3C]'}`}>
              {locating ? <Loader2 size={16} className="spinner" /> : <MapPin size={16} />}
              {locating ? 'Localisation...' : form.latitude ? `📍 Position obtenue (${form.latitude.toFixed(4)}, ${form.longitude.toFixed(4)})` : 'Activer la géolocalisation'}
            </button>
          </div>

          <div>
            <label className="label">Adresse de collecte <span className="text-red-500">*</span></label>
            <textarea className="input min-h-[80px] resize-none" placeholder="Entrez l'adresse complète du point de collecte..."
              value={form.address} onChange={e => set('address', e.target.value)} />
          </div>

          <div>
            <label className="label">Quantité estimée (description)</label>
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

        {/* Live Estimate Summary */}
        {(estimate || form.category_id) && (
          <div className="bg-[#E8F5EE] border border-[#C8EDDA] rounded-2xl p-5">
            <h3 className="font-display font-bold text-[#1A8A3C] mb-3 flex items-center gap-2">
              <TrendingUp size={18} /> Estimation en direct
              {estimating && <Loader2 size={14} className="spinner" />}
            </h3>
            {estimate ? (
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Type de déchet</span><span className="font-medium">{categories.find(c => c.id == form.category_id)?.name}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Prix de base / unité</span><span className="font-medium">{estimate.base_price?.toLocaleString()} FCFA</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Quantité</span><span className="font-medium">{estimate.quantity} unité(s)</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Distance collecteur</span><span className="font-medium">{estimate.distance_km > 0 ? `${estimate.distance_km} km` : 'En attente GPS'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Collecteur disponible</span>
                  <span className={`font-medium ${estimate.collector_found ? 'text-[#1A8A3C]' : 'text-orange-500'}`}>
                    {estimate.collector_found ? `✅ ${estimate.collector_name}` : '⏳ Recherche...'}
                  </span>
                </div>
                <div className="flex justify-between border-t border-[#C8EDDA] pt-2 mt-1">
                  <span className="font-semibold text-[#1A8A3C]">Prix estimé</span>
                  <span className="font-bold text-[#1A8A3C] text-lg">{estimate.estimated_price?.toLocaleString()} FCFA</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Sélectionnez une catégorie et activez la géolocalisation pour voir l'estimation.</p>
            )}
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
