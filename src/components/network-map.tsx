/// <reference types="google.maps" />
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Crosshair, Globe2, Loader2, MapPin, MessageCircle, Minus, Plus, Search, TriangleAlert } from "lucide-react";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { loadGoogleMaps } from "@/lib/google-maps-loader";
import { getMyLocation, saveMyLocation, searchPlace } from "@/lib/map-location.functions";
import { cn } from "@/lib/utils";

type MapPerson = {
  slug: string;
  name: string;
  role: string;
  company: string;
  kind: string;
  location: string;
  photo_url: string;
  match: number;
  latitude: number;
  longitude: number;
};

type Me = { lat: number; lng: number; label: string | null };

const MAP_STYLE: google.maps.MapTypeStyle[] = [
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
];

/** Airbnb-style pill marker rendered as an inline SVG icon. */
function pillIcon(maps: typeof google.maps, label: string, highlight: boolean) {
  const w = 58;
  const h = 30;
  const bg = highlight ? "#4f39c8" : "#ffffff";
  const fg = highlight ? "#ffffff" : "#16162a";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h + 6}" viewBox="0 0 ${w} ${h + 6}">
    <g filter="none">
      <rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="${(h - 2) / 2}" fill="${bg}" stroke="rgba(20,20,40,0.16)"/>
      <path d="M${w / 2 - 5},${h - 2} L${w / 2},${h + 4} L${w / 2 + 5},${h - 2} Z" fill="${bg}"/>
      <text x="${w / 2}" y="${h / 2 + 4.5}" text-anchor="middle" font-family="system-ui,-apple-system,Segoe UI,sans-serif" font-size="13" font-weight="700" fill="${fg}">${label}</text>
    </g>
  </svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new maps.Size(w, h + 6),
    anchor: new maps.Point(w / 2, h + 6),
  } satisfies google.maps.Icon;
}

function meIcon(maps: typeof google.maps) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">
    <circle cx="22" cy="22" r="20" fill="#4f39c8" fill-opacity="0.16"/>
    <circle cx="22" cy="22" r="9" fill="#4f39c8" stroke="#ffffff" stroke-width="3"/>
  </svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new maps.Size(44, 44),
    anchor: new maps.Point(22, 22),
  } satisfies google.maps.Icon;
}

function infoContent(p: MapPerson) {
  const el = document.createElement("div");
  el.style.maxWidth = "230px";
  el.style.font = "13px system-ui,-apple-system,Segoe UI,sans-serif";
  el.innerHTML = `
    <div style="display:flex;gap:10px;align-items:flex-start">
      <img src="${p.photo_url}" alt="" width="42" height="42" style="border-radius:12px;object-fit:cover"/>
      <div style="min-width:0">
        <div style="font-weight:700">${p.name}</div>
        <div style="color:#5a5a70">${p.role} · ${p.company}</div>
        <div style="color:#5a5a70;margin-top:2px">${p.location}</div>
        <div style="margin-top:4px;font-weight:700;color:#4f39c8">${p.match}% match</div>
      </div>
    </div>
    <a href="/messages/${p.slug}" style="display:block;margin-top:10px;text-align:center;background:#4f39c8;color:#fff;border-radius:10px;padding:7px 10px;font-weight:600;text-decoration:none">Open Twin chat</a>
  `;
  return el;
}

