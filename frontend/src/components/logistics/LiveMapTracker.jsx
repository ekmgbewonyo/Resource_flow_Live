// ## Live Map Tracker - Real-time driver position on map
// ## Uses react-leaflet, polls or listens for TripLocationUpdated broadcast
import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { tripApi } from '../../services/api';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const POLL_INTERVAL_MS = 5000; // 5 seconds when websockets not configured

function MapUpdater({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, zoom ?? map.getZoom());
  }, [center, zoom, map]);
  return null;
}

export const LiveMapTracker = ({ tripId, trip: initialTrip }) => {
  const [trip, setTrip] = useState(initialTrip || null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!tripId) return;

    const fetchTrip = async () => {
      try {
        const data = await tripApi.getById(tripId);
        setTrip(data);
        setError(null);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load trip');
      }
    };

    fetchTrip();

    // Poll for updates (fallback when Pusher/Reverb not configured)
    const pollInterval = setInterval(fetchTrip, POLL_INTERVAL_MS);
    return () => clearInterval(pollInterval);
  }, [tripId]);

  // Real-time: When VITE_PUSHER_APP_KEY is set, Laravel Echo can be initialized
  // in a separate bootstrap file. For now, polling every 5s provides live updates.

  const hasLocation = trip?.current_lat != null && trip?.current_lng != null;
  const center = hasLocation ? [trip.current_lat, trip.current_lng] : [7.9465, -1.0232]; // Ghana default
  const zoom = hasLocation ? 15 : 6;

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 h-[400px]">
      <MapContainer center={center} zoom={zoom} className="h-full w-full" scrollWheelZoom>
        <MapUpdater center={center} zoom={zoom} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {hasLocation && (
          <Marker position={[trip.current_lat, trip.current_lng]}>
            <Popup>
              <strong>Driver</strong>
              {trip.driver?.name && <><br />{trip.driver.name}</>}
              <br />
              <span className="text-xs text-slate-500">Status: {trip.status}</span>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
};

export default LiveMapTracker;
