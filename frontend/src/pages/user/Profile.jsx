import { useState } from 'react'
import { User, Lock, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { authApi } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { PageHeader, Spinner } from '../../components/common'
import { isValidCmPhone, formatCmPhone, normalizeCmPhone } from '../../utils/phone'

export default function Profile() {
  const { t } = useTranslation()
  const { user, updateUser } = useAuth()
  const [tab, setTab] = useState('info')
  const [info, setInfo] = useState({ name: user?.name || '', phone: user?.phone ? formatCmPhone(user.phone) : '', address: user?.address || '' })
  const [phoneError, setPhoneError] = useState('')
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [saving, setSaving] = useState(false)

  const handleSaveInfo = async (e) => {
    e.preventDefault()
    if (!info.name) return toast.error(t('user.profile.name') + ' requis')
    if (info.phone && !isValidCmPhone(info.phone)) return toast.error('Numéro de téléphone camerounais invalide')
    setSaving(true)
    try {
      const normalized = normalizeCmPhone(info.phone)
      await authApi.updateProfile({ ...info, phone: normalized })
      updateUser({ name: info.name, phone: normalized, address: info.address })
      toast.success(t('user.profile.profileSuccess'))
    } catch (err) {
      toast.error(err.response?.data?.message || t('common.serverError'))
    } finally {
      setSaving(false)
    }
  }

  const handleChangePw = async (e) => {
    e.preventDefault()
    if (!pw.currentPassword || !pw.newPassword) return toast.error('Tous les champs sont requis')
    if (pw.newPassword !== pw.confirm) return toast.error('Les mots de passe ne correspondent pas')
    if (pw.newPassword.length < 6) return toast.error('Mot de passe trop court')
    setSaving(true)
    try {
      await authApi.changePassword({ currentPassword: pw.currentPassword, newPassword: pw.newPassword })
      toast.success(t('user.profile.passwordSuccess'))
      setPw({ currentPassword: '', newPassword: '', confirm: '' })
    } catch (err) {
      toast.error(err.response?.data?.message || t('common.serverError'))
    } finally {
      setSaving(false)
    }
  }

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'

  return (
    <div className="fade-up max-w-xl mx-auto">
      <PageHeader title={t('user.profile.title')} subtitle={t('user.profile.subtitle')} />

      {/* Avatar */}
      <div className="card p-6 mb-6 flex items-center gap-4">
        <div className="w-16 h-16 bg-[#1A8A3C] rounded-2xl flex items-center justify-center text-white font-display font-bold text-2xl">
          {initials}
        </div>
        <div>
          <p className="text-lg font-display font-bold">{user?.name}</p>
          <p className="text-sm text-[#1A8A3C] font-medium">{t(`roles.${user?.role}`)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{user?.email}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-xl">
        {[
          ['info',     User, t('user.profile.title').split(' ')[1] || 'Info'],
          ['password', Lock, t('user.profile.changePassword')],
        ].map(([id, Icon, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all
              ${tab === id
                ? 'bg-white text-[#1A8A3C] shadow-sm'
                : 'text-gray-500'}`}>
            <Icon size={15} />{label}
          </button>
        ))}
      </div>

      {tab === 'info' && (
        <form onSubmit={handleSaveInfo} className="card p-6 flex flex-col gap-5">
          <div>
            <label className="label">{t('user.profile.name')} <span className="text-red-500">*</span></label>
            <input className="input" value={info.name} onChange={e => setInfo(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div>
            <label className="label">{t('user.profile.email')}</label>
            <input className="input opacity-60 cursor-not-allowed" value={user?.email} disabled />
          </div>
          <div>
            <label className="label">{t('user.profile.phone')}</label>
            <input className={`input ${phoneError ? 'border-red-400 focus:ring-red-200' : ''}`}
              placeholder="+237 6 XX XX XX XX"
              value={info.phone}
              onChange={e => {
                const formatted = formatCmPhone(e.target.value)
                setInfo(p => ({ ...p, phone: formatted }))
                setPhoneError(formatted.replace(/[\s]/g, '').length > 4 && !isValidCmPhone(formatted) ? 'Numéro invalide' : '')
              }} />
            {phoneError && <p className="text-xs text-red-500 mt-1">{phoneError}</p>}
          </div>
          <div>
            <label className="label">{t('user.profile.address')}</label>
            <textarea className="input resize-none" rows={2} value={info.address} onChange={e => setInfo(p => ({ ...p, address: e.target.value }))} />
          </div>
          <button type="submit" disabled={saving} className="btn-primary justify-center">
            {saving ? <Spinner size="sm" /> : <Save size={16} />}
            {saving ? t('user.profile.saving') : t('user.profile.saveProfile')}
          </button>
        </form>
      )}

      {tab === 'password' && (
        <form onSubmit={handleChangePw} className="card p-6 flex flex-col gap-5">
          <div>
            <label className="label">{t('user.profile.currentPassword')}</label>
            <input type="password" className="input" value={pw.currentPassword} onChange={e => setPw(p => ({ ...p, currentPassword: e.target.value }))} />
          </div>
          <div>
            <label className="label">{t('user.profile.newPassword')}</label>
            <input type="password" className="input" value={pw.newPassword} onChange={e => setPw(p => ({ ...p, newPassword: e.target.value }))} />
          </div>
          <div>
            <label className="label">{t('user.profile.confirmPassword')}</label>
            <input type="password" className="input" value={pw.confirm} onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))} />
          </div>
          <button type="submit" disabled={saving} className="btn-primary justify-center">
            {saving ? <Spinner size="sm" /> : <Lock size={16} />}
            {saving ? t('user.profile.saving') : t('user.profile.savePassword')}
          </button>
        </form>
      )}
    </div>
  )
}