export function NetworkMap() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const meMarkerRef = useRef<google.maps.Marker | null>(null);
  const infoRef = useRef<google.maps.InfoWindow | null>(null);
  const searchMarkerRef = useRef<google.maps.Marker | null>(null);

  const [mapsError, setMapsError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationNote, setLocationNote] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [visibleSlugs, setVisibleSlugs] = useState<string[] | null>(null);
  const [visibleBoundsKey, setVisibleBoundsKey] = useState<string | null>(null);

  const persistLocation = useServerFn(saveMyLocation);
  const readLocation = useServerFn(getMyLocation);
  const geocode = useServerFn(searchPlace);

  const peopleQuery = useQuery({
    queryKey: ["map-people"],
    queryFn: async (): Promise<MapPerson[]> => {
      const { data, error } = await supabase
        .from("demo_profiles")
        .select("slug, name, role, company, kind, location, photo_url, match, latitude, longitude")
        .not("latitude", "is", null)
        .not("longitude", "is", null)
        .order("match", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []).filter(
        (r): r is MapPerson => r.latitude !== null && r.longitude !== null,
      );
    },
  });

  const people = peopleQuery.data ?? [];

  /** Initialise the map exactly once. */
  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then((maps) => {
        if (cancelled || !containerRef.current || mapRef.current) return;
        const map = new maps.Map(containerRef.current, {
          center: { lat: 25, lng: 5 },
          zoom: 2,
          disableDefaultUI: true,
          zoomControl: false,
          gestureHandling: "greedy",
          clickableIcons: false,
          styles: MAP_STYLE,
          minZoom: 2,
          maxZoom: 18,
        });
        mapRef.current = map;
        infoRef.current = new maps.InfoWindow();
        map.addListener("idle", () => {
          const bounds = map.getBounds();
          if (!bounds) return;
          setVisibleSlugs(null);
          setVisibleBoundsKey(bounds.toUrlValue(4));
        });
        setMapReady(true);
      })
      .catch((err: Error) => {
        if (!cancelled) setMapsError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /** Restore the stored location so the "you are here" pin survives refresh. */
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const stored = await readLocation({});
        if (cancelled || stored.latitude === null || stored.longitude === null) return;
        setMe({ lat: stored.latitude, lng: stored.longitude, label: stored.label });
      } catch {
        /* not signed in yet or no stored location */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [readLocation]);

  /** Draw / refresh listing markers with clustering. */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || people.length === 0) return;
    const maps = window.google.maps;

    const markers = people.map((p) => {
      const marker = new maps.Marker({
        position: { lat: p.latitude, lng: p.longitude },
        icon: pillIcon(maps, `${p.match}%`, false),
        title: `${p.name} — ${p.location}`,
      });
      marker.addListener("click", () => {
        marker.setIcon(pillIcon(maps, `${p.match}%`, true));
        infoRef.current?.setContent(infoContent(p));
        infoRef.current?.open({ map, anchor: marker });
        maps.event.addListenerOnce(infoRef.current!, "closeclick", () =>
          marker.setIcon(pillIcon(maps, `${p.match}%`, false)),
        );
      });
      return marker;
    });

    clustererRef.current?.clearMarkers();
    clustererRef.current = new MarkerClusterer({ map, markers });

    const bounds = new maps.LatLngBounds();
    for (const p of people) bounds.extend({ lat: p.latitude, lng: p.longitude });
    if (me) bounds.extend({ lat: me.lat, lng: me.lng });
    map.fitBounds(bounds, 64);

    return () => {
      clustererRef.current?.clearMarkers();
      for (const m of markers) m.setMap(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, people, me?.lat, me?.lng]);

  /** Keep the "you are here" marker in sync. */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const maps = window.google.maps;
    if (!me) {
      meMarkerRef.current?.setMap(null);
      meMarkerRef.current = null;
      return;
    }
    if (!meMarkerRef.current) {
      meMarkerRef.current = new maps.Marker({
        map,
        icon: meIcon(maps),
        zIndex: 999,
        title: me.label ? `You are here — ${me.label}` : "You are here",
      });
    }
    meMarkerRef.current.setPosition({ lat: me.lat, lng: me.lng });
  }, [me, mapReady]);

  const visiblePeople = useMemo(() => {
    const map = mapRef.current;
    const bounds = map?.getBounds();
    if (!bounds || !visibleBoundsKey) return people;
    return people.filter((p) => bounds.contains({ lat: p.latitude, lng: p.longitude }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [people, visibleBoundsKey, visibleSlugs]);

  const locateMe = useCallback(() => {
    setLocationNote(null);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationNote("Your browser does not support location access.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude, label: me?.label ?? null };
        setMe(next);
        mapRef.current?.panTo({ lat: next.lat, lng: next.lng });
        mapRef.current?.setZoom(11);
        try {
          await persistLocation({ data: { latitude: next.lat, longitude: next.lng } });
          setLocationNote("Location saved to your profile.");
        } catch {
          setLocationNote("Found you, but saving to your profile failed. Try again.");
        }
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        setLocationNote(
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied. Enable it in your browser settings to place your pin."
            : "We couldn't get your location. Try again.",
        );
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, [me?.label, persistLocation]);

  const runSearch = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const q = query.trim();
      if (q.length < 2 || !mapRef.current) return;
      setSearching(true);
      setLocationNote(null);
      try {
        const hit = await geocode({ data: { query: q } });
        if (!hit.found) {
          setLocationNote(`No place found for "${q}".`);
          return;
        }
        const maps = window.google.maps;
        searchMarkerRef.current?.setMap(null);
        searchMarkerRef.current = new maps.Marker({
          map: mapRef.current,
          position: { lat: hit.latitude, lng: hit.longitude },
          title: hit.label,
        });
        mapRef.current.panTo({ lat: hit.latitude, lng: hit.longitude });
        mapRef.current.setZoom(9);
      } catch (err) {
        setLocationNote(err instanceof Error ? err.message : "Search failed.");
      } finally {
        setSearching(false);
      }
    },
    [geocode, query],
  );

  const zoomBy = (delta: number) => {
    const map = mapRef.current;
    if (!map) return;
    map.setZoom(Math.max(2, Math.min(18, (map.getZoom() ?? 2) + delta)));
  };

  return (
    <section aria-labelledby="network-map-heading" className="surface-card overflow-hidden">
      <div className="flex flex-wrap items-end justify-between gap-3 p-5 pb-4">
        <div className="min-w-0">
          <h2 id="network-map-heading" className="flex items-center gap-2 text-xl font-bold">
            <Globe2 aria-hidden="true" className="size-5 text-primary" /> Your network on the map
          </h2>
          <p className="text-sm text-muted-foreground">
            {peopleQuery.isLoading
              ? "Loading matches…"
              : `${visiblePeople.length} of ${people.length} matches in view${
                  me ? ` — your pin is set${me.label ? ` near ${me.label}` : ""}` : ""
                }.`}
          </p>
        </div>
        <form onSubmit={runSearch} className="flex w-full max-w-sm items-center gap-2">
          <div className="relative flex-1">
            <Search
              aria-hidden="true"
              className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search a city or region"
              aria-label="Search the map by place"
              className="h-10 pl-9"
            />
          </div>
          <Button type="submit" size="sm" variant="secondary" disabled={searching}>
            {searching ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : "Search"}
          </Button>
        </form>
      </div>

      <div className="relative">
        <div
          ref={containerRef}
          role="application"
          aria-label="Interactive world map of your AI Twin network"
          className="h-[380px] w-full bg-muted sm:h-[520px]"
        />

        {mapsError ? (
          <div className="absolute inset-0 grid place-items-center bg-card/95 p-6 text-center">
            <div>
              <TriangleAlert aria-hidden="true" className="mx-auto size-6 text-destructive" />
              <p className="mt-2 text-sm font-semibold">Map unavailable</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{mapsError}</p>
            </div>
          </div>
        ) : !mapReady || peopleQuery.isLoading ? (
          <div className="absolute inset-0 grid place-items-center bg-muted/70">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 aria-hidden="true" className="size-4 animate-spin" /> Loading map…
            </p>
          </div>
        ) : null}

        {peopleQuery.isError ? (
          <div className="absolute inset-x-4 top-4 rounded-xl border border-destructive/40 bg-card/95 p-3 text-sm">
            Couldn&apos;t load matches.{" "}
            <button
              type="button"
              className="focus-ring font-semibold text-primary underline-offset-2 hover:underline"
              onClick={() => void peopleQuery.refetch()}
            >
              Retry
            </button>
          </div>
        ) : null}

        {mapReady && !mapsError ? (
          <div className="absolute top-4 right-4 flex flex-col gap-2">
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-lift">
              <button
                type="button"
                onClick={() => zoomBy(1)}
                aria-label="Zoom in"
                className="focus-ring grid size-10 place-items-center hover:bg-muted"
              >
                <Plus aria-hidden="true" className="size-4" />
              </button>
              <div className="h-px bg-border" />
              <button
                type="button"
                onClick={() => zoomBy(-1)}
                aria-label="Zoom out"
                className="focus-ring grid size-10 place-items-center hover:bg-muted"
              >
                <Minus aria-hidden="true" className="size-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={locateMe}
              disabled={locating}
              aria-label="Show my current location"
              className={cn(
                "focus-ring grid size-10 place-items-center rounded-xl border border-border bg-card shadow-lift hover:bg-muted",
                locating && "opacity-60",
              )}
            >
              {locating ? (
                <Loader2 aria-hidden="true" className="size-4 animate-spin" />
              ) : (
                <Crosshair aria-hidden="true" className="size-4 text-primary" />
              )}
            </button>
          </div>
        ) : null}

        {locationNote ? (
          <p className="absolute bottom-4 left-4 max-w-xs rounded-xl border border-border bg-card/95 px-3 py-2 text-xs text-muted-foreground shadow-lift">
            {locationNote}
          </p>
        ) : null}
      </div>

      <ul className="grid gap-2 border-t border-border p-4 sm:grid-cols-2 lg:grid-cols-3">
        {visiblePeople.slice(0, 6).map((p) => (
          <li key={p.slug}>
            <Link
              to="/messages/$peer"
              params={{ peer: p.slug }}
              className="focus-ring flex items-center gap-3 rounded-xl border border-border p-2.5 transition-colors hover:bg-muted"
            >
              <img
                src={p.photo_url}
                alt={p.name}
                loading="lazy"
                className="size-9 rounded-lg object-cover"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{p.name}</span>
                <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                  <MapPin aria-hidden="true" className="size-3" /> {p.location}
                </span>
              </span>
              <Badge variant="secondary" className="font-mono">
                {p.match}%
              </Badge>
              <MessageCircle aria-hidden="true" className="size-4 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
