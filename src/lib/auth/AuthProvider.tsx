/**
 * AuthProvider.tsx — Single auth provider
 *
 * Replaces both SupabaseAuthProvider and LegacyAuthProvider.
 * One provider, one context, one hook.
 *
 * Session refresh: Delegates entirely to Supabase's autoRefreshToken.
 * No manual setInterval timers. We subscribe to onAuthStateChange and
 * update React state reactively.
 */

import { useState, useEffect, createContext, useContext, useCallback, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  parseClaims,
  getUserContext,
  isTokenExpired as checkTokenExpired,
  getTimeUntilExpiration as getExpiration,
} from './claims';
import type { JWTClaims, UserContext } from './claims';
// Backward-compat: keep static singleton in sync until Phase 4 cleanup
import { JWTClaimsService } from '@/lib/services/auth/jwt-claims';

// ── Profile type (matches the profiles table we're migrating to) ─────────────

export interface UserProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  organization_id: string | null;
  role: string;
  created_at: string;
  updated_at: string;
}

// ── Context shape ────────────────────────────────────────────────────────────

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register?: (email: string, password: string, metadata?: Record<string, any>) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  // OBAC integration
  userContext: UserContext | null;
  claims: JWTClaims | null;
  isTokenExpired: boolean;
  timeUntilExpiration: number | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ── Helpers ──────────────────────────────────────────────────────────────────

const ROLE_PRIORITY = [
  'PLATFORM_SUPER_ADMIN', 'ORG_ADMIN', 'ORG_HR_ADMIN',
  'ORG_FINANCE_CONTROLLER', 'ORG_AUDITOR', 'COMPANY_PAYROLL_ADMIN',
  'COMPANY_HR', 'PROJECT_MANAGER', 'SELF_USER',
];

function resolvePrimaryRole(roleCodes: string[]): string {
  for (const candidate of ROLE_PRIORITY) {
    if (roleCodes.includes(candidate)) return candidate;
  }
  return 'SELF_USER';
}

// ── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const [claims, setClaims] = useState<JWTClaims | null>(null);

  // ---------- profile fetch ------------------------------------------------

  const fetchProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    try {
      // Query user_profiles (will become a view pointing to `profiles` post-migration)
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, email, first_name, last_name, organization_id, created_at, updated_at')
        .eq('id', userId)
        .single();

      if (error || !data) return null;

      // Resolve primary role from RBAC assignments
      const { data: assignments } = await (supabase
        .from('rbac_assignments' as any)
        .select('role_code')
        .eq('user_id', userId) as any);

      const roleCodes = (assignments || []).map((a: any) => a.role_code);
      const primaryRole = resolvePrimaryRole(roleCodes);

      return { ...(data as any), role: primaryRole };
    } catch {
      return null;
    }
  }, []);

  // ---------- account status -----------------------------------------------

  const checkAccountActive = useCallback(async (s: Session): Promise<boolean> => {
    const uid = s.user?.id;
    if (!uid) return true;

    // Skip account-status check on the set-password page — the user is
    // activating their account for the first time and may still be marked
    // "inactive" or "invited" in the DB.
    if (typeof window !== 'undefined' && window.location.pathname === '/set-password') {
      return true;
    }

    try {
      const { data } = await supabase
        .from('user_profiles')
        .select('status')
        .eq('id', uid)
        .maybeSingle();

      if (data?.status === 'inactive') {
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setProfile(null);
        setUserContext(null);
        setClaims(null);
        toast({
          title: 'Account inactive',
          description: 'Your account has been deactivated. Contact your administrator.',
          variant: 'destructive',
        });
        return false;
      }
    } catch { /* non-blocking */ }
    return true;
  }, []);

  // ---------- update all state from a session ------------------------------

  const hydrateFromSession = useCallback(
    async (s: Session | null, opts?: { skipProfile?: boolean }) => {
      setSession(s);
      setUser(s?.user ?? null);

      // Keep legacy singleton in sync for non-hook consumers (AuditLogger, AccessControlService, etc.)
      JWTClaimsService.setCurrentSession(s);

      if (s) {
        const ctx = getUserContext(s);
        const jwt = parseClaims(s);
        setUserContext(ctx);
        setClaims(jwt);

        if (!opts?.skipProfile) {
          // Non-blocking profile fetch
          fetchProfile(s.user.id).then((p) => {
            if (p) setProfile(p);
          });
        }
      } else {
        setProfile(null);
        setUserContext(null);
        setClaims(null);
      }
    },
    [fetchProfile],
  );

  // ---------- init ---------------------------------------------------------

  useEffect(() => {
    let isMounted = true;

    // Safety timeout — never let auth loading hang forever
    const timeout = setTimeout(() => {
      if (isMounted) setIsLoading(false);
    }, 10_000);

    // 1. Subscribe to auth state changes FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, s) => {
      if (!isMounted) return;
      try {
        // Hydrate immediately so isAuthenticated is true right away.
        // The account-active check runs async after — if the account is
        // inactive, checkAccountActive will sign the user out.
        await hydrateFromSession(s);
        if (isMounted) setIsLoading(false);

        // Non-blocking account status check
        if (s?.user) {
          checkAccountActive(s).catch(() => {});
        }
      } catch (err) {
        console.error('[auth] onAuthStateChange error:', err);
        setSession(null);
        setUser(null);
        setProfile(null);
        setUserContext(null);
        setClaims(null);
        if (isMounted) setIsLoading(false);
      }
    });

    // 2. THEN check for existing session
    supabase.auth
      .getSession()
      .then(async ({ data: { session: existing } }) => {
        if (!isMounted) return;
        try {
          // Hydrate immediately, then check account status async
          await hydrateFromSession(existing);
          if (isMounted) setIsLoading(false);

          if (existing?.user) {
            checkAccountActive(existing).catch(() => {});
          }
        } catch (err) { console.error('[auth] getSession error:', err); }
        if (isMounted) setIsLoading(false);
      })
      .catch(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [checkAccountActive, hydrateFromSession]);

  // ---------- login --------------------------------------------------------

  const login = useCallback(
    async (email: string, password: string) => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error || !data.session || !data.user) {
          throw new Error(error?.message || 'Invalid email or password');
        }

        // Hydrate immediately so UI transitions to dashboard
        await hydrateFromSession(data.session);

        // Non-blocking account status check — signs out if inactive
        checkAccountActive(data.session).catch(() => {});

        toast({
          title: 'Welcome back!',
          description: `Successfully logged in as ${data.user.email}`,
        });
      } catch (err: any) {
        toast({
          title: 'Login Failed',
          description: err.message || 'Invalid email or password',
          variant: 'destructive',
        });
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [checkAccountActive, hydrateFromSession],
  );

  // ---------- logout -------------------------------------------------------

  const logout = useCallback(async () => {
    // Optimistic local clear
    setUser(null);
    setProfile(null);
    setSession(null);
    setUserContext(null);
    setClaims(null);

    const { error: localErr } = await supabase.auth.signOut({ scope: 'local' });
    if (localErr) console.error('[auth] local signOut error:', localErr);

    toast({ title: 'Logged out', description: 'You have been successfully logged out.' });

    // Remote cleanup in background
    void supabase.auth.signOut({ scope: 'global' }).catch(() => {});
  }, []);

  // ---------- refresh session ----------------------------------------------

  const refreshSession = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      await hydrateFromSession(data.session);
    } catch {
      setSession(null);
      setUser(null);
      setProfile(null);
      setUserContext(null);
      setClaims(null);
    }
  }, [hydrateFromSession]);

  // ---------- context value ------------------------------------------------

  const value: AuthContextType = {
    user,
    profile,
    session,
    isAuthenticated: !!user && !!session,
    isLoading,
    login,
    logout,
    refreshSession,
    userContext,
    claims,
    isTokenExpired: checkTokenExpired(session),
    timeUntilExpiration: getExpiration(session),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
