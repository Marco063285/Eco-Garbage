import { useState, useEffect } from 'react'
import { MessageSquare } from 'lucide-react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { adminApi } from '../../services/api'
import { PageHeader, PageLoader, EmptyState, StatusBadge, Modal } from '../../components/common'
import { format } from 'date-fns'
import { fr, enUS } from 'date-fns/locale'

export default function AdminComplaints() {
  const { t, i18n } = useTranslation()
  const dateLocale = i18n.language?.startsWith('en') ? enUS : fr
  const isEn = i18n.language?.startsWith('en')
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [response, setResponse] = useState('')
  const [status, setStatus] = useState('in_review')
  const [saving, setSaving] = useState(false)

  const TYPE_LABELS = {
    missed_pickup:       isEn ? 'Missed pickup'        : 'Collecte manquée',
    incorrect_pricing:   isEn ? 'Incorrect pricing'    : 'Tarif incorrect',
    collector_misconduct:isEn ? 'Collector misconduct' : 'Comportement collecteur',
    service_quality:     isEn ? 'Service quality'      : 'Qualité service',
    other:               isEn ? 'Other'                : 'Autre',
  }

  const loadData = () => {
    adminApi.complaints().then(r => setComplaints(r.data.data || [])).finally(() => setLoading(false))
  }
  useEffect(() => { loadData() }, [])

  const openComplaint = (c) => {
    setSelected(c)
    setResponse(c.admin_response || '')
    setStatus(c.status === 'open' ? 'in_review' : c.status)
  }

  const handleRespond = async () => {
    if (!response.trim()) return toast.error(isEn ? 'Response required' : 'Réponse requise')
    setSaving(true)
    try {
      await adminApi.respondComplaint(selected.uuid, { status, admin_response: response })
      toast.success(t('admin.complaints.success'))
      setSelected(null)
      loadData()
    } catch (err) {
      toast.error(err.response?.data?.message || t('common.serverError'))
    } finally {
      setSaving(false)
    }
  }

  const open = complaints.filter(c => c.status === 'open').length

  return (
    <div className="fade-up">
      <PageHeader title={t('admin.complaints.title')} subtitle={`${open} ${isEn ? 'open' : 'ouverte(s)'} / ${complaints.length} total`} />

      {open > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 flex items-center gap-3">
          <MessageSquare size={18} className="text-red-500" />
          <p className="text-sm font-semibold text-red-700">
            {open} {isEn ? 'complaint(s) awaiting response' : 'réclamation(s) en attente de réponse'}
          </p>
        </div>
      )}

      {loading ? <PageLoader /> : complaints.length === 0 ? (
        <EmptyState icon={MessageSquare} title={t('admin.complaints.noComplaints')} description={t('admin.complaints.noComplaintsDesc')} />
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
              <p className="text-xs text-gray-300 mt-2">{format(new Date(c.created_at), 'dd MMM yyyy HH:mm', { locale: dateLocale })}</p>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={isEn ? 'Respond to complaint' : 'Répondre à la réclamation'} size="lg">
        {selected && (
          <div className="flex flex-col gap-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-500 mb-1">
                {isEn ? 'Complaint from' : 'Réclamation de'} {selected.user_name}
              </p>
              <p className="text-sm text-gray-700">{selected.description}</p>
            </div>
            <div>
              <label className="label">{isEn ? 'Status' : 'Statut'}</label>
              <select className="input" value={status} onChange={e => setStatus(e.target.value)}>
                <option value="in_review">{t('status.in_review')}</option>
                <option value="resolved">{t('status.resolved')}</option>
                <option value="closed">{t('status.closed')}</option>
              </select>
            </div>
            <div>
              <label className="label">{t('admin.complaints.response')} <span className="text-red-500">*</span></label>
              <textarea className="input resize-none min-h-[120px]" placeholder={t('admin.complaints.responsePlaceholder')}
                value={response} onChange={e => setResponse(e.target.value)} />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setSelected(null)} className="btn-ghost flex-1 justify-center border border-gray-200">{t('common.cancel')}</button>
              <button onClick={handleRespond} disabled={saving} className="btn-primary flex-1 justify-center">
                {saving ? t('admin.complaints.submitting') : t('admin.complaints.submit')}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
