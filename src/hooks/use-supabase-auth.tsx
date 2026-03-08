import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { log, warn, error as logError, debug } from '@/lib/logger';
import { JWTClaimsService, UserContext } from '@/lib/services/auth/jwt-claims';
import { UserProfileService, UserProfile } from '@/lib/services/auth/user-profiles';
import { AuthLogger } from '@/lib/services/auth/auth-logger';

export type UserRole = string;

export interface LegacyUserProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  roles: UserRole[];
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  // OBAC Integration
  userContext: UserContext | null;
  claims: any;
  isTokenExpired: boolean;
  timeUntilExpiration: number | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function SupabaseAuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const [claims, setClaims] = useState<any>(null);
  const isLocalhostRuntime =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  const isUserInactive = async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('user_management_profiles')
        .select('status')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        warn('Unable to check user active status:', error.message);
        return false;
      }

      return data?.status === 'inactive';
    } catch (err) {
      warn('Inactive status check failed:', err);
      return false;
    }
  };

  const enforceActiveAccount = async (currentSession: Session | null): Promise<boolean> => {
    // Local development should not be blocked by account status drift in staging data.
    if (import.meta.env.DEV || isLocalhostRuntime) {
      return true;
    }

    const currentUserId = currentSession?.user?.id;
    if (!currentUserId) return true;

    const inactive = await isUserInactive(currentUserId);
    if (!inactive) return true;

    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    JWTClaimsService.setCurrentSession(null);
    setClaims(null);
    setUserContext(null);

    toast({
      title: 'Account inactive',
      description: 'Your account has been deactivated. Contact your administrator.',
      variant: 'destructive',
    });

    return false;
  };

  // Fetch user profile and roles directly from OBAC system
  const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
      debug('Fetching user profile for:', userId);

      // Query profile from user_profiles table
      const { data: profileResult, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, email, first_name, last_name, organization_id, created_at, updated_at')
        .eq('id', userId)
        .single();

      if (profileError || !profileResult) {
        logError('Error fetching profile:', profileError);
        return null;
      }

      const profileData = profileResult as any;

      // Query active role assignments from OBAC system
      const { data: assignments } = await (supabase
        .from('rbac_assignments' as any)
        .select('role_code, scope_type, scope_id')
        .eq('user_id', userId) as any);

      const userRoles = assignments || [];

      // Map roles for UI display (prioritize highest role for the primary 'role' field)
      let primaryRole: string = 'SELF_USER';
      if (userRoles.length > 0) {
        // Simple priority heuristic for backward compatibility
        const roleCodes = userRoles.map((a: any) => a.role_code);
        if (roleCodes.includes('PLATFORM_SUPER_ADMIN')) primaryRole = 'PLATFORM_SUPER_ADMIN';
        else if (roleCodes.includes('ORG_ADMIN')) primaryRole = 'ORG_ADMIN';
        else if (roleCodes.includes('ORG_HR_ADMIN')) primaryRole = 'ORG_ADMIN';
        else primaryRole = 'SELF_USER';
      }

      const userProfile: UserProfile = {
        id: profileData.id,
        email: profileData.email,
        first_name: profileData.first_name,
        last_name: profileData.last_name,
        organization_id: profileData.organization_id || null,
        role: primaryRole as any,
        created_at: profileData.created_at,
        updated_at: profileData.updated_at
      };

      log('User profile loaded with OBAC roles:', userRoles);
      return userProfile;
    } catch (err) {
      logError('Error fetching user profile:', err);
      return null;
    }
  };

  // Refresh session
  const refreshSession = async () => {
    try {
      debug('Refreshing session...');
      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        logError('Session refresh error:', error);
        throw error;
      }

      setSession(data.session);
      JWTClaimsService.setCurrentSession(data.session ?? null);
      setUser(data.session?.user || null);

      if (data.session?.user) {
        const isAllowed = await enforceActiveAccount(data.session);
        if (!isAllowed) {
          return;
        }
        const userProfile = await fetchUserProfile(data.session.user.id);
        setProfile(userProfile);
      }

      log('Session refreshed successfully');
    } catch (error) {
      logError('Failed to refresh session:', error);
      setSession(null);
      setUser(null);
      setProfile(null);
      JWTClaimsService.setCurrentSession(null);
    }
  };

  // Initialize auth state
  useEffect(() => {
    debug('Initializing auth...');
    let isMounted = true;

    // Safety net: never allow auth loading to hang forever.
    const loadingTimeout = setTimeout(() => {
      if (!isMounted) return;
      warn('Auth initialization timeout reached; continuing without blocking UI.');
      setIsLoading(false);
    }, 10000);

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        debug('Auth state changed:', event, session?.user?.email);

        try {
          if (session?.user) {
            const isAllowed = await enforceActiveAccount(session);
            if (!isAllowed) {
              return;
            }
          }

          setSession(session);
          JWTClaimsService.setCurrentSession(session ?? null);
          setUser(session?.user ?? null);

          if (session?.user) {
            // Update JWT claims and user context
            const jwtClaims = JWTClaimsService.getClaimsFromSession(session);
            const userContext = JWTClaimsService.getUserContextFromSession(session);
            setClaims(jwtClaims);
            setUserContext(userContext);

            // Defer profile fetching to avoid blocking auth state change
            setTimeout(async () => {
              const userProfile = await fetchUserProfile(session.user.id);
              if (!isMounted) return;
              setProfile(userProfile);
            }, 0);
          } else {
            setProfile(null);
            setClaims(null);
            setUserContext(null);
          }
        } catch (err) {
          logError('Auth state change handler failed:', err);
          setSession(null);
          setUser(null);
          setProfile(null);
          JWTClaimsService.setCurrentSession(null);
          setClaims(null);
          setUserContext(null);
        } finally {
          if (isMounted) {
            setIsLoading(false);
          }
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        debug('Initial session check:', session?.user?.email);

        try {
          if (session?.user) {
            const isAllowed = await enforceActiveAccount(session);
            if (!isAllowed) {
              return;
            }
          }

          setSession(session);
          JWTClaimsService.setCurrentSession(session ?? null);
          setUser(session?.user ?? null);

          if (session?.user) {
            // Update JWT claims and user context
            const jwtClaims = JWTClaimsService.getClaimsFromSession(session);
            const userContext = JWTClaimsService.getUserContextFromSession(session);
            setClaims(jwtClaims);
            setUserContext(userContext);

            const userProfile = await fetchUserProfile(session.user.id);
            if (!isMounted) return;
            setProfile(userProfile);
          } else {
            setClaims(null);
            setUserContext(null);
          }
        } catch (err) {
          logError('Initial session processing failed:', err);
          setSession(null);
          setUser(null);
          setProfile(null);
          JWTClaimsService.setCurrentSession(null);
          setClaims(null);
          setUserContext(null);
        } finally {
          if (isMounted) {
            setIsLoading(false);
          }
        }
      })
      .catch((err) => {
        logError('Initial getSession failed:', err);
        if (!isMounted) return;
        setSession(null);
        setUser(null);
        setProfile(null);
        JWTClaimsService.setCurrentSession(null);
        setClaims(null);
        setUserContext(null);
        setIsLoading(false);
      });

    return () => {
      debug('Cleaning up auth subscription');
      isMounted = false;
      clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, []);

  // Login function - Uses secure-login Edge Function
  const login = async (email: string, password: string) => {
    setIsLoading(true);

    const completeLogin = async (nextSession: Session, nextUser: User, source: 'secure-login' | 'fallback') => {
      const isAllowed = await enforceActiveAccount(nextSession);
      if (!isAllowed) {
        throw new Error('Your account is inactive. Contact your administrator.');
      }

      setSession(nextSession);
      JWTClaimsService.setCurrentSession(nextSession);
      setUser(nextUser);

      const jwtClaims = JWTClaimsService.getClaimsFromSession(nextSession);
      const context = JWTClaimsService.getUserContextFromSession(nextSession);
      setClaims(jwtClaims);
      setUserContext(context);

      // Do not block login UX on profile fetch; load in background with timeout.
      void Promise.race([
        fetchUserProfile(nextUser.id),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
      ])
        .then((userProfile) => {
          if (userProfile) {
            setProfile(userProfile);
          }
        })
        .catch((profileErr) => {
          warn('Background profile fetch failed after login:', profileErr);
        });

      log(`Login successful (${source}):`, nextUser.email);
      toast({
        title: "Welcome back!",
        description: `Successfully logged in as ${nextUser.email}`,
      });
    };

    const tryDirectAuthFallback = async (reason: string) => {
      warn('secure-login failed, trying direct auth fallback:', reason);
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError || !authData?.session || !authData?.user) {
        throw new Error(authError?.message || 'Invalid email or password');
      }

      await completeLogin(authData.session, authData.user, 'fallback');
    };

    try {
      debug('Attempting login for:', email);

      // Local dev: avoid secure-login edge path (can hang/time out with JWT or network config),
      // and sign in directly against Supabase Auth for reliable localhost login.
      if (import.meta.env.DEV || isLocalhostRuntime) {
        await tryDirectAuthFallback('Localhost/dev direct auth path');
        return;
      }

      // Call secure-login Edge Function using Supabase client's invoke method
      // This handles authentication headers automatically
      const anonToken =
        import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
        import.meta.env.VITE_SUPABASE_ANON_KEY;
      let result: any = null;
      let invokeError: any = null;
      try {
        const invokeResponse = await Promise.race([
          supabase.functions.invoke('secure-login', {
            body: {
              email,
              password,
            },
            headers: anonToken
              ? {
                // secure-login may be deployed with JWT verification enabled.
                // Send anon token so pre-auth login requests are accepted.
                Authorization: `Bearer ${anonToken}`,
              }
              : undefined,
          }),
          new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('secure-login request timed out')), 8000);
          }),
        ]);

        result = (invokeResponse as any)?.data ?? null;
        invokeError = (invokeResponse as any)?.error ?? null;
      } catch (invokeTransportError: any) {
        await tryDirectAuthFallback(invokeTransportError?.message || 'secure-login transport failure');
        return;
      }

      // Handle invocation errors
      if (invokeError) {
        let errorMessage = 'Invalid email or password';

        // Comprehensive error message extraction
        if (invokeError.context) {
          const context = invokeError.context as any;
          if (context.body) {
            try {
              const body = typeof context.body === 'string' ? JSON.parse(context.body) : context.body;
              errorMessage = body.message || body.error || errorMessage;
            } catch {
              errorMessage = context.body || errorMessage;
            }
          }
        }

        // Fallback to error message if context body didn't yield anything
        if (errorMessage === 'Invalid email or password' && invokeError.message && invokeError.message !== 'Edge Function returned a non-2xx status code') {
          errorMessage = invokeError.message;
        }

        logError('Login error (Invocation):', {
          error: invokeError,
          extractedMessage: errorMessage
        });
        await tryDirectAuthFallback(errorMessage);
        return;
      }

      // Handle function-level errors (when function returns but with success: false)
      if (!result) {
        logError('Login error: No result from Edge Function');
        await tryDirectAuthFallback('No result from secure-login');
        return;
      }

      if (!result.success) {
        const errorMessage = result.message || 'Invalid email or password';
        logError('Login error:', errorMessage);

        // secure-login may reject for infrastructure/profile mismatches in local runs.
        // Keep explicit account state errors as-is, fallback for everything else.
        if (!errorMessage.toLowerCase().includes('inactive')) {
          await tryDirectAuthFallback(errorMessage);
          return;
        }
        throw new Error(errorMessage);
      }

      // Set session manually since Edge Function returns session data
      if (result.session && result.user) {
        // Set the session in Supabase client
        await supabase.auth.setSession({
          access_token: result.session.access_token,
          refresh_token: result.session.refresh_token,
        });

        await completeLogin(result.session, result.user, 'secure-login');
      } else {
        throw new Error('Invalid response from login service');
      }
    } catch (error: any) {
      logError('Login failed:', error);

      // Always show generic error message
      const errorMessage = error.message || 'Invalid email or password';

      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive",
      });

      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function - Optimistic local logout for instant UI response
  const logout = async () => {
    debug('Logging out (optimistic)...');
    setIsLoading(true);

    const currentUserId = user?.id;

    // 1) Clear local auth state immediately so UI responds instantly.
    setUser(null);
    setProfile(null);
    setSession(null);
    JWTClaimsService.setCurrentSession(null);
    setClaims(null);
    setUserContext(null);

    // Clear persisted session tokens locally so page refresh stays logged out.
    // This is fast and does not require a full remote round-trip.
    const { error: localSignOutError } = await supabase.auth.signOut({ scope: 'local' });
    if (localSignOutError) {
      logError('Local signOut error:', localSignOutError);
    }

    setIsLoading(false);

    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });

    // 2) Run remote cleanup asynchronously; don't block UX.
    void (async () => {
      try {
        if (currentUserId) {
          const { data: profileData } = await supabase
            .from('user_profiles')
            .select('organization_id')
            .eq('id', currentUserId)
            .single();

          await AuthLogger.log({
            user_id: currentUserId,
            org_id: profileData?.organization_id || undefined,
            event_type: 'logout',
            success: true,
          });
        }
      } catch (logErr) {
        console.error('Error logging logout event:', logErr);
      }

      // Optional remote invalidation after local logout has already completed.
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) {
        logError('Logout global signOut error (post-local-clear):', error);
      } else {
        log('Logout global signOut completed');
      }
    })();
  };

  const value: AuthContextType = {
    user,
    profile,
    session,
    isAuthenticated: !!user && !!session,
    isLoading,
    login,
    logout,
    refreshSession,
    // New JWT claims integration
    userContext,
    claims,
    isTokenExpired: JWTClaimsService.isTokenExpired(),
    timeUntilExpiration: JWTClaimsService.getTimeUntilExpiration(),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useSupabaseAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useSupabaseAuth must be used within a SupabaseAuthProvider');
  }
  return context;
}
