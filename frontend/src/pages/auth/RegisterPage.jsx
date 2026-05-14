import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Leaf, Eye, EyeOff, MailCheck, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { authApi } from '../../services/api'
import { Spinner } from '../../components/common'
import { isValidCmPhone, formatCmPhone, normalizeCmPhone } from '../../utils/phone'

export default function RegisterPage() {
  const { t, i18n } = useTranslation()
  const isEn = i18n.language?.startsWith('en')
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '', role: 'user', national_id_number: '' })
  const [idFront, setIdFront] = useState(null)
  const [idBack, setIdBack] = useState(null)
  const [selfiePhoto, setSelfiePhoto] = useState(null)
  const [selfieVideo, setSelfieVideo] = useState(null)
  const [phoneError, setPhoneError] = useState('')
  const [idError, setIdError] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [registered, setRegistered] = useState(false)
  const [autoVerified, setAutoVerified] = useState(false)

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.password)
      return toast.error(isEn ? 'Required fields missing' : 'Champs obligatoires manquants')
    if (form.phone && !isValidCmPhone(form.phone))
      return toast.error('Numéro de téléphone camerounais invalide')
    if (form.password.length < 6)
      return toast.error(isEn ? 'Password too short (min 6 chars)' : 'Mot de passe trop court (min 6 caractères)')
    if (form.password !== form.confirm)
      return toast.error(isEn ? "Passwords don't match" : 'Les mots de passe ne correspondent pas')
    setLoading(true)
    try {
      let res
      if (form.role === 'collector') {
        if (!idFront || !idBack || !selfiePhoto) {
          throw new Error('Les collecteurs doivent fournir les pièces d identité et un selfie.')
        }
        if (!form.national_id_number || idError) {
          throw new Error('Numéro de carte d\'identité requis et valide.')
        }
        const formData = new FormData()
        formData.append('name', form.name)
        formData.append('email', form.email)
        formData.append('phone', normalizeCmPhone(form.phone))
        formData.append('password', form.password)
        formData.append('role', form.role)
        formData.append('national_id_number', form.national_id_number)
        formData.append('id_front', idFront)
        formData.append('id_back', idBack)
        formData.append('selfie_photo', selfiePhoto)
        if (selfieVideo) formData.append('selfie_video', selfieVideo)
        res = await authApi.register(formData)
      } else {
        res = await authApi.register({ name: form.name, email: form.email, phone: normalizeCmPhone(form.phone), password: form.password, role: form.role })
      }
      if (res.data?.autoVerified) {
        setAutoVerified(true)
        toast.success(t('auth.register.success'))
        setTimeout(() => navigate('/login'), 2000)
      }
      setRegistered(true)
    } catch (err) {
<<<<<<< HEAD
      toast.error(err.response?.data?.message || t('common.serverError'))
=======
      toast.error(err.response?.data?.message || err.message || 'Erreur lors de l inscription')
>>>>>>> a2e4304 (......./.)
    } finally {
      setLoading(false)
    }
  }

  const roles = [
    { value: 'user',      emoji: '👤', label: isEn ? 'Individual / Business' : 'Particulier / Entreprise' },
    { value: 'collector', emoji: '🚛', label: isEn ? 'Collector'              : 'Collecteur' },
  ]

  const stats = [
    ['12 000+', isEn ? 'Users'       : 'Utilisateurs'],
    ['500+',    isEn ? 'Collectors'  : 'Collecteurs'],
    ['48 000+', isEn ? 'Collections' : 'Collectes'],
    ['98%',     isEn ? 'Satisfaction': 'Satisfaction'],
  ]

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      {/* Visual */}
      <div className="hidden md:flex flex-col items-center justify-center bg-[#1A8A3C] relative overflow-hidden p-12">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="relative z-10 text-center max-w-sm">
          <div className="text-7xl mb-8">♻️</div>
          <h2 className="text-3xl font-display font-bold text-white mb-4">
            {isEn ? 'Join the green revolution' : 'Rejoignez la révolution verte'}
          </h2>
          <p className="text-white/70 leading-relaxed">
            {isEn
              ? 'Thousands of people already trust EcoGarbage for responsible waste management.'
              : "Des milliers de personnes font déjà confiance à EcoGarbage pour gérer leurs déchets de façon responsable."}
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3">
            {stats.map(([v, l]) => (
              <div key={l} className="bg-white/10 rounded-xl p-4 text-white text-center">
                <p className="font-display font-bold text-2xl">{v}</p>
                <p className="text-xs text-white/60 mt-1">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form / Success */}
      <div className="flex items-center justify-center p-6 bg-[#f7faf8] overflow-y-auto">
        <div className="w-full max-w-[440px] py-8">
          <Link to="/" className="flex md:hidden items-center gap-2 font-display font-bold text-xl mb-8">
            <div className="w-9 h-9 bg-[#1A8A3C] rounded-xl flex items-center justify-center">
              <Leaf size={18} className="text-white" />
            </div>
            Eco<span className="text-[#1A8A3C]">Garbage</span>
          </Link>

          {registered ? (
            <div className="bg-white rounded-3xl shadow-green-lg p-8 text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-[#E8F5EE] rounded-full flex items-center justify-center">
                  {autoVerified ? <CheckCircle size={32} className="text-[#1A8A3C]" /> : <MailCheck size={32} className="text-[#1A8A3C]" />}
                </div>
              </div>
              <h2 className="text-2xl font-display font-bold mb-2">
                {autoVerified
                  ? (isEn ? 'Account created!' : 'Compte créé avec succès !')
                  : (isEn ? 'Check your email' : 'Vérifiez votre email')}
              </h2>
              {autoVerified ? (
                <p className="text-gray-500 text-sm leading-relaxed mb-6">
                  {isEn ? 'Your account' : 'Votre compte'} <strong className="text-gray-700">{form.email}</strong> {isEn ? 'is active.' : 'est actif.'}<br />
                  {isEn ? 'Redirecting to login...' : 'Vous allez être redirigé vers la page de connexion...'}
                </p>
              ) : (
                <>
                  <p className="text-gray-500 text-sm leading-relaxed mb-6">
                    {isEn ? 'A verification link was sent to' : 'Un lien de vérification a été envoyé à'}{' '}
                    <strong className="text-gray-700">{form.email}</strong>.<br />
                    {isEn ? 'Click the link to activate your account.' : "Cliquez sur le lien dans l'email pour activer votre compte."}
                  </p>
                  <p className="text-xs text-gray-400 mb-4">
                    {isEn ? 'Link expires in 24 hours. Check your spam folder.' : 'Le lien expire dans 24 heures. Vérifiez vos spams.'}
                  </p>
                </>
              )}
              <Link to="/login" className="btn-primary w-full justify-center py-3">
                {t('auth.login.submit')}
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-3xl shadow-green-lg p-8">
              <h1 className="text-2xl font-display font-bold mb-1">{t('auth.register.title')}</h1>
              <p className="text-sm text-gray-400 mb-6">
                {t('auth.register.hasAccount')}{' '}
                <Link to="/login" className="text-[#1A8A3C] font-semibold hover:underline">{t('auth.register.login')}</Link>
              </p>

<<<<<<< HEAD
              <div className="grid grid-cols-2 gap-3 mb-6">
                {roles.map(r => (
                  <button key={r.value} type="button" onClick={() => set('role', r.value)}
                    className={`p-4 rounded-xl border-2 text-center transition-all text-sm font-medium ${form.role === r.value ? 'border-[#1A8A3C] bg-[#E8F5EE] text-[#1A8A3C]' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                    <div className="text-2xl mb-1">{r.emoji}</div>
                    {r.label}
=======
            {/* Role selector */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                { value: 'user', emoji: '👤', label: 'Particulier / Entreprise' },
                { value: 'collector', emoji: '🚛', label: 'Collecteur' },
              ].map(r => (
                <button key={r.value} type="button"
                  onClick={() => set('role', r.value)}
                  className={`p-4 rounded-xl border-2 text-center transition-all text-sm font-medium ${form.role === r.value ? 'border-[#1A8A3C] bg-[#E8F5EE] text-[#1A8A3C]' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                  <div className="text-2xl mb-1">{r.emoji}</div>
                  {r.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Nom complet <span className="text-red-500">*</span></label>
                <input className="input" placeholder="Jean Dupont" value={form.name} onChange={e => set('name', e.target.value)} />
              </div>
              <div>
                <label className="label">Email <span className="text-red-500">*</span></label>
                <input type="email" className="input" placeholder="votre@email.com" value={form.email} onChange={e => set('email', e.target.value)} />
              </div>
              <div>
                <label className="label">Téléphone</label>
                <input type="tel" className={`input ${phoneError ? 'border-red-400 focus:ring-red-200' : ''}`}
                  placeholder="+237 6 XX XX XX XX"
                  value={form.phone}
                  onChange={e => {
                    const formatted = formatCmPhone(e.target.value)
                    set('phone', formatted)
                    setPhoneError(formatted.replace(/[\s]/g, '').length > 4 && !isValidCmPhone(formatted) ? 'Numéro invalide (ex: +237 6 XX XX XX XX)' : '')
                  }} />
                {phoneError && <p className="text-xs text-red-500 mt-1">{phoneError}</p>}
                <p className="text-xs text-gray-400 mt-1">Format : +237 suivi de 9 chiffres (6... ou 2...)</p>
              </div>
              {form.role === 'collector' && (
                <div>
                  <label className="label">Numéro de carte d'identité nationale <span className="text-red-500">*</span></label>
                  <input type="text" className={`input ${idError ? 'border-red-400 focus:ring-red-200' : ''}`}
                    placeholder="Ex: ABC123456789"
                    value={form.national_id_number}
                    onChange={e => {
                      const value = e.target.value.toUpperCase()
                      set('national_id_number', value)
                      if (value && (value.length < 8 || value.length > 20 || !/^[A-Z0-9]+$/.test(value))) {
                        setIdError('Format invalide (8-20 caractères, lettres et chiffres uniquement)')
                      } else {
                        setIdError('')
                      }
                    }} />
                  {idError && <p className="text-xs text-red-500 mt-1">{idError}</p>}
                  <p className="text-xs text-gray-400 mt-1">Entrez le numéro exact de votre carte d'identité ou passeport</p>
                </div>
              )}
              {form.role === 'collector' && (
                <div className="space-y-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm font-semibold text-gray-800">Documents collecteur</p>
                  <p className="text-xs text-gray-500">Téléchargez les deux faces de votre pièce d'identité et un selfie clair.</p>
                  <div>
                    <label className="label">Carte d'identité - Recto <span className="text-red-500">*</span></label>
                    <input type="file" accept="image/*" className="input" onChange={e => setIdFront(e.target.files?.[0] || null)} />
                  </div>
                  <div>
                    <label className="label">Carte d'identité - Verso <span className="text-red-500">*</span></label>
                    <input type="file" accept="image/*" className="input" onChange={e => setIdBack(e.target.files?.[0] || null)} />
                  </div>
                  <div>
                    <label className="label">Selfie (photo de présence) <span className="text-red-500">*</span></label>
                    <input type="file" accept="image/*" className="input" onChange={e => setSelfiePhoto(e.target.files?.[0] || null)} />
                  </div>
                  <div>
                    <label className="label">Vidéo du visage (optionnel)</label>
                    <input type="file" accept="video/*" className="input" onChange={e => setSelfieVideo(e.target.files?.[0] || null)} />
                  </div>
                </div>
              )}
              <div>
                <label className="label">Mot de passe <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} className="input pr-10" placeholder="Minimum 6 caractères"
                    value={form.password} onChange={e => set('password', e.target.value)} />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" onClick={() => setShowPw(!showPw)}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
>>>>>>> a2e4304 (......./.)
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">{t('user.profile.name')} <span className="text-red-500">*</span></label>
                  <input className="input" placeholder={isEn ? 'John Doe' : 'Jean Dupont'} value={form.name} onChange={e => set('name', e.target.value)} />
                </div>
                <div>
                  <label className="label">{t('auth.login.email')} <span className="text-red-500">*</span></label>
                  <input type="email" className="input" placeholder={t('auth.login.emailPlaceholder')} value={form.email} onChange={e => set('email', e.target.value)} />
                </div>
                <div>
                  <label className="label">{t('user.profile.phone')}</label>
                  <input type="tel" className={`input ${phoneError ? 'border-red-400 focus:ring-red-200' : ''}`}
                    placeholder="+237 6 XX XX XX XX"
                    value={form.phone}
                    onChange={e => {
                      const formatted = formatCmPhone(e.target.value)
                      set('phone', formatted)
                      setPhoneError(formatted.replace(/[\s]/g, '').length > 4 && !isValidCmPhone(formatted) ? (isEn ? 'Invalid number' : 'Numéro invalide') : '')
                    }} />
                  {phoneError && <p className="text-xs text-red-500 mt-1">{phoneError}</p>}
                </div>
                <div>
                  <label className="label">{t('auth.login.password')} <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input type={showPw ? 'text' : 'password'} className="input pr-10"
                      placeholder={isEn ? 'Minimum 6 characters' : 'Minimum 6 caractères'}
                      value={form.password} onChange={e => set('password', e.target.value)} />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" onClick={() => setShowPw(!showPw)}>
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="label">{t('user.profile.confirmPassword')} <span className="text-red-500">*</span></label>
                  <input type="password" className="input"
                    placeholder={isEn ? 'Repeat password' : 'Répétez le mot de passe'}
                    value={form.confirm} onChange={e => set('confirm', e.target.value)} />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3.5 mt-2">
                  {loading ? <Spinner size="sm" /> : null}
                  {loading ? t('auth.register.submitting') : t('auth.register.submit')}
                </button>
              </form>

              <p className="text-xs text-gray-400 text-center mt-4">
                {isEn ? 'By signing up, you agree to our ' : "En vous inscrivant, vous acceptez nos "}
                <span className="text-[#1A8A3C] cursor-pointer hover:underline">
                  {isEn ? 'terms of service' : "conditions d'utilisation"}
                </span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
