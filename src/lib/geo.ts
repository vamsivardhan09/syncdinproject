/** Lightweight offline geocoding for demo + user-entered locations. */
export type LatLng = { lat: number; lng: number };

export const CITY_COORDS: Record<string, LatLng> = {
  "san francisco": { lat: 37.77, lng: -122.42 },
  "austin": { lat: 30.27, lng: -97.74 },
  "london": { lat: 51.51, lng: -0.13 },
  "barcelona": { lat: 41.39, lng: 2.17 },
  "berlin": { lat: 52.52, lng: 13.4 },
  "toronto": { lat: 43.65, lng: -79.38 },
  "bengaluru": { lat: 12.97, lng: 77.59 },
  "bangalore": { lat: 12.97, lng: 77.59 },
  "ann arbor": { lat: 42.28, lng: -83.74 },
  "new york": { lat: 40.71, lng: -74.01 },
  "seattle": { lat: 47.61, lng: -122.33 },
  "boston": { lat: 42.36, lng: -71.06 },
  "los angeles": { lat: 34.05, lng: -118.24 },
  "chicago": { lat: 41.88, lng: -87.63 },
  "paris": { lat: 48.86, lng: 2.35 },
  "amsterdam": { lat: 52.37, lng: 4.9 },
  "dublin": { lat: 53.35, lng: -6.26 },
  "lisbon": { lat: 38.72, lng: -9.14 },
  "madrid": { lat: 40.42, lng: -3.7 },
  "zurich": { lat: 47.38, lng: 8.54 },
  "stockholm": { lat: 59.33, lng: 18.07 },
  "dubai": { lat: 25.2, lng: 55.27 },
  "tel aviv": { lat: 32.09, lng: 34.78 },
  "mumbai": { lat: 19.08, lng: 72.88 },
  "delhi": { lat: 28.61, lng: 77.21 },
  "hyderabad": { lat: 17.39, lng: 78.49 },
  "pune": { lat: 18.52, lng: 73.86 },
  "chennai": { lat: 13.08, lng: 80.27 },
  "kolkata": { lat: 22.57, lng: 88.36 },
  "singapore": { lat: 1.35, lng: 103.82 },
  "tokyo": { lat: 35.68, lng: 139.69 },
  "seoul": { lat: 37.57, lng: 126.98 },
  "sydney": { lat: -33.87, lng: 151.21 },
  "melbourne": { lat: -37.81, lng: 144.96 },
  "são paulo": { lat: -23.55, lng: -46.63 },
  "sao paulo": { lat: -23.55, lng: -46.63 },
  "mexico city": { lat: 19.43, lng: -99.13 },
  "lagos": { lat: 6.52, lng: 3.38 },
  "nairobi": { lat: -1.29, lng: 36.82 },
  "cape town": { lat: -33.92, lng: 18.42 },
};

const REGION_COORDS: Record<string, LatLng> = {
  in: { lat: 20.59, lng: 78.96 },
  india: { lat: 20.59, lng: 78.96 },
  uk: { lat: 54.0, lng: -2.0 },
  us: { lat: 39.5, lng: -98.35 },
  usa: { lat: 39.5, lng: -98.35 },
  de: { lat: 51.16, lng: 10.45 },
  es: { lat: 40.46, lng: -3.75 },
  ca: { lat: 56.13, lng: -106.35 },
  fr: { lat: 46.6, lng: 2.35 },
  au: { lat: -25.27, lng: 133.78 },
  remote: { lat: 25.0, lng: 10.0 },
};

/** Resolve a free-text location such as "Remote · Berlin, DE" to coordinates. */
export function resolveLocation(input: string | null | undefined): LatLng | null {
  if (!input) return null;
  const text = input.toLowerCase();
  for (const [city, coords] of Object.entries(CITY_COORDS)) {
    if (text.includes(city)) return coords;
  }
  for (const part of text.split(/[,·|/]/).map((p) => p.trim())) {
    const hit = REGION_COORDS[part];
    if (hit) return hit;
  }
  return null;
}
