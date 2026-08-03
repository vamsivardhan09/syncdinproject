import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { importSources, trainingSources, twinDimensions } from "@/lib/demo-data";

const STORAGE_KEY = "syncdin.twin.v2";

export type TwinState = {
  onboarded: boolean;
  connectedSources: string[];
  trainedSources: string[];
  connectionsMade: string[];
};

const initialState: TwinState = {
  onboarded: false,
  connectedSources: [],
  trainedSources: [],
  connectionsMade: [],
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
  completeOnboarding: () => void;
  reset: () => void;
};

const TwinContext = createContext<TwinContextValue | null>(null);

function clamp(n: number) {
  return Math.max(0, Math.min(99, Math.round(n)));
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
      career: (has("linkedin") ? 38 : 0) + (has("resume") ? 14 : 0),
      projects: (has("github") ? 34 : 0) + (has("portfolio") ? 16 : 0),
      communication: (has("claude") ? 32 : 0) + (has("chatgpt") ? 14 : 0),
      goals: (has("linkedin") ? 22 : 0) + (has("chatgpt") ? 20 : 0) + (has("gemini") ? 12 : 0),
      network: state.connectionsMade.length * 5 + (has("linkedin") ? 20 : 0),
    } as Record<string, number>;

    return twinDimensions.map((dim) => ({
      key: dim.key,
      label: dim.label,
      value: clamp(dim.base + (boost[dim.key] ?? 0)),
    }));
  }, [state]);

  const connectSource = useCallback((id: string) => {
    setState((prev) =>
      prev.connectedSources.includes(id)
        ? prev
        : { ...prev, connectedSources: [...prev.connectedSources, id] },
    );
  }, []);

  const trainSource = useCallback((id: string) => {
    setState((prev) =>
      prev.trainedSources.includes(id)
        ? prev
        : { ...prev, trainedSources: [...prev.trainedSources, id] },
    );
  }, []);

  const toggleConnection = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      connectionsMade: prev.connectionsMade.includes(id)
        ? prev.connectionsMade.filter((c) => c !== id)
        : [...prev.connectionsMade, id],
    }));
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
