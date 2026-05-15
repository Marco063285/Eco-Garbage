import { useState, useEffect } from 'react'
import { MessageSquare, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { complaintApi } from '../../services/api'
import { PageHeader, PageLoader, EmptyState, StatusBadge, Modal } from '../../components/common'
import { format } from 'date-fns'
import { fr, enUS } from 'date-fns/locale'

export default function Complaints() {
  const { t, i18n } = useTranslation()
  const dateLocale = i18n.language?.startsWith('en') ? enUS : fr
  const isEn = i18n.language?.startsWith('en')
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ type: 'other', description: '' })
  const [submitting, setSubmitting] = useState(false)

  const TYPES = [
    { value: 'missed_pickup',        label: isEn ? 'Missed pickup'        : 'Collecte manquée' },
    { value: 'incorrect_pricing',    label: isEn ? 'Incorrect pricing'    : 'Tarif incorrect' },
    { value: 'collector_misconduct', label: isEn ? 'Collector misconduct' : 'Comportement du collecteur' },
    { value: 'service_quality',      label: isEn ? 'Service quality'      : 'Qualité du service' },
    { value: 'other',                label: isEn ? 'Other'                : 'Autre' },
  ]

  const loadData = () => {
    complaintApi.mine().then(r => setComplaints(r.data.data || [])).finally(() => setLoading(false))
  }
  useEffect(() => { loadData() }, [])

  const handleSubmit = async () => {
    if (!form.description.trim()) return toast.error(t('user.complaints.description') + ' ' + (isEn ? 'required' : 'requis'))
    setSubmitting(true)
    try {
      await complaintApi.create(form)
      toast.success(t('user.complaints.success'))
      setModal(false)
      setForm({ type: 'other', description: '' })
      loadData()
    } catch (err) {
      toast.error(err.response?.data?.message || t('common.serverError'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fade-up">
      <PageHeader title={t('user.complaints.title')} subtitle={t('user.complaints.subtitle')}
        action={<button onClick={() => setModal(true)} className="btn-primary"><Plus size={16} />{t('user.complaints.newComplaint')}</button>} />
      {loading ? <PageLoader /> : complaints.length === 0 ? (
        <EmptyState icon={MessageSquare} title={t('user.complaints.noComplaints')} description={t('user.complaints.noComplaintsDesc')}
          action={<button onClick={() => setModal(true)} className="btn-primary"><Plus size={16} />{t('user.complaints.newComplaint')}</button>} />
      ) : (
        <div className="flex flex-col gap-3">
          {complaints.map(c => (
            <div key={c.uuid} className="card p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <p className="font-semibold text-gray-800">{TYPES.find(tp => tp.value === c.type)?.label || c.type}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{format(new Date(c.created_at), 'dd MMM yyyy', { locale: dateLocale })}</p>
                </div>
                <StatusBadge status={c.status} />
              </div>
              <p className="text-sm text-gray-500">{c.description}</p>
              {c.admin_response && (
                <div className="mt-3 pt-3 border-t border-gray-100 bg-[#E8F5EE] rounded-xl p-3">
                  <p className="text-xs font-semibold text-[#1A8A3C] mb-1">{t('user.complaints.adminResponse')} :</p>
                  <p className="text-sm text-gray-600">{c.admin_response}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modal} onClose={() => setModal(false)} title={t('user.complaints.newComplaint')}>
        <div className="flex flex-col gap-4">
          <div>
            <label className="label">{t('user.complaints.type')}</label>
            <select className="input" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
              {TYPES.map(tp => <option key={tp.value} value={tp.value}>{tp.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">{t('user.complaints.description')} <span className="text-red-500">*</span></label>
            <textarea className="input resize-none min-h-[120px]" placeholder={t('user.complaints.descPlaceholder')}
              value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setModal(false)} className="btn-ghost flex-1 justify-center border border-gray-200">{t('common.cancel')}</button>
            <button onClick={handleSubmit} disabled={submitting} className="btn-primary flex-1 justify-center">
              {submitting ? t('user.complaints.submitting') : t('user.complaints.submit')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
