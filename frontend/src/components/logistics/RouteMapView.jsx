// ## Route Map View - Uber/Bolt-style animated delivery route
// ## Shows route polyline with animated truck marker moving along the path
import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getCoordsForCity } from '../../utils/ghanaCoords';

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom truck icon (SVG as data URL)
const truckIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>`;

function createTruckIcon() {
  return L.divIcon({
    html: truckIconSvg,
    className: 'route-map-truck-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

// Animated marker that moves along path
function AnimatedTruckMarker({ path, isPlaying, speed = 0.00015 }) {
  const [position, setPosition] = useState(path?.[0] || null);
  const [progress, setProgress] = useState(0);
  const frameRef = useRef(null);
  const startTimeRef = useRef(null);
  const loopTimeoutRef = useRef(null);

  useEffect(() => {
    if (!path || path.length < 2) return;

    if (!isPlaying) {
      setPosition(path[0]);
      setProgress(0);
      if (loopTimeoutRef.current) clearTimeout(loopTimeoutRef.current);
      return;
    }

    const animate = (timestamp) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const newProgress = Math.min(1, elapsed * speed);

      setProgress(newProgress);

      // Interpolate position along path
      const totalSegments = path.length - 1;
      const segmentIndex = Math.min(
        Math.floor(newProgress * totalSegments),
        totalSegments - 1
      );
      const segmentProgress = segmentIndex < totalSegments
        ? (newProgress * totalSegments) % 1
        : 1;
      const start = path[segmentIndex];
      const end = path[segmentIndex + 1] || start;
      const lat = start[0] + (end[0] - start[0]) * segmentProgress;
      const lng = start[1] + (end[1] - start[1]) * segmentProgress;
      setPosition([lat, lng]);

      if (newProgress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        // Loop: restart after a short pause (Uber/Bolt style)
        startTimeRef.current = null;
        loopTimeoutRef.current = setTimeout(() => {
          loopTimeoutRef.current = null;
          frameRef.current = requestAnimationFrame(animate);
        }, 800);
      }
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      if (loopTimeoutRef.current) clearTimeout(loopTimeoutRef.current);
    };
  }, [path, isPlaying, speed]);

  if (!position) return null;
  return (
    <Marker position={position} icon={createTruckIcon()} zIndexOffset={1000}>
      <Popup>
        <strong>Driver</strong>
        <br />
        <span className="text-xs text-slate-500">
          {Math.round(progress * 100)}% along route
        </span>
      </Popup>
    </Marker>
  );
}

// Fit map to bounds
function MapBounds({ path }) {
  const map = useMap();
  useEffect(() => {
    if (path && path.length >= 2) {
      const bounds = L.latLngBounds(path);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
    }
  }, [map, path]);
  return null;
}

/**
 * RouteMapView - Uber/Bolt-style animated delivery route map
 * @param {Object} props
 * @param {Array} props.path - Array of [lat, lng] for the route
 * @param {Object} props.route - Delivery route with warehouse, destination
 * @param {Array} props.logistics - Logistics with location_updates
 * @param {Object} props.trip - Trip with current_lat, current_lng (optional)
 * @param {string} props.routeName - Route name for display
 */
export const RouteMapView = ({
  path,
  route,
  logistics = [],
  trip,
  routeName = 'Route',
}) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [pathReady, setPathReady] = useState(path);

  // Build path from route + logistics + trip
  useEffect(() => {
    if (path && path.length >= 2) {
      setPathReady(path);
      return;
    }

    const points = [];
    const routeData = route || {};

    // Start: warehouse
    const warehouse = routeData.warehouse;
    if (warehouse?.city || warehouse?.region) {
      const start = getCoordsForCity(warehouse?.city) || getCoordsForCity(warehouse?.region);
      if (start) points.push(start);
    }

    // Middle: logistics location_updates (chronological)
    const allUpdates = [];
    (logistics || []).forEach((log) => {
      (log.location_updates || []).forEach((u) => {
        if (u.latitude != null && u.longitude != null) {
          allUpdates.push({
            lat: u.latitude,
            lng: u.longitude,
            ts: u.timestamp ? new Date(u.timestamp).getTime() : 0,
          });
        }
      });
    });
    allUpdates.sort((a, b) => a.ts - b.ts);
    allUpdates.forEach((u) => points.push([u.lat, u.lng]));

    // Current position from trip (if not already in updates)
    if (trip?.current_lat != null && trip?.current_lng != null) {
      const tripPos = [parseFloat(trip.current_lat), parseFloat(trip.current_lng)];
      const last = points[points.length - 1];
      if (!last || last[0] !== tripPos[0] || last[1] !== tripPos[1]) {
        points.push(tripPos);
      }
    }

    // End: destination
    const destCity = routeData.destination_city || routeData.destination_region;
    if (destCity) {
      const end = getCoordsForCity(destCity);
      if (end) {
        const last = points[points.length - 1];
        if (!last || Math.abs(last[0] - end[0]) > 0.001 || Math.abs(last[1] - end[1]) > 0.001) {
          points.push(end);
        }
      }
    }

    // Fallback: if we only have trip position, build start -> current -> destination
    if (points.length < 2 && trip?.current_lat != null && destCity) {
      const dest = getCoordsForCity(destCity);
      if (dest) {
        const start = getCoordsForCity(warehouse?.city) || getCoordsForCity(warehouse?.region) || [7.9465, -1.0232];
        points.length = 0;
        points.push(start, [parseFloat(trip.current_lat), parseFloat(trip.current_lng)], dest);
      }
    }

    if (points.length >= 2) {
      setPathReady(points);
    } else if (points.length === 1) {
      setPathReady([points[0], points[0]]);
    } else {
      setPathReady([[7.9465, -1.0232], [7.95, -1.02]]);
    }
  }, [path, route, logistics, trip]);

  const center = pathReady?.[0] || [7.9465, -1.0232];
  const hasPath = pathReady && pathReady.length >= 2;

  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 bg-white">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-200">
        <span className="font-medium text-slate-800">{routeName}</span>
        <button
          type="button"
          onClick={() => setIsPlaying((p) => !p)}
          className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          {isPlaying ? 'Pause' : 'Play'} animation
        </button>
      </div>
      <div className="h-[400px] relative">
        <MapContainer
          center={center}
          zoom={10}
          className="h-full w-full"
          scrollWheelZoom
          style={{ minHeight: 400 }}
        >
          <MapBounds path={pathReady} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {hasPath && (
            <>
              <Polyline
                positions={pathReady}
                pathOptions={{
                  color: '#2563eb',
                  weight: 4,
                  opacity: 0.8,
                  dashArray: '8, 8',
                }}
              />
              <Marker position={pathReady[0]} zIndexOffset={500}>
                <Popup>Start (Warehouse)</Popup>
              </Marker>
              <Marker position={pathReady[pathReady.length - 1]} zIndexOffset={500}>
                <Popup>Destination</Popup>
              </Marker>
              <AnimatedTruckMarker path={pathReady} isPlaying={isPlaying} speed={0.00025} />
            </>
          )}
        </MapContainer>
      </div>
    </div>
  );
};

export default RouteMapView;
