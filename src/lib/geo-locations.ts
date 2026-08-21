/**
 * City coordinates for the seeded demo personas.
 *
 * These mirror the `latitude` / `longitude` already stored on `demo_profiles`,
 * so the geographic network map can place demo people without inventing
 * locations. Real SyncdIn members are NEVER resolved through this table — their
 * coordinates come from their own stored `profiles.latitude/longitude`.
 */
export type LatLng = { latitude: number; longitude: number };

const CITY_COORDS: Record<string, LatLng> = {
  "san francisco, ca": { latitude: 37.7749295, longitude: -122.4194155 },
  "austin, tx": { latitude: 30.267153, longitude: -97.7430608 },
  "london, uk": { latitude: 51.5072178, longitude: -0.1275862 },
  "barcelona, es": { latitude: 41.3874374, longitude: 2.1686496 },
  "berlin, de": { latitude: 52.5200066, longitude: 13.404954 },
  "toronto, ca": { latitude: 43.6548253, longitude: -79.388447 },
  "bengaluru, in": { latitude: 12.9628957, longitude: 77.57754 },
  "ann arbor, mi": { latitude: 42.2808256, longitude: -83.7430378 },
  "bengaluru international exhibition centre, india": {
    latitude: 13.0637,
    longitude: 77.4776,
  },
};

/** Returns known coordinates for a demo location string, or null. */
export function demoCoordsFor(location: string | null | undefined): LatLng | null {
  if (!location) return null;
  return CITY_COORDS[location.trim().toLowerCase()] ?? null;
}
