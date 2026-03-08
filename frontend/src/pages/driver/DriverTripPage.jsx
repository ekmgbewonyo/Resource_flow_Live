// ## Driver Trip Page - Active trip with live tracking and delivery verification
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Package, CheckCircle } from 'lucide-react';
import { tripApi } from '../../services/api';
import { DriverTripMode } from '../../components/logistics/DriverTripMode';
import { LiveMapTracker } from '../../components/logistics/LiveMapTracker';
import { DeliveryVerification } from '../../components/logistics/DeliveryVerification';
import { Button } from '../../components/ui/Button';

export const DriverTripPage = () => {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchTrip = async () => {
    if (!tripId) return;
    try {
      const data = await tripApi.getById(Number(tripId));
      setTrip(data);
    } catch (err) {
      console.error('Failed to load trip:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrip();
  }, [tripId]);

  const handleComplete = () => {
    fetchTrip();
    navigate('/dashboard/trips');
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (!trip) return <div className="p-6">Trip not found</div>;

  const isArrived = trip.status === 'arrived' || trip.status === 'completed';
  const isCompleted = trip.status === 'completed';

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" icon={ArrowLeft} onClick={() => navigate(-1)}>
          Back
        </Button>
        <div>
          <h2 className="text-xl font-bold text-slate-800">Trip #{trip.id}</h2>
          <p className="text-slate-600 text-sm">
            {trip.request?.title || 'Delivery'}
          </p>
        </div>
      </div>

      <DriverTripMode trip={trip} onTripUpdated={fetchTrip} />

      <div>
        <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
          <MapPin size={18} /> Live Map
        </h3>
        <LiveMapTracker tripId={trip.id} trip={trip} />
      </div>

      {isArrived && !isCompleted && (
        <div>
          <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
            <Package size={18} /> Delivery Verification
          </h3>
          <DeliveryVerification trip={trip} onComplete={handleComplete} />
        </div>
      )}

      {isCompleted && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-2">
          <CheckCircle className="text-emerald-600" size={24} />
          <p className="text-emerald-800 font-medium">Delivery completed successfully</p>
        </div>
      )}

      {!isArrived && (
        <Button
          onClick={async () => {
            await tripApi.arrive(trip.id);
            fetchTrip();
          }}
          className="w-full"
        >
          I&apos;ve Arrived
        </Button>
      )}
    </div>
  );
};

export default DriverTripPage;
