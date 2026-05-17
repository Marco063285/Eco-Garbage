import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { RotateCcw, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { requestApi } from '../../services/api'
import { StatusBadge, PageLoader } from '../../components/common'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function ArchivedRequests() {
  const navigate = useNavigate()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [restoring, setRestoring] = useState(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  const fetchRequests = async () => {
    setLoading(true)
    try {
      const { data } = await requestApi.list({ archived: 'true', page, limit: 10 })
      setRequests(data.data)
      setTotal(data.pagination.total)
    } catch (err) {
      toast.error('Erreur lors du chargement des archives')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [page])

  const handleRestore = async (uuid) => {
    setRestoring(uuid)
    try {
      await requestApi.restore(uuid)
      toast.success('Demande restaurée avec succès')
      fetchRequests()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la restauration')
    } finally {
      setRestoring(null)
    }
  }

  if (loading) return <PageLoader />

  return (
    <div className="fade-up">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold">Demandes archivées</h1>
        <p className="text-gray-500 mt-1">Consultez vos demandes passées complétées ou annulées</p>
      </div>

      {requests.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-4">📦</div>
          <p className="text-gray-500 mb-4">Aucune demande archivée pour le moment</p>
          <button onClick={() => navigate('/dashboard/requests')} className="btn-primary">
            Retour aux demandes actives
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {requests.map(req => (
            <div key={req.uuid} className="card p-5 hover:shadow-md transition-all">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-3 gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h3 className="font-semibold text-gray-800">{req.category_name}</h3>
                    <StatusBadge status={req.status} />
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{req.address}</p>
                  <div className="flex flex-col sm:flex-row sm:gap-3 gap-0.5 text-xs text-gray-500">
                    <span>Créée: {format(new Date(req.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}</span>
                    {req.collected_at && (
                      <span>Collectée: {format(new Date(req.collected_at), 'dd MMM yyyy HH:mm', { locale: fr })}</span>
                    )}
                    {req.archived_at && (
                      <span>Archivée: {format(new Date(req.archived_at), 'dd MMM yyyy', { locale: fr })}</span>
                    )}
                  </div>
                </div>
                <div className="sm:text-right flex-shrink-0">
                  <p className="text-base sm:text-lg font-bold text-[#1A8A3C]">{parseFloat(req.estimated_price).toLocaleString()} FCFA</p>
                  {req.collector_name && (
                    <p className="text-xs text-gray-500 mt-1">par {req.collector_name}</p>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <button
                  onClick={() => handleRestore(req.uuid)}
                  disabled={restoring === req.uuid}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors disabled:opacity-60 text-sm font-medium">
                  <RotateCcw size={14} />
                  {restoring === req.uuid ? 'Restauration...' : 'Restaurer'}
                </button>
                <button
                  onClick={() => navigate(`/dashboard/requests/${req.uuid}`)}
                  className="flex-1 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-gray-700 text-sm font-medium">
                  Voir détails
                </button>
              </div>
            </div>
          ))}

          {total > 10 && (
            <div className="flex gap-2 justify-center mt-6">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50">
                Précédent
              </button>
              <span className="px-4 py-2 text-sm text-gray-600">
                Page {page} sur {Math.ceil(total / 10)}
              </span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= Math.ceil(total / 10)}
                className="px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50">
                Suivant
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
