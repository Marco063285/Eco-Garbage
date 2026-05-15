import { useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Leaf, Lock, CheckCircle, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { authApi } from '../../services/api'
import { Spinner } from '../../components/common'

export default function ResetPasswordPage() {
  const { t, i18n } = useTranslation()
  const isEn = i18n.language?.startsWith('en')
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(token ? 'form' : 'error')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!password || password.length < 8)
      return toast.error(isEn ? 'Password must be at least 8 characters' : 'Le mot de passe doit contenir au moins 8 caractères')
    if (password !== confirm)
      return toast.error(isEn ? "Passwords don't match" : 'Les mots de passe ne correspondent pas')
    setLoading(true)
    try {
      await authApi.resetPassword({ token, password })
      setStatus('success')
    } catch (err) {
      if (err.response?.data?.message?.includes('expire')) setStatus('error')
      toast.error(err.response?.data?.message || t('common.serverError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7faf8] p-6">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-green-lg p-10 text-center">
        <Link to="/" className="inline-flex items-center gap-2 font-display font-bold text-xl mb-8">
          <div className="w-9 h-9 bg-[#1A8A3C] rounded-xl flex items-center justify-center">
            <Leaf size={18} className="text-white" />
          </div>
          Eco<span className="text-[#1A8A3C]">Garbage</span>
        </Link>

        {status === 'success' && (
          <>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-[#E8F5EE] rounded-full flex items-center justify-center">
                <CheckCircle size={36} className="text-[#1A8A3C]" />
              </div>
            </div>
            <h2 className="text-2xl font-display font-bold mb-2">
              {t('auth.resetPassword.success')}
            </h2>
            <p className="text-gray-500 text-sm mb-6">
              {isEn ? 'You can now log in with your new password.' : 'Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.'}
            </p>
            <Link to="/login" className="btn-primary w-full justify-center py-3">{t('auth.login.submit')}</Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
                <XCircle size={36} className="text-red-500" />
              </div>
            </div>
            <h2 className="text-2xl font-display font-bold mb-2">
              {isEn ? 'Invalid link' : 'Lien invalide'}
            </h2>
            <p className="text-gray-500 text-sm mb-6">
              {isEn ? 'This reset link is invalid or has expired.' : 'Ce lien de réinitialisation est invalide ou a expiré.'}
            </p>
            <Link to="/forgot-password" className="btn-primary w-full justify-center py-3">
              {isEn ? 'Request a new link' : 'Demander un nouveau lien'}
            </Link>
          </>
        )}

        {status === 'form' && (
          <>
            <h2 className="text-2xl font-display font-bold mb-2">{t('auth.resetPassword.title')}</h2>
            <p className="text-gray-500 text-sm mb-6">
              {isEn ? 'Choose a strong new password.' : 'Choisissez un nouveau mot de passe sécurisé.'}
            </p>
            <form onSubmit={handleSubmit} className="space-y-5 text-left">
              <div>
                <label className="label">{t('user.profile.newPassword')}</label>
                <input type="password" className="input" placeholder={isEn ? 'Min. 8 characters' : 'Min. 8 caractères'}
                  value={password} onChange={e => setPassword(e.target.value)} />
                <p className="text-xs text-gray-400 mt-1">
                  {isEn ? 'Must contain uppercase, lowercase and a digit' : 'Doit contenir une majuscule, une minuscule et un chiffre'}
                </p>
              </div>
              <div>
                <label className="label">{t('user.profile.confirmPassword')}</label>
                <input type="password" className="input" placeholder={isEn ? 'Retype password' : 'Retapez le mot de passe'}
                  value={confirm} onChange={e => setConfirm(e.target.value)} />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3.5">
                {loading ? <Spinner size="sm" /> : <Lock size={16} />}
                {loading ? (isEn ? 'Resetting...' : 'Réinitialisation...') : t('auth.resetPassword.submit')}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
