import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";
import { getEnv } from "@/lib/env";
import { useDeviceCheck } from "@/hooks/useDeviceCheck";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  deviceId: string | null;
  deviceApproved: boolean | null;
  login: (email: string, password: string) => Promise<{ success: boolean }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { VITE_ENFORCE_DEVICE_APPROVAL } = getEnv();
  const {
    deviceId,
    approved: deviceApproved,
    verifyDevice,
    registerDevice,
    loading: deviceLoading,
  } = useDeviceCheck();

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const {
        data: { session: currentSession },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError) {
        setError(sessionError.message);
      } else {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
      }
      setLoading(false);
    };
    void init();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
    });
    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      setError(null);
      try {
        // 1. Look up the platform admin by email
        const { data: admin, error: adminError } = await supabase
          .from("platform_admins")
          .select("id, allowed, role")
          .eq("email", email)
          .maybeSingle();

        if (adminError) {
          setError("Failed to verify platform admin status");
          return { success: false };
        }

        if (!admin) {
          setError("Not authorized as a platform admin");
          return { success: false };
        }

        if (!admin.allowed) {
          setError("Platform admin account is disabled");
          return { success: false };
        }

        // 2. Optionally enforce device approval
        if (VITE_ENFORCE_DEVICE_APPROVAL) {
          const deviceStatus = await verifyDevice(admin.id);
          if (!deviceStatus.approved) {
            const attemptRegister = await registerDevice(admin.id);
            const message = attemptRegister.success
              ? "Device registered but not approved. Contact a super admin."
              : "Device not approved.";
            setError(message);
            return { success: false };
          }
        } else {
          // Best-effort: still record device for future enforcement, but do not block login.
          void registerDevice(admin.id);
        }

        // 3. Sign in with Supabase Auth
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) {
          setError(signInError.message);
          return { success: false };
        }
        setSession(data.session);
        setUser(data.user ?? null);
        return { success: true };
      } catch (err) {
        console.error("Login failed", err);
        setError("Unable to login");
        return { success: false };
      } finally {
        setLoading(false);
      }
    },
    [VITE_ENFORCE_DEVICE_APPROVAL, registerDevice, verifyDevice],
  );

  const logout = useCallback(async () => {
    setLoading(true);
    setError(null);
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setLoading(false);
  }, []);

  const refreshSession = useCallback(async () => {
    const {
      data: { session: freshSession },
      error: refreshError,
    } = await supabase.auth.getSession();
    if (refreshError) {
      setError(refreshError.message);
    } else {
      setSession(freshSession);
      setUser(freshSession?.user ?? null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      loading: loading || deviceLoading,
      error,
      deviceId,
      deviceApproved,
      login,
      logout,
      refreshSession,
    }),
    [deviceApproved, deviceId, deviceLoading, error, loading, login, logout, refreshSession, session, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
