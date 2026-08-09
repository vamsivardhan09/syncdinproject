import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Coords = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  label: z.string().trim().max(120).optional(),
});

/** Persist the signed-in user's detected GPS position on their profile. */
export const saveMyLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Coords.parse(input))
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {
      latitude: data.latitude,
      longitude: data.longitude,
      location_updated_at: new Date().toISOString(),
    };
    if (data.label) patch["location"] = data.label;

    const { error } = await context.supabase
      .from("profiles")
      .update(patch)
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Read back the stored coordinates so the marker survives refresh and re-login. */
export const getMyLocation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("latitude, longitude, location")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      latitude: data?.latitude ?? null,
      longitude: data?.longitude ?? null,
      label: data?.location ?? null,
    };
  });

/** Forward-geocode a place search through the Google Maps gateway. */
export const searchPlace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ query: z.string().trim().min(2).max(120) }).parse(input))
  .handler(async ({ data }) => {
    const lovableKey = process.env["LOVABLE_API_KEY"];
    const connectionKey = process.env["GOOGLE_MAPS_API_KEY"];
    if (!lovableKey || !connectionKey) throw new Error("Map search is not configured");

    const url = new URL("https://connector-gateway.lovable.dev/google_maps/maps/api/geocode/json");
    url.searchParams.set("address", data.query);

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": connectionKey,
      },
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`Geocoding failed [${res.status}]: ${body}`);
      throw new Error(`Location search failed (${res.status}).`);
    }

    const json = (await res.json()) as {
      status: string;
      results?: {
        formatted_address: string;
        geometry: { location: { lat: number; lng: number } };
      }[];
    };

    const hit = json.results?.[0];
    if (!hit) return { found: false as const };
    return {
      found: true as const,
      label: hit.formatted_address,
      latitude: hit.geometry.location.lat,
      longitude: hit.geometry.location.lng,
    };
  });
