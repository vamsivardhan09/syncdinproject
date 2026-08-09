/**
 * Resolves a persisted `peer_slug` back to a person.
 *
 * Connections store only the peer slug, and event attendees are generated
 * deterministically from the demo personas, so a slug like
 * `aws-summit-bengaluru-a12` can be rebuilt exactly after a refresh.
 */
import { demoPeople, personById, type DemoPerson } from "@/lib/demo-data";
import { attendeesFor, networkByCode } from "@/lib/event-network";

const cache = new Map<string, DemoPerson | null>();

export function resolvePerson(slug: string): DemoPerson | null {
  if (cache.has(slug)) return cache.get(slug) ?? null;

  let found: DemoPerson | null = personById(slug) ?? null;

  if (!found) {
    const match = /^(.*)-a\d+$/.exec(slug);
    const network = match?.[1] ? networkByCode(match[1]) : undefined;
    if (network) {
      found = attendeesFor(network).find((a) => a.id === slug) ?? null;
    }
  }

  cache.set(slug, found);
  return found;
}

/** Resolves many slugs, dropping anything unknown. */
export function resolvePeople(slugs: string[]): DemoPerson[] {
  return slugs.map(resolvePerson).filter((p): p is DemoPerson => p !== null);
}

export { demoPeople };
