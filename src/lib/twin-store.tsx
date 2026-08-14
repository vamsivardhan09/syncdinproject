import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";
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

/** Result of a persisted connection attempt — never a fake success. */
export type ConnectResult = { ok: boolean; error?: string };

type TwinContextValue = {
  state: TwinState;
  hydrated: boolean;
  intelligence: number;
  dimensions: { key: string; label: string; value: number }[];
  gainFor: (id: string) => number;
  connectSource: (id: string) => void;
  trainSource: (id: string) => void;
  toggleConnection: (id: string) => Promise<ConnectResult>;
  connect: (id: string) => Promise<ConnectResult>;
  /** Peer slugs whose write is currently in flight. */
  pendingConnections: string[];
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

/** Logs a new connection as activity so it resurfaces in "While you were away". */
async function noteNewConnection(peerSlug: string) {
  try {
    const { noteConnection } = await import("@/lib/network-activity");
    const { resolvePerson } = await import("@/lib/people-directory");
    await noteConnection(
      resolvePerson(peerSlug)?.name ?? "a new match",
      "Your Twins have exchanged context — open the conversation to take it from here.",
    );
  } catch {
    /* offline or signed out */
  }
}





/**
 * Writes the connection to the database and reports the outcome, so the UI can
 * show a real error instead of an optimistic success that vanishes on refresh.
 */
async function persistConnection(peerSlug: string, remove = false): Promise<ConnectResult> {
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase.auth.getUser();
    if (!data.user) return { ok: false, error: "You need to be signed in to save connections." };
    if (remove) {
      const { error } = await supabase
        .from("connections")
        .delete()
        .eq("user_id", data.user.id)
        .eq("peer_slug", peerSlug);
      return error ? { ok: false, error: error.message } : { ok: true };
    }
    const { error } = await supabase
      .from("connections")
      .upsert(
        { user_id: data.user.id, peer_slug: peerSlug, status: "connected" },
        { onConflict: "user_id,peer_slug" },
      );
    return error ? { ok: false, error: error.message } : { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Network error." };
  }
}

/**
 * Reads the server's copy of the Twin. The database is the source of truth:
 * a row deleted on the server must not come back from this device's cache.
 */
async function loadRemoteState(): Promise<Partial<TwinState> | null> {
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase.auth.getUser();
    if (!data.user) return null;
    const [sources, connections, profile] = await Promise.all([
      supabase.from("twin_sources").select("source_id, kind"),
      supabase.from("connections").select("peer_slug"),
      supabase.from("profiles").select("onboarded").eq("id", data.user.id).maybeSingle(),
    ]);
    const rows = sources.data ?? [];
    return {
      connectedSources: rows.filter((r) => r.kind === "import").map((r) => r.source_id),
      trainedSources: rows.filter((r) => r.kind === "training").map((r) => r.source_id),
      connectionsMade: (connections.data ?? []).map((r) => r.peer_slug),
      onboarded: profile.data?.onboarded ?? false,
    };
  } catch {
    return null;
  }
}




export function TwinProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TwinState>(initialState);
  const [hydrated, setHydrated] = useState(false);
  const [pendingConnections, setPending] = useState<string[]>([]);
  const stateRef = useRef(state);
  stateRef.current = state;



  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setState({ ...initialState, ...(JSON.parse(raw) as Partial<TwinState>) });
    } catch {
      /* ignore corrupt state */
    }
    setHydrated(true);
  }, []);

  // The backend is authoritative once it answers: local cache only bridges the
  // first paint, so anything removed server-side stays removed here.
  useEffect(() => {
    let active = true;
    void loadRemoteState().then((remote) => {
      if (!active || !remote) return;
      setState((prev) => ({
        ...prev,
        connectedSources: remote.connectedSources ?? [],
        trainedSources: remote.trainedSources ?? [],
        connectionsMade: remote.connectionsMade ?? [],
        onboarded: remote.onboarded ?? prev.onboarded,
      }));
    });
    return () => {
      active = false;
    };
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


  /**
   * Adds a connection optimistically, then rolls it back and surfaces the real
   * error if the database write fails. Never reports a success that isn't saved.
   */
  const connect = useCallback(async (id: string): Promise<ConnectResult> => {
    let already = false;
    setState((prev) => {
      already = prev.connectionsMade.includes(id);
      return already ? prev : { ...prev, connectionsMade: [...prev.connectionsMade, id] };
    });
    if (already) return { ok: true };
    setPending((p) => (p.includes(id) ? p : [...p, id]));
    const result = await persistConnection(id);
    setPending((p) => p.filter((x) => x !== id));
    if (!result.ok) {
      setState((prev) => ({
        ...prev,
        connectionsMade: prev.connectionsMade.filter((c) => c !== id),
      }));
      toast.error("Couldn't save that connection", {
        description: result.error ?? "Please try again.",
      });
      return result;
    }
    await noteNewConnection(id);
    return result;
  }, []);

  const disconnect = useCallback(async (id: string): Promise<ConnectResult> => {
    setState((prev) => ({
      ...prev,
      connectionsMade: prev.connectionsMade.filter((c) => c !== id),
    }));
    setPending((p) => (p.includes(id) ? p : [...p, id]));
    const result = await persistConnection(id, true);
    setPending((p) => p.filter((x) => x !== id));
    if (!result.ok) {
      setState((prev) => ({
        ...prev,
        connectionsMade: prev.connectionsMade.includes(id)
          ? prev.connectionsMade
          : [...prev.connectionsMade, id],
      }));
      toast.error("Couldn't remove that connection", {
        description: result.error ?? "Please try again.",
      });
    }
    return result;
  }, []);

  const toggleConnection = useCallback(
    (id: string): Promise<ConnectResult> =>
      stateRef.current.connectionsMade.includes(id) ? disconnect(id) : connect(id),
    [connect, disconnect],
  );




  const joinNetwork = useCallback((code: string) => {
    setState((prev) =>
      prev.joinedNetworks.includes(code)
        ? prev
        : { ...prev, joinedNetworks: [...prev.joinedNetworks, code] },
    );
  }, []);

  // Onboarding completion is a server fact: it also makes the member
  // discoverable so other real accounts can find and connect with them.
  const completeOnboarding = useCallback(() => {
    setState((prev) => ({ ...prev, onboarded: true }));
    void (async () => {
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const { data } = await supabase.auth.getUser();
        if (!data.user) return;
        await supabase
          .from("profiles")
          .update({ onboarded: true, is_discoverable: true })
          .eq("id", data.user.id);
      } catch {
        /* the local flag still lets the user continue */
      }
    })();
  }, []);


  const reset = useCallback(() => {
    setState(initialState);
    void (async () => {
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const { data } = await supabase.auth.getUser();
        if (!data.user) return;
        await Promise.all([
          supabase.from("twin_sources").delete().eq("user_id", data.user.id),
          supabase.from("connections").delete().eq("user_id", data.user.id),
        ]);
      } catch {
        /* local reset still applies */
      }
    })();
  }, []);

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
      pendingConnections,
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
