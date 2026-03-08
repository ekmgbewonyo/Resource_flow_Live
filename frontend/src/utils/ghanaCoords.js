/**
 * Ghana city/region coordinates for map display.
 * Used when warehouse/destination don't have lat/lng.
 */
export const GHANA_CITY_COORDS = {
  Accra: [5.6037, -0.187],
  Kumasi: [6.6884, -1.6244],
  Tamale: [9.4038, -0.843],
  Takoradi: [4.8845, -1.7554],
  'Greater Accra': [5.6037, -0.187],
  Ashanti: [6.6884, -1.6244],
  Northern: [9.4038, -0.843],
  Western: [4.8845, -1.7554],
  'Upper East': [10.7333, -0.9833],
  'Upper West': [10.0667, -2.5],
  Bono: [7.75, -2.5],
  Volta: [6.2, 0.45],
  Eastern: [6.5, -0.45],
  Oti: [7.9, 0.3],
  'North East': [10.0, -0.5],
  Savannah: [9.1, -1.8],
};

export const GHANA_CENTER = [7.9465, -1.0232];

export function getCoordsForCity(cityOrRegion) {
  if (!cityOrRegion) return null;
  const key = Object.keys(GHANA_CITY_COORDS).find(
    (k) => k.toLowerCase() === String(cityOrRegion).trim().toLowerCase()
  );
  return key ? GHANA_CITY_COORDS[key] : null;
}
