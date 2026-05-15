import { useState } from 'react'
import { flushSync } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { Leaf, Eye, EyeOff, LogIn } from 'lucide-react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { authApi } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { Spinner } from '../../components/common'

export default function LoginPage() {
  const { t } = useTranslation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [unverified, setUnverified] = useState(false)
  const [resending, setResending] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.email || !form.password) return toast.error(t('auth.login.fillFields'))
    setUnverified(false)
    setLoading(true)
    try {
      const { data } = await authApi.login(form)
      flushSync(() => { login(data.data.token, data.data.user) })
      toast.success(t('auth.login.success'))
      const role = data.data.user.role
      navigate(role === 'admin' ? '/admin' : role === 'collector' ? '/collector' : '/dashboard', { replace: true })
    } catch (err) {
      if (err.response?.data?.code === 'EMAIL_NOT_VERIFIED') {
        setUnverified(true)
      } else {
        toast.error(err.response?.data?.message || t('common.serverError'))
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setResending(true)
    try {
      await authApi.resendVerification(form.email)
      toast.success(t('auth.login.resendSuccess'))
      setUnverified(false)
    } catch (err) {
      toast.error(err.response?.data?.message || t('common.serverError'))
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      {/* Visual side */}
      <div className="hidden md:flex flex-col items-center justify-center bg-[#1A8A3C] relative overflow-hidden p-12">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="relative z-10 text-center max-w-sm">
          <div className="text-7xl mb-8">??</div>
          <Link to="/" className="flex items-center justify-center gap-2.5 font-display font-bold text-2xl text-white mb-6">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Leaf size={20} className="text-white" />
            </div>
            EcoGarbage
          </Link>
          <h2 className="text-3xl font-display font-bold text-white mb-4">{t('auth.login.welcomeBack')}</h2>
          <p className="text-white/70 leading-relaxed">{t('auth.login.welcomeDesc')}</p>
          <div className="mt-8 flex flex-col gap-3">
            {t('auth.login.features', { returnObjects: true }).map(f => (
              <div key={f} className="flex items-center gap-3 bg-white/10 px-4 py-3 rounded-xl text-sm text-white">
                <span className="text-green-300">?</span>{f}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form side */}
      <div className="flex items-center justify-center p-6 bg-[#f7faf8] min-h-screen">
        <div className="w-full max-w-[420px]">
          {/* Mobile brand */}
          <Link to="/" className="flex md:hidden items-center gap-2 font-display font-bold text-xl mb-8">
            <div className="w-9 h-9 bg-[#1A8A3C] rounded-xl flex items-center justify-center">
              <Leaf size={18} className="text-white" />
            </div>
            Eco<span className="text-[#1A8A3C]">Garbage</span>
          </Link>

          <div className="bg-white rounded-3xl shadow-green-lg p-8">
            <h1 className="text-2xl font-display font-bold mb-1">{t('auth.login.title')}</h1>
            <p className="text-sm text-gray-400 mb-8">
              {t('auth.login.noAccount')}{' '}
              <Link to="/register" className="text-[#1A8A3C] font-semibold hover:underline">{t('auth.login.register')}</Link>
            </p>

            {/* Email not verified banner */}
            {unverified && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm">
                <p className="font-semibold text-amber-800 mb-1">{t('auth.login.unverifiedTitle')}</p>
                <p className="text-amber-700 mb-3">{t('auth.login.unverifiedDesc')}</p>
                <button type="button" onClick={handleResend} disabled={resending}
                  className="text-[#1A8A3C] font-semibold text-xs hover:underline disabled:opacity-50">
                  {resending ? t('auth.login.resending') : t('auth.login.resend')}
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="label">{t('auth.login.email')}</label>
                <input type="email" className="input" placeholder={t('auth.login.emailPlaceholder')}
                  value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div>
                <label className="label flex justify-between">
                  {t('auth.login.password')}
                  <Link to="/forgot-password" className="text-[#1A8A3C] cursor-pointer text-xs font-normal hover:underline">
                    {t('auth.login.forgotPassword')}
                  </Link>
                </label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} className="input pr-10" placeholder="••••••••"
                    value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                    onClick={() => setShowPw(!showPw)}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3.5">
                {loading ? <Spinner size="sm" /> : <LogIn size={16} />}
                {loading ? t('auth.login.submitting') : t('auth.login.submit')}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
