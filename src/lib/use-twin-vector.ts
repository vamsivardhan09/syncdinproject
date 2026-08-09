import { useEffect, useMemo, useState } from "react";
import { buildTwinVector, type TwinVector } from "@/lib/matching";
import { getMyProfile, profileNoise, type MyProfile } from "@/lib/real-people";
import { useTwin } from "@/lib/twin-store";

/**
 * The signed-in user's Twin vector, built from the SINGLE shared matching
 * engine: demo/training sources plus the real signals extracted from their
 * uploaded material and confirmed during onboarding.
 */
export function useTwinVector(): {
  vector: TwinVector;
  profile: MyProfile | null;
  loading: boolean;
  refresh: () => void;
} {
  const { state, intelligence } = useTwin();
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    void getMyProfile()
      .then((row) => {
        if (alive) setProfile(row);
      })
      .catch(() => {
        if (alive) setProfile(null);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [tick]);

  const vector = useMemo(
    () =>
      buildTwinVector({
        connectedSources: state.connectedSources,
        trainedSources: state.trainedSources,
        connectionsMade: state.connectionsMade,
        intelligence,
        headline: profile?.headline ?? null,
        profileSignals: profileNoise(profile),
      }),
    [state, intelligence, profile],
  );

  return { vector, profile, loading, refresh: () => setTick((t) => t + 1) };
}
