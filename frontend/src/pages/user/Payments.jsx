import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { paymentApi } from '../../services/api'
import { PageHeader, PageLoader, EmptyState, StatusBadge } from '../../components/common'
import { CreditCard } from 'lucide-react'
import { format } from 'date-fns'
import { fr, enUS } from 'date-fns/locale'

export default function Payments() {
  const { t, i18n } = useTranslation()
  const dateLocale = i18n.language?.startsWith('en') ? enUS : fr
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    paymentApi.list().then(r => setPayments(r.data.data || [])).finally(() => setLoading(false))
  }, [])

  const total = payments.filter(p => p.status === 'completed').reduce((s, p) => s + parseFloat(p.amount || 0), 0)

  return (
    <div className="fade-up">
      <PageHeader title={t('user.payments.title')} subtitle={t('user.payments.subtitle')} />
      {loading ? <PageLoader /> : payments.length === 0 ? (
        <EmptyState icon={CreditCard} title={t('user.payments.noPayments')} description={t('user.payments.noPaymentsDesc')} />
      ) : (
        <>
          <div className="bg-[#1A8A3C] rounded-2xl p-6 text-white mb-6">
            <p className="text-white/60 text-sm">{t('user.payments.amount')}</p>
            <p className="text-3xl font-display font-bold mt-1">{total.toLocaleString()} FCFA</p>
          </div>
          <div className="flex flex-col gap-3">
            {payments.map(p => (
              <div key={p.uuid} className="card p-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-[#E8F5EE] rounded-xl flex items-center justify-center flex-shrink-0">??</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{p.category_name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {p.paid_at
                      ? format(new Date(p.paid_at), 'dd MMM yyyy HH:mm', { locale: dateLocale })
                      : t('status.pending')}
                    {p.method && ` · ${p.method}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-[#1A8A3C]">{parseFloat(p.amount).toLocaleString()} FCFA</p>
                  <StatusBadge status={p.status} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
