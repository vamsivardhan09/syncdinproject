import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { importSources, trainingSources, twinDimensions } from "@/lib/demo-data";

const STORAGE_KEY = "syncdin.twin.v2";

export type TwinState = {
  onboarded: boolean;
  connectedSources: string[];
  trainedSources: string[];
  connectionsMade: string[];
  /** Event/community networks the user's Twin has joined. */
  joinedNetworks: string[];
};

const initialState: TwinState = {
  onboarded: false,
  connectedSources: [],
  trainedSources: [],
  connectionsMade: [],
  joinedNetworks: [],
};

type TwinContextValue = {
  state: TwinState;
  hydrated: boolean;
  intelligence: number;
  dimensions: { key: string; label: string; value: number }[];
  gainFor: (id: string) => number;
  connectSource: (id: string) => void;
  trainSource: (id: string) => void;
  toggleConnection: (id: string) => void;
  connect: (id: string) => void;
  joinNetwork: (code: string) => void;
  completeOnboarding: () => void;
  reset: () => void;
};

const TwinContext = createContext<TwinContextValue | null>(null);

function clamp(n: number) {
  return Math.max(0, Math.min(99, Math.round(n)));
}

/** Mirrors connected sources to the backend so progress survives a device change. */
async function persistSource(sourceId: string, kind: string, gain: number) {
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    await supabase
      .from("twin_sources")
      .upsert(
        { user_id: data.user.id, source_id: sourceId, kind, gain },
        { onConflict: "user_id,source_id" },
      );
  } catch {
    /* offline or signed out — local state still holds */
  }
}


export function TwinProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TwinState>(initialState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setState({ ...initialState, ...(JSON.parse(raw) as Partial<TwinState>) });
    } catch {
      /* ignore corrupt state */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable */
    }
  }, [state, hydrated]);

  const gainFor = useCallback((id: string) => {
    const imported = importSources.find((s) => s.id === id);
    if (imported) return imported.gain;
    const trained = trainingSources.find((s) => s.id === id);
    return trained ? trained.gain : 0;
  }, []);

  const intelligence = useMemo(() => {
    const base = 18;
    const earned = [...state.connectedSources, ...state.trainedSources].reduce(
      (total, id) => total + gainFor(id),
      0,
    );
    return clamp(base + earned + state.connectionsMade.length * 1.5);
  }, [state, gainFor]);

  const dimensions = useMemo(() => {
    const has = (id: string) =>
      state.connectedSources.includes(id) || state.trainedSources.includes(id);
    const boost = {
      career: (has("linkedin") ? 44 : 0) + (has("resume") ? 22 : 0),
      projects: (has("github") ? 40 : 0) + (has("portfolio") ? 20 : 0) + (has("resume") ? 10 : 0),
      skills: (has("github") ? 30 : 0) + (has("linkedin") ? 22 : 0) + (has("resume") ? 14 : 0),
      communication: (has("claude") ? 40 : 0) + (has("chatgpt") ? 20 : 0) + (has("portfolio") ? 8 : 0),
      goals: (has("linkedin") ? 24 : 0) + (has("chatgpt") ? 22 : 0) + (has("resume") ? 10 : 0),
      learning: (has("gemini") ? 40 : 0) + (has("github") ? 14 : 0),
      networking: state.connectionsMade.length * 6 + (has("linkedin") ? 22 : 0),
    } as Record<string, number>;

    return twinDimensions.map((dim) => ({
      key: dim.key,
      label: dim.label,
      value: clamp(dim.base + (boost[dim.key] ?? 0)),
    }));
  }, [state]);

  const connectSource = useCallback(
    (id: string) => {
      setState((prev) =>
        prev.connectedSources.includes(id)
          ? prev
          : { ...prev, connectedSources: [...prev.connectedSources, id] },
      );
      void persistSource(id, "import", gainFor(id));
    },
    [gainFor],
  );

  const trainSource = useCallback(
    (id: string) => {
      setState((prev) =>
        prev.trainedSources.includes(id)
          ? prev
          : { ...prev, trainedSources: [...prev.trainedSources, id] },
      );
      void persistSource(id, "training", gainFor(id));
    },
    [gainFor],
  );


  const toggleConnection = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      connectionsMade: prev.connectionsMade.includes(id)
        ? prev.connectionsMade.filter((c) => c !== id)
        : [...prev.connectionsMade, id],
    }));
  }, []);

  const connect = useCallback((id: string) => {
    setState((prev) =>
      prev.connectionsMade.includes(id)
        ? prev
        : { ...prev, connectionsMade: [...prev.connectionsMade, id] },
    );
  }, []);

  const joinNetwork = useCallback((code: string) => {
    setState((prev) =>
      prev.joinedNetworks.includes(code)
        ? prev
        : { ...prev, joinedNetworks: [...prev.joinedNetworks, code] },
    );
  }, []);

  const completeOnboarding = useCallback(() => {
    setState((prev) => ({ ...prev, onboarded: true }));
  }, []);

  const reset = useCallback(() => setState(initialState), []);

  const value = useMemo(
    () => ({
      state,
      hydrated,
      intelligence,
      dimensions,
      gainFor,
      connectSource,
      trainSource,
      toggleConnection,
      connect,
      joinNetwork,
      completeOnboarding,
      reset,
    }),
    [
      state,
      hydrated,
      intelligence,
      dimensions,
      gainFor,
      connectSource,
      trainSource,
      toggleConnection,
      connect,
      joinNetwork,
      completeOnboarding,
      reset,
    ],
  );

  return <TwinContext.Provider value={value}>{children}</TwinContext.Provider>;
}

export function useTwin() {
  const ctx = useContext(TwinContext);
  if (!ctx) throw new Error("useTwin must be used inside TwinProvider");
  return ctx;
}
