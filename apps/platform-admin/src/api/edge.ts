import { getEnv } from "@/lib/env";
import { supabase } from "@/lib/supabase";

type CallOptions = {
  method?: "GET" | "POST";
  query?: Record<string, string | number | boolean | null | undefined>;
  body?: unknown;
};

function toQueryString(query: CallOptions["query"]) {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null) continue;
    params.set(k, String(v));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export async function callEdgeFunction<T>(name: string, opts: CallOptions = {}): Promise<T> {
  const { VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY } = getEnv();
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) {
    throw new Error("Not authenticated");
  }

  const callWithToken = async (accessToken: string) => {
    const url = `${VITE_SUPABASE_URL}/functions/v1/${name}${toQueryString(opts.query)}`;
    return fetch(url, {
      method: opts.method ?? (opts.body ? "POST" : "GET"),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        apikey: VITE_SUPABASE_ANON_KEY,
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
  };

  let res = await callWithToken(data.session.access_token);

  // If the session token is expired/invalid, refresh and retry once.
  if (res.status === 401) {
    const refreshed = await supabase.auth.refreshSession().catch(() => null);
    const newToken = refreshed?.data?.session?.access_token;
    if (newToken) {
      res = await callWithToken(newToken);
    }
  }

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = json?.message ?? `Request failed (${res.status})`;
    if (res.status === 401) {
      // Ensure we don't get stuck in a bad persisted session.
      await supabase.auth.signOut().catch(() => null);
      if (typeof window !== "undefined") {
        const redirect = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.assign(`/login?redirect=${redirect}`);
      }
      throw new Error("Session expired. Please sign in again.");
    }
    throw new Error(msg);
  }
  return json as T;
}








