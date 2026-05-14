import { useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
  iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href,
  shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href,
})

const FitBounds = ({ positions }) => {
  const map = useMap()

  useEffect(() => {
    if (!positions.length) return
    const bounds = L.latLngBounds(positions)
    map.fitBounds(bounds, { padding: [40, 40] })
  }, [map, positions])

  return null
}

export default function LiveRouteMap({ userLocation, collectorLocation, userLabel = 'Collecte', collectorLabel = 'Collecteur' }) {
  const markers = useMemo(() => {
    const items = []
    if (userLocation?.latitude && userLocation?.longitude) {
      items.push({ position: [userLocation.latitude, userLocation.longitude], label: userLabel, color: 'blue' })
    }
    if (collectorLocation?.latitude && collectorLocation?.longitude) {
      items.push({ position: [collectorLocation.latitude, collectorLocation.longitude], label: collectorLabel, color: 'green' })
    }
    return items
  }, [userLocation, collectorLocation, userLabel, collectorLabel])

  const polyline = useMemo(() => {
    if (markers.length === 2) {
      return [markers[0].position, markers[1].position]
    }
    return []
  }, [markers])

  if (!userLocation?.latitude || !userLocation?.longitude) {
    return (
      <div className="rounded-3xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
        <p className="text-sm text-gray-500">Position de collecte non disponible. Activez la géolocalisation lors de la création de la demande pour afficher le trajet.</p>
      </div>
    )
  }

  return (
    <div className="rounded-3xl overflow-hidden border border-gray-200 shadow-sm">
      <MapContainer center={[userLocation.latitude, userLocation.longitude]} zoom={13} scrollWheelZoom={false} className="h-80 w-full">
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
        {markers.map((marker) => (
          <Marker key={`${marker.label}-${marker.position.join(',')}`} position={marker.position}>
            <Popup>{marker.label}</Popup>
          </Marker>
        ))}
        {polyline.length === 2 && <Polyline pathOptions={{ color: '#1A8A3C', weight: 4, dashArray: '6' }} positions={polyline} />}
        <FitBounds positions={markers.map(m => m.position)} />
      </MapContainer>
    </div>
  )
}
