import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Leaf, CheckCircle, XCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Spinner } from '../../components/common'
import { authApi } from '../../services/api'

export default function VerifyEmailPage() {
  const { t, i18n } = useTranslation()
  const isEn = i18n.language?.startsWith('en')
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage(isEn ? 'Invalid verification link.' : 'Lien de vérification invalide.')
      return
    }

    authApi.verifyEmail(token)
      .then(({ data }) => {
        setStatus('success')
        setMessage(data.message || t('auth.verifyEmail.success'))
      })
      .catch(err => {
        setStatus('error')
        setMessage(err.response?.data?.message || t('auth.verifyEmail.error'))
      })
  }, [token])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7faf8] p-6">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-green-lg p-10 text-center">
        <Link to="/" className="inline-flex items-center gap-2 font-display font-bold text-xl mb-8">
          <div className="w-9 h-9 bg-[#1A8A3C] rounded-xl flex items-center justify-center">
            <Leaf size={18} className="text-white" />
          </div>
          Eco<span className="text-[#1A8A3C]">Garbage</span>
        </Link>

        {status === 'loading' && (
          <>
            <div className="flex justify-center mb-4"><Spinner /></div>
            <p className="text-gray-500">{t('auth.verifyEmail.verifying')}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-[#E8F5EE] rounded-full flex items-center justify-center">
                <CheckCircle size={36} className="text-[#1A8A3C]" />
              </div>
            </div>
            <h2 className="text-2xl font-display font-bold mb-2">
              {isEn ? 'Email verified!' : 'Email vérifié !'}
            </h2>
            <p className="text-gray-500 text-sm mb-6">{message}</p>
            <Link to="/login" className="btn-primary w-full justify-center py-3">
              {t('auth.login.submit')}
            </Link>
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
            <p className="text-gray-500 text-sm mb-6">{message}</p>
            <Link to="/register" className="btn-primary w-full justify-center py-3">
              {isEn ? 'Create a new account' : 'Créer un nouveau compte'}
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
