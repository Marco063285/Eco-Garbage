import { useState, useEffect } from 'react'
import { Plus, Edit2, Tag } from 'lucide-react'
import getCategoryIcon from '../../utils/categoryIcons'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { adminApi } from '../../services/api'
import { PageHeader, PageLoader, EmptyState, Modal } from '../../components/common'

const EMPTY_FORM = { name: '', description: '', icon: 'trash', base_price: '', is_hazardous: false, is_recyclable: false, is_active: true }

export default function AdminCategories() {
  const { t, i18n } = useTranslation()
  const isEn = i18n.language?.startsWith('en')
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const loadData = () => {
    adminApi.categories().then(r => setCategories(r.data.data || [])).finally(() => setLoading(false))
  }
  useEffect(() => { loadData() }, [])

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setModal(true) }
  const openEdit = (cat) => { setEditing(cat); setForm({ ...cat }); setModal(true) }

  const handleSave = async () => {
    if (!form.name || !form.base_price) return toast.error(isEn ? 'Name and price required' : 'Nom et prix requis')
    setSaving(true)
    try {
      if (editing) {
        await adminApi.updateCategory(editing.id, form)
        toast.success(t('admin.categories.updateSuccess'))
      } else {
        await adminApi.createCategory(form)
        toast.success(t('admin.categories.createSuccess'))
      }
      setModal(false)
      loadData()
    } catch (err) {
      toast.error(err.response?.data?.message || t('common.serverError'))
    } finally {
      setSaving(false)
    }
  }

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="fade-up">
      <PageHeader title={t('admin.categories.title')} subtitle={`${categories.length} ${isEn ? 'category(ies)' : 'catégorie(s)'}`}
        action={<button onClick={openCreate} className="btn-primary"><Plus size={16} />{t('admin.categories.add')}</button>} />

      {loading ? <PageLoader /> : categories.length === 0 ? (
        <EmptyState icon={Tag} title={t('admin.categories.noCategories')} description={isEn ? 'Create your first waste category.' : 'Créez votre première catégorie de déchets.'}
          action={<button onClick={openCreate} className="btn-primary"><Plus size={16} />{t('common.create')}</button>} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map(cat => (
            <div key={cat.id} className={`card p-5 ${!cat.is_active ? 'opacity-50' : ''}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-[#E8F5EE] rounded-xl flex items-center justify-center text-lg">{getCategoryIcon(cat.icon)}</div>
                <button onClick={() => openEdit(cat)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                  <Edit2 size={14} />
                </button>
              </div>
              <h3 className="font-display font-bold text-gray-900 mb-1">{cat.name}</h3>
              <p className="text-xs text-gray-400 mb-3 line-clamp-2">{cat.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[#1A8A3C]">{parseFloat(cat.base_price).toLocaleString()} FCFA</span>
                <div className="flex gap-1.5">
                  {cat.is_hazardous && <span className="badge bg-red-100 text-red-600 text-[10px]">?? {t('admin.categories.hazardous')}</span>}
                  {cat.is_recyclable && <span className="badge bg-green-100 text-green-600 text-[10px]">??</span>}
                  {!cat.is_active && <span className="badge bg-gray-100 text-gray-500 text-[10px]">{t('common.inactive')}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modal} onClose={() => setModal(false)} title={editing ? (isEn ? 'Edit category' : 'Modifier la catégorie') : t('admin.categories.add')}>
        <div className="flex flex-col gap-4">
          <div>
            <label className="label">{t('admin.categories.name')} <span className="text-red-500">*</span></label>
            <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder={isEn ? 'e.g. Organic waste' : 'Ex: Déchets organiques'} />
          </div>
          <div>
            <label className="label">{isEn ? 'Description' : 'Description'}</label>
            <textarea className="input resize-none" rows={2} value={form.description} onChange={e => set('description', e.target.value)} />
          </div>
          <div>
            <label className="label">{t('admin.categories.basePrice')} <span className="text-red-500">*</span></label>
            <input type="number" className="input" value={form.base_price} onChange={e => set('base_price', e.target.value)} placeholder="500" />
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" className="accent-[#1A8A3C]" checked={form.is_hazardous} onChange={e => set('is_hazardous', e.target.checked)} />
              {t('admin.categories.hazardous')}
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" className="accent-[#1A8A3C]" checked={form.is_recyclable} onChange={e => set('is_recyclable', e.target.checked)} />
              {t('admin.categories.recyclable')}
            </label>
            {editing && (
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" className="accent-[#1A8A3C]" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} />
                {t('admin.categories.active')}
              </label>
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setModal(false)} className="btn-ghost flex-1 justify-center border border-gray-200">{t('common.cancel')}</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center">
              {saving ? t('user.profile.saving') : editing ? t('common.edit') : t('common.create')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
