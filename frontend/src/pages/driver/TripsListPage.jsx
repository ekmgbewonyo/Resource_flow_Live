// ## Trips List - Driver's active and past trips
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, MapPin, ChevronRight, Loader2 } from 'lucide-react';
import { tripApi } from '../../services/api';
import { Button } from '../../components/ui/Button';

export const TripsListPage = () => {
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await tripApi.getAll();
        setTrips(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to load trips:', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const statusColor = (s) => {
    switch (s) {
      case 'completed': return 'text-emerald-600';
      case 'arrived': return 'text-blue-600';
      case 'started': return 'text-amber-600';
      default: return 'text-slate-500';
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="animate-spin text-slate-400" size={32} />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
        <Truck size={22} />
        My Trips
      </h2>

      {trips.length === 0 ? (
        <div className="bg-slate-50 rounded-xl p-8 text-center">
          <p className="text-slate-600">No trips assigned yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {trips.map((trip) => (
            <div
              key={trip.id}
              onClick={() => navigate(`/dashboard/trips/${trip.id}`)}
              className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:border-emerald-300 hover:shadow-md transition"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-800 truncate">
                  {trip.request?.title || `Trip #${trip.id}`}
                </p>
                <p className={`text-sm ${statusColor(trip.status)}`}>
                  {trip.status}
                </p>
              </div>
              <ChevronRight className="text-slate-400 shrink-0" size={20} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TripsListPage;
