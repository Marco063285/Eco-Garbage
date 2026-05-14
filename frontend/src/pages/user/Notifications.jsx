import { useState, useEffect } from 'react'
import { Bell, CheckCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { notifApi } from '../../services/api'
import { PageHeader, PageLoader, EmptyState } from '../../components/common'
import { format } from 'date-fns'
import { fr, enUS } from 'date-fns/locale'

export default function Notifications() {
  const { t, i18n } = useTranslation()
  const dateLocale = i18n.language?.startsWith('en') ? enUS : fr
  const [notifs, setNotifs] = useState([])
  const [loading, setLoading] = useState(true)

  const loadData = () => {
    notifApi.list().then(r => setNotifs(r.data.data || [])).finally(() => setLoading(false))
  }
  useEffect(() => { loadData() }, [])

  const markAll = async () => {
    await notifApi.readAll()
    toast.success(t('user.notifications.markAllRead'))
    loadData()
  }

  const unreadCount = notifs.filter(n => !n.is_read).length

  return (
    <div className="fade-up max-w-2xl mx-auto">
      <PageHeader
        title={t('user.notifications.title')}
        subtitle={`${unreadCount} ${t('user.notifications.unread').toLowerCase()}`}
        action={unreadCount > 0 && (
          <button onClick={markAll} className="btn-ghost border border-gray-200">
            <CheckCheck size={16} />{t('user.notifications.markAllRead')}
          </button>
        )}
      />
      {loading ? <PageLoader /> : notifs.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={t('user.notifications.noNotifications')}
          description={t('user.notifications.noNotificationsDesc')}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {notifs.map(n => (
            <div key={n.id} className={`card p-4 flex items-start gap-4 transition-all
              ${!n.is_read ? 'border-[#1A8A3C]/20 bg-[#f0fdf4]' : ''}`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-base
                ${!n.is_read ? 'bg-[#1A8A3C] text-white' : 'bg-gray-100'}`}>
                {n.type === 'welcome' ? '👋' : n.type === 'request' ? '📋' : n.type === 'update' ? '🔄' : '🔔'}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${!n.is_read ? 'text-gray-900' : 'text-gray-600'}`}>
                  {n.title}
                </p>
                <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{n.message}</p>
                <p className="text-[10px] text-gray-300 mt-1">
                  {format(new Date(n.created_at), 'dd MMM yyyy HH:mm', { locale: dateLocale })}
                </p>
              </div>
              {!n.is_read && <div className="w-2 h-2 bg-[#1A8A3C] rounded-full flex-shrink-0 mt-1.5" />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
