// ## Driver Trip Mode - Real-time location tracking
// ## Uses navigator.geolocation.watchPosition, sends updates to backend every 10-30 seconds
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Navigation, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { tripApi } from '../../services/api';

const LOCATION_UPDATE_INTERVAL_MS = 15000; // 15 seconds

export const DriverTripMode = ({ trip, onTripUpdated }) => {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [lastSent, setLastSent] = useState(null);
  const watchIdRef = useRef(null);
  const sendTimeoutRef = useRef(null);

  const sendLocation = useCallback(async (lat, lng) => {
    try {
      await tripApi.updateLocation(trip.id, lat, lng);
      setLastSent(new Date());
      onTripUpdated?.();
    } catch (err) {
      console.error('Failed to send location:', err);
      setError(err.response?.data?.message || 'Failed to update location');
    }
  }, [trip?.id, onTripUpdated]);

  useEffect(() => {
    if (!trip || trip.status === 'completed') return;

    const onPosition = (pos) => {
      const { latitude, longitude } = pos.coords;
      setLocation({ lat: latitude, lng: longitude });
      setError(null);
    };

    const onError = (err) => {
      setError(err.message || 'Location unavailable');
    };

    watchIdRef.current = navigator.geolocation.watchPosition(onPosition, onError, {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 10000,
    });

    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [trip?.id, trip?.status]);

  // Send location to backend at interval
  useEffect(() => {
    if (!trip || trip.status === 'completed' || !location) return;

    const scheduleSend = () => {
      sendTimeoutRef.current = setTimeout(() => {
        sendLocation(location.lat, location.lng);
        scheduleSend();
      }, LOCATION_UPDATE_INTERVAL_MS);
    };

    sendLocation(location.lat, location.lng);
    scheduleSend();

    return () => {
      if (sendTimeoutRef.current) clearTimeout(sendTimeoutRef.current);
    };
  }, [trip?.id, trip?.status, location, sendLocation]);

  if (!trip) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Navigation className="text-emerald-600" size={20} />
        <h3 className="font-bold text-slate-800">Live Tracking</h3>
        {trip.status === 'completed' && (
          <span className="ml-auto text-sm text-emerald-600 flex items-center gap-1">
            <CheckCircle size={14} /> Completed
          </span>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg mb-3">
          <AlertCircle className="text-amber-600 shrink-0" size={18} />
          <p className="text-sm text-amber-800">{error}</p>
        </div>
      )}

      {location ? (
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-slate-500" />
            <span className="text-slate-600">
              {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
            </span>
          </div>
          {lastSent && (
            <p className="text-xs text-slate-500">
              Last sent: {lastSent.toLocaleTimeString()}
            </p>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 text-slate-500">
          <Loader2 size={18} className="animate-spin" />
          <span>Getting location...</span>
        </div>
      )}
    </div>
  );
};

export default DriverTripMode;
