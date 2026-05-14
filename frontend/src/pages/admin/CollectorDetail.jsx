import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Mail, Phone, MapPin, Calendar, CheckCircle, AlertCircle, Image as ImageIcon, Video } from 'lucide-react'
import toast from 'react-hot-toast'
import { adminApi } from '../../services/api'
import { PageLoader } from '../../components/common'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const VERIFICATION_STATUS = {
  pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700', icon: AlertCircle },
  submitted: { label: 'Soumis', color: 'bg-blue-100 text-blue-700', icon: AlertCircle },
  verified: { label: 'Vérifié', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  rejected: { label: 'Rejeté', color: 'bg-red-100 text-red-700', icon: AlertCircle },
}

const ImageModal = ({ src, title, isOpen, onClose }) => {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg max-w-2xl max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b sticky top-0 bg-white flex justify-between items-center">
          <h3 className="font-semibold text-lg">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
        </div>
        <div className="p-4">
          <img src={src} alt={title} className="max-w-full max-h-[70vh] object-contain mx-auto" />
        </div>
      </div>
    </div>
  )
}

export default function CollectorDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [collector, setCollector] = useState(null)
  const [loading, setLoading] = useState(true)
  const [modalImage, setModalImage] = useState(null)

  useEffect(() => {
    fetchCollector()
  }, [id])

  const fetchCollector = async () => {
    setLoading(true)
    try {
      const { data } = await adminApi.collectorDetails(id)
      setCollector(data.data)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors du chargement')
      navigate('/admin/users')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <PageLoader />

  if (!collector) return (
    <div className="p-6 text-center">
      <p className="text-gray-500">Collecteur non trouvé</p>
      <button onClick={() => navigate('/admin/users')} className="text-[#1A8A3C] hover:underline mt-4">
        Retour à la liste
      </button>
    </div>
  )

  const cp = collector.collector_profile || {}
  const StatusIcon = VERIFICATION_STATUS[cp.verification_status]?.icon || AlertCircle
  const statusColor = VERIFICATION_STATUS[cp.verification_status]?.color
  const statusLabel = VERIFICATION_STATUS[cp.verification_status]?.label

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <button onClick={() => navigate('/admin/users')} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Détails du collecteur</h1>
          <p className="text-gray-500 text-sm">ID: {collector.id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Photo Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Photo de profil</h2>
            <div className="flex items-center gap-6">
              <div className="w-32 h-32 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center border-4 border-[#1A8A3C]">
                {collector.avatar_url ? (
                  <img src={collector.avatar_url} alt={collector.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-6xl">👤</div>
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{collector.name}</h3>
                <p className="text-gray-600 mb-4">Collecteur vérifié • {cp.rating_avg ? `${cp.rating_avg.toFixed(1)} ⭐` : 'Nouvel arrivant'}</p>
                <div className="flex gap-4 text-sm text-gray-500">
                  <span>📍 {cp.service_area || 'Zone non définie'}</span>
                  <span>🚗 {cp.vehicle_type || 'Véhicule non spécifié'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Identity Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Identité du collecteur</h2>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-gray-500 text-sm font-medium">Nom complet</p>
                <p className="text-lg font-semibold text-gray-900">{collector.name}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm font-medium">Email</p>
                <a href={`mailto:${collector.email}`} className="text-lg font-semibold text-[#1A8A3C] hover:underline flex items-center gap-1">
                  <Mail size={16} />
                  {collector.email}
                </a>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-500 text-sm font-medium">Téléphone</p>
                <a href={`tel:${collector.phone}`} className="text-lg font-semibold text-[#1A8A3C] hover:underline flex items-center gap-1">
                  <Phone size={16} />
                  {collector.phone || 'Non fourni'}
                </a>
              </div>
              <div>
                <p className="text-gray-500 text-sm font-medium">Numéro CNI</p>
                <p className="text-lg font-semibold text-gray-900 font-mono">{cp.national_id_number || 'Non fourni'}</p>
              </div>
            </div>
          </div>

          {/* Verification Status */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Statut de vérification</h2>
            
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-3 rounded-full ${statusColor}`}>
                <StatusIcon size={24} />
              </div>
              <div>
                <p className="text-gray-500 text-sm">Statut</p>
                <p className={`text-lg font-semibold ${statusColor}`}>{statusLabel}</p>
              </div>
            </div>

            {cp.verification_notes && (
              <div className="bg-gray-50 rounded p-4 mt-4">
                <p className="text-gray-500 text-sm font-medium">Notes</p>
                <p className="text-gray-700 mt-1">{cp.verification_notes}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
              <div>
                <p className="text-gray-500">Collections totales</p>
                <p className="font-bold text-lg text-gray-900">{collector.stats?.completedRequests || 0}</p>
              </div>
              <div>
                <p className="text-gray-500">Note moyenne</p>
                <p className="font-bold text-lg text-yellow-500">⭐ {(cp.rating_avg || 0).toFixed(1)}</p>
              </div>
            </div>
          </div>

          {/* Registration Info */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Informations d'inscription</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-500 text-sm font-medium">Date d'inscription</p>
                <p className="text-gray-900 font-medium">
                  {format(new Date(collector.created_at), 'dd MMMM yyyy', { locale: fr })}
                </p>
                <p className="text-gray-500 text-sm">
                  {format(new Date(collector.created_at), 'HH:mm:ss', { locale: fr })}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-sm font-medium">Statut du compte</p>
                <p className={`font-semibold ${collector.is_active ? 'text-green-600' : 'text-red-600'}`}>
                  {collector.is_active ? '✓ Actif' : '✕ Suspendu'}
                </p>
              </div>
            </div>

            {collector.is_verified && (
              <div className="mt-4 p-3 bg-green-50 rounded text-green-700 text-sm flex items-center gap-2">
                <CheckCircle size={16} />
                Compte email vérifié
              </div>
            )}
          </div>
        </div>

        {/* Documents */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Documents</h2>

          {/* CNI Front */}
          {cp.id_front_url ? (
            <button
              onClick={() => setModalImage({ src: cp.id_front_url, title: 'CNI - Recto' })}
              className="w-full bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition cursor-pointer group"
            >
              <div className="relative aspect-video bg-gray-100 flex items-center justify-center overflow-hidden">
                <img src={cp.id_front_url} alt="CNI Recto" className="w-full h-full object-cover group-hover:scale-110 transition" />
              </div>
              <div className="p-3 text-left">
                <p className="font-semibold text-sm text-gray-900 flex items-center gap-2">
                  <ImageIcon size={14} />
                  CNI - Recto
                </p>
              </div>
            </button>
          ) : (
            <div className="w-full bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 p-4 text-center">
              <ImageIcon className="mx-auto text-gray-400 mb-2" size={32} />
              <p className="text-sm text-gray-500">CNI - Recto non fournie</p>
            </div>
          )}

          {/* CNI Back */}
          {cp.id_back_url ? (
            <button
              onClick={() => setModalImage({ src: cp.id_back_url, title: 'CNI - Verso' })}
              className="w-full bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition cursor-pointer group"
            >
              <div className="relative aspect-video bg-gray-100 flex items-center justify-center overflow-hidden">
                <img src={cp.id_back_url} alt="CNI Verso" className="w-full h-full object-cover group-hover:scale-110 transition" />
              </div>
              <div className="p-3 text-left">
                <p className="font-semibold text-sm text-gray-900 flex items-center gap-2">
                  <ImageIcon size={14} />
                  CNI - Verso
                </p>
              </div>
            </button>
          ) : (
            <div className="w-full bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 p-4 text-center">
              <ImageIcon className="mx-auto text-gray-400 mb-2" size={32} />
              <p className="text-sm text-gray-500">CNI - Verso non fourni</p>
            </div>
          )}

          {/* Selfie */}
          {cp.selfie_url ? (
            <button
              onClick={() => setModalImage({ src: cp.selfie_url, title: 'Photo de présence' })}
              className="w-full bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition cursor-pointer group"
            >
              <div className="relative aspect-video bg-gray-100 flex items-center justify-center overflow-hidden">
                <img src={cp.selfie_url} alt="Selfie" className="w-full h-full object-cover group-hover:scale-110 transition" />
              </div>
              <div className="p-3 text-left">
                <p className="font-semibold text-sm text-gray-900 flex items-center gap-2">
                  <ImageIcon size={14} />
                  Photo de présence
                </p>
              </div>
            </button>
          ) : (
            <div className="w-full bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 p-4 text-center">
              <ImageIcon className="mx-auto text-gray-400 mb-2" size={32} />
              <p className="text-sm text-gray-500">Photo non fournie</p>
            </div>
          )}

          {/* Selfie Video */}
          {cp.selfie_video_url ? (
            <div className="w-full bg-white rounded-lg shadow-md overflow-hidden">
              <div className="relative aspect-video bg-gray-100 flex items-center justify-center">
                <video controls className="w-full h-full object-cover">
                  <source src={cp.selfie_video_url} type="video/mp4" />
                </video>
              </div>
              <div className="p-3">
                <p className="font-semibold text-sm text-gray-900 flex items-center gap-2">
                  <Video size={14} />
                  Vidéo du visage
                </p>
              </div>
            </div>
          ) : (
            <div className="w-full bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 p-4 text-center">
              <Video className="mx-auto text-gray-400 mb-2" size={32} />
              <p className="text-sm text-gray-500">Vidéo non fournie</p>
            </div>
          )}
        </div>
      </div>

      {/* Image Modal */}
      {modalImage && (
        <ImageModal
          src={modalImage.src}
          title={modalImage.title}
          isOpen={true}
          onClose={() => setModalImage(null)}
        />
      )}
    </div>
  )
}
