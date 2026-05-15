import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Phone, MapPin, CheckCircle, Navigation, Play, AlertCircle, Archive } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { requestApi } from '../../services/api'
import { StatusBadge, PageLoader, Modal } from '../../components/common'
import { format } from 'date-fns'
import { fr, enUS } from 'date-fns/locale'
import LiveRouteMap from '../../components/common/LiveRouteMap'
import { watchPosition, getGeolocationStatus } from '../../utils/geolocation'

const STATUS_FLOW = {
  assigned: { next: 'on_way', label: '?? Démarrer le trajet', icon: Navigation, color: 'bg-blue-500' },
  on_way: { next: 'in_progress', label: '?? Arrivé sur place', icon: MapPin, color: 'bg-orange-500' },
  in_progress: { next: 'completed', label: '? Marquer comme complété', icon: CheckCircle, color: 'bg-[#1A8A3C]' },
}

export default function TaskDetail() {
  const { t, i18n } = useTranslation()
  const dateLocale = i18n.language?.startsWith('en') ? enUS : fr
  const isEn = i18n.language?.startsWith('en')
  const { uuid } = useParams()
  const navigate = useNavigate()
  const [task, setTask] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [issueModal, setIssueModal] = useState(false)
  const [issueNote, setIssueNote] = useState('')
  const [locationWatchId, setLocationWatchId] = useState(null)
  const [locationError, setLocationError] = useState('')
  const [archiving, setArchiving] = useState(false)

  const STATUS_FLOW = {
    assigned:    { next: 'on_way',      label: isEn ? '?? Start trip'        : '?? Démarrer le trajet', icon: Navigation,   color: 'bg-blue-500' },
    on_way:      { next: 'in_progress', label: isEn ? '?? Arrived on site'   : '?? Arrivé sur place',  icon: MapPin,       color: 'bg-orange-500' },
    in_progress: { next: 'completed',   label: isEn ? '? Mark as completed' : '? Marquer comme complété', icon: CheckCircle, color: 'bg-[#1A8A3C]' },
  }

  const fetchTask = async () => {
    try {
      const { data } = await requestApi.get(uuid)
      setTask(data.data)
    } catch {
      toast.error(isEn ? 'Task not found' : 'Tâche introuvable')
      navigate('/collector/tasks')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { fetchTask() }, [uuid])

  // Check geolocation support on mount
  useEffect(() => {
    const geoStatus = getGeolocationStatus()
    if (!geoStatus.supported) {
      toast.error(geoStatus.reason)
    }
  }, [])

  // Polling for live updates when task is active
  useEffect(() => {
    if (task && ['assigned', 'on_way', 'in_progress'].includes(task.status)) {
      const interval = setInterval(fetchTask, 10000) // Update every 10 seconds
      return () => clearInterval(interval)
    }
  }, [task?.status])

  // Location tracking when en route
  useEffect(() => {
    if (task && ['on_way', 'in_progress'].includes(task.status)) {
      startLocationTracking()
    } else {
      stopLocationTracking()
    }
    return () => stopLocationTracking()
  }, [task?.status])

  const handleRetryLocation = () => {
    setLocationError('')
    stopLocationTracking()
    startLocationTracking()
  }

  const handleStatusUpdate = async (newStatus) => {
    setUpdating(true)
    try {
      await requestApi.updateStatus(uuid, { status: newStatus })
      toast.success(`${isEn ? 'Status updated:' : 'Statut mis à jour :'} ${t(`status.${newStatus}`)}`)
      fetchTask()
    } catch (err) {
      toast.error(err.response?.data?.message || t('common.serverError'))
    } finally {
      setUpdating(false)
    }
  }

  const handleReportIssue = async () => {
    setUpdating(true)
    try {
      await requestApi.updateStatus(uuid, { status: 'failed' })
      toast.error(isEn ? 'Issue reported' : 'Problème signalé')
      setIssueModal(false)
      navigate('/collector/tasks')
    } catch (err) {
      toast.error(err.response?.data?.message || t('common.serverError'))
    } finally {
      setUpdating(false)
    }
  }

  const startLocationTracking = () => {
    stopLocationTracking()
    const watchId = watchPosition(
      async (position) => {
        setLocationError('')
        try {
          await requestApi.updateLocation(uuid, {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          })
        } catch (err) {
          console.error('Failed to update location:', err)
        }
      },
      (error) => {
        console.error('Geolocation error:', error)
        setLocationError(error.message)
        toast.error(error.message)
      }
    )
    if (watchId !== null) setLocationWatchId(watchId)
  }

  const stopLocationTracking = () => {
    if (locationWatchId) {
      navigator.geolocation.clearWatch(locationWatchId)
      setLocationWatchId(null)
    }
  }

  const handleArchive = async () => {
    setArchiving(true)
    try {
      await requestApi.archive(uuid)
      toast.success('Tâche archivée avec succès')
      navigate('/collector/archived')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de l\'archivage')
    } finally {
      setArchiving(false)
    }
  }

  if (loading) return <PageLoader />
  if (!task) return null

  const nextAction = STATUS_FLOW[task.status]

  const details = [
    [isEn ? 'Waste type'      : 'Type de déchet',    task.category_name],
    [isEn ? 'Service type'    : 'Type de service',    task.service_type],
    [isEn ? 'Est. quantity'   : 'Quantité estimée',   task.quantity_estimate || '—'],
    [isEn ? 'Price'           : 'Prix',               task.estimated_price ? `${parseFloat(task.estimated_price).toLocaleString()} FCFA` : '—'],
    [isEn ? 'Created'         : 'Date de création',   format(new Date(task.created_at), 'dd MMM yyyy HH:mm', { locale: dateLocale })],
    [isEn ? 'Scheduled'       : 'Date planifiée',     task.scheduled_at ? format(new Date(task.scheduled_at), 'dd MMM yyyy HH:mm', { locale: dateLocale }) : '—'],
  ]

  return (
    <div className="fade-up max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="btn-ghost p-2"><ArrowLeft size={18} /></button>
        <div>
          <h1 className="text-xl font-display font-bold">{isEn ? 'Task detail' : 'Détail de la tâche'}</h1>
          <p className="text-sm text-gray-400">#{task.uuid?.slice(0, 8).toUpperCase()}</p>
        </div>
        <div className="ml-auto"><StatusBadge status={task.status} /></div>
      </div>

      {/* Client card */}
      <div className="card p-6 mb-5">
        <h3 className="font-display font-bold mb-4">{isEn ? 'Client information' : 'Informations client'}</h3>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-[#E8F5EE] rounded-xl flex items-center justify-center text-[#1A8A3C] font-bold text-lg">
            {task.user_name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold">{task.user_name}</p>
            {task.user_phone && (
              <a href={`tel:${task.user_phone}`} className="flex items-center gap-1.5 text-sm text-[#1A8A3C] mt-0.5 hover:underline">
                <Phone size={13} />{task.user_phone}
              </a>
            )}
          </div>
        </div>

        <div className="bg-[#E8F5EE] rounded-xl p-3 flex items-start gap-2">
          <MapPin size={16} className="text-[#1A8A3C] mt-0.5 flex-shrink-0" />
          <p className="text-sm text-gray-700">{task.address}</p>
        </div>

        <a href={`https://maps.google.com/?q=${encodeURIComponent(task.address)}`} target="_blank" rel="noopener noreferrer"
          className="btn-outline w-full justify-center mt-3">
          <Navigation size={16} /> {isEn ? 'Open in Maps' : 'Ouvrir dans Maps'}
        </a>
      </div>

      {/* Task details */}
      <div className="card p-6 mb-5">
        <h3 className="font-display font-bold mb-4">{isEn ? 'Collection details' : 'Détails de la collecte'}</h3>
        <div className="grid grid-cols-2 gap-4">
          {details.map(([k, v]) => (
            <div key={k}>
              <p className="text-xs text-gray-400 mb-0.5">{k}</p>
              <p className="text-sm font-medium text-gray-800">{v}</p>
            </div>
          ))}
        </div>
        {task.notes && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-1">{isEn ? 'Client instructions' : 'Instructions du client'}</p>
            <p className="text-sm text-gray-600 bg-yellow-50 border border-yellow-200 rounded-xl p-3">{task.notes}</p>
          </div>
        )}
      </div>

      {/* Live Route Map */}
      {['assigned', 'on_way', 'in_progress'].includes(task.status) && (
        <div className="card p-6 mb-5">
          <h3 className="font-display font-bold mb-5">Trajet en temps réel</h3>
          <LiveRouteMap
            userLocation={task.latitude && task.longitude ? { latitude: task.latitude, longitude: task.longitude } : null}
            collectorLocation={task.collector_location}
            userLabel="Adresse de collecte"
            collectorLabel="Ma position"
          />
          <p className="text-xs text-gray-500 mt-3">
            Votre position actuelle et l'adresse de collecte sont affichées. Partagez votre position pour guider le client.
          </p>
          {locationError && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <p className="font-semibold">Erreur de partage de position :</p>
              <p>{locationError}</p>
              <button onClick={handleRetryLocation} className="mt-3 btn-outline">
                Réessayer la localisation
              </button>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {nextAction && (
        <div className="flex flex-col gap-3 mb-4">
          <button
            onClick={() => handleStatusUpdate(nextAction.next)}
            disabled={updating}
            className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl text-white font-bold text-base transition-all ${nextAction.color} hover:opacity-90 disabled:opacity-60`}>
            <nextAction.icon size={20} />
            {updating ? (isEn ? 'Updating...' : 'Mise à jour...') : nextAction.label}
          </button>
        </div>
      )}

      {['assigned', 'on_way', 'in_progress'].includes(task.status) && (
        <button onClick={() => setIssueModal(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-red-500 font-semibold text-sm border-2 border-red-200 hover:bg-red-50 transition-all">
          <AlertCircle size={16} /> {isEn ? 'Report an issue' : 'Signaler un problème'}
        </button>
      )}

      {task.status === 'completed' && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center mb-4">
          <p className="text-lg">??</p>
          <p className="font-semibold text-green-700 mt-1">{isEn ? 'Collection completed successfully!' : 'Collecte complétée avec succès !'}</p>
          {task.collected_at && (
            <p className="text-sm text-green-600 mt-0.5">{format(new Date(task.collected_at), 'dd MMM yyyy HH:mm', { locale: dateLocale })}</p>
          )}
        </div>
      )}

      {/* Archive button for completed tasks */}
      {['completed', 'cancelled', 'failed'].includes(task.status) && (
        <button onClick={handleArchive} disabled={archiving} className="btn-primary w-full justify-center mb-4">
          <Archive size={16} />
          {archiving ? 'Archivage...' : 'Archiver cette tâche'}
        </button>
      )}

      <Modal isOpen={issueModal} onClose={() => setIssueModal(false)} title={isEn ? 'Report an issue' : 'Signaler un problème'} size="sm">
          <p className="text-sm text-gray-500">
            {isEn ? 'Describe the issue. The collection will be marked as failed.' : 'Décrivez le problème rencontré. La collecte sera marquée comme échouée.'}
          </p>
          <textarea className="input resize-none min-h-[100px]"
            placeholder={isEn ? 'Client absent, incorrect address, undeclared hazardous waste...' : 'Client absent, adresse incorrecte, déchets dangereux non déclarés...'}
            value={issueNote} onChange={e => setIssueNote(e.target.value)} />
          <div className="flex gap-3">
            <button onClick={() => setIssueModal(false)} className="btn-ghost flex-1 justify-center border border-gray-200">{t('common.cancel')}</button>
            <button onClick={handleReportIssue} disabled={updating}
              className="flex-1 justify-center inline-flex items-center gap-2 bg-red-500 text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-red-600">
              {isEn ? 'Report' : 'Signaler'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
