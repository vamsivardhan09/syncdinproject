/// <reference types="google.maps" />

/**
 * Loads the Google Maps JavaScript API once per page, asynchronously.
 * Resolves only after the API has fully initialised (via the callback param).
 */
let loadPromise: Promise<typeof google.maps> | null = null;

const CALLBACK = "__syncdinMapsReady";

export function loadGoogleMaps(): Promise<typeof google.maps> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps can only load in the browser"));
  }
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (loadPromise) return loadPromise;

  const key = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY"] as
    | string
    | undefined;
  const channel = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID"] as
    | string
    | undefined;

  if (!key) {
    return Promise.reject(new Error("Map key missing — reconnect Google Maps for this project."));
  }

  loadPromise = new Promise<typeof google.maps>((resolve, reject) => {
    (window as unknown as Record<string, unknown>)[CALLBACK] = () => {
      resolve(window.google.maps);
    };

    const script = document.createElement("script");
    const params = new URLSearchParams({
      key,
      loading: "async",
      callback: CALLBACK,
      libraries: "geometry",
    });
    if (channel) params.set("channel", channel);
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.async = true;
    script.onerror = () => {
      loadPromise = null;
      reject(new Error("Failed to load the map. Check your connection and try again."));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}
