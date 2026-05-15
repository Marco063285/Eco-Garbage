import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Leaf, ArrowLeft, Mail } from 'lucide-react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { authApi } from '../../services/api'
import { Spinner } from '../../components/common'

export default function ForgotPasswordPage() {
  const { t, i18n } = useTranslation()
  const isEn = i18n.language?.startsWith('en')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email) return toast.error(isEn ? 'Enter your email address' : 'Entrez votre adresse email')
    setLoading(true)
    try {
      await authApi.forgotPassword(email)
      setSent(true)
    } catch (err) {
      toast.error(err.response?.data?.message || t('common.serverError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7faf8] p-6">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 font-display font-bold text-xl mb-8 justify-center">
          <div className="w-9 h-9 bg-[#1A8A3C] rounded-xl flex items-center justify-center">
            <Leaf size={18} className="text-white" />
          </div>
          Eco<span className="text-[#1A8A3C]">Garbage</span>
        </Link>

        <div className="bg-white rounded-3xl shadow-green-lg p-8">
          {sent ? (
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-[#E8F5EE] rounded-full flex items-center justify-center">
                  <Mail size={32} className="text-[#1A8A3C]" />
                </div>
              </div>
              <h2 className="text-2xl font-display font-bold mb-2">
                {isEn ? 'Email sent' : 'Email envoyé'}
              </h2>
              <p className="text-gray-500 text-sm leading-relaxed mb-6">
                {isEn
                  ? `If an account exists with ${email}, you will receive a reset link. Check your spam.`
                  : `Si un compte existe avec ${email}, vous recevrez un lien de réinitialisation. Vérifiez vos spams.`}
              </p>
              <Link to="/login" className="btn-primary w-full justify-center py-3">
                {t('auth.forgotPassword.backToLogin')}
              </Link>
            </div>
          ) : (
            <>
              <Link to="/login" className="flex items-center gap-1 text-sm text-gray-400 mb-6 hover:text-[#1A8A3C]">
                <ArrowLeft size={14} />{isEn ? 'Back' : 'Retour'}
              </Link>
              <h1 className="text-2xl font-display font-bold mb-1">{t('auth.forgotPassword.title')}</h1>
              <p className="text-sm text-gray-400 mb-8">{t('auth.forgotPassword.desc')}</p>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="label">{t('auth.login.email')}</label>
                  <input type="email" className="input" placeholder={t('auth.login.emailPlaceholder')}
                    value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3.5">
                  {loading ? <Spinner size="sm" /> : <Mail size={16} />}
                  {loading ? (isEn ? 'Sending...' : 'Envoi...') : t('auth.forgotPassword.submit')}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
