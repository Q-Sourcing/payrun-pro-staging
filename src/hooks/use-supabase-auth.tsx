import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { log, warn, error as logError, debug } from '@/lib/logger';
import { JWTClaimsService, UserContext } from '@/lib/services/auth/jwt-claims';
import { UserProfileService, UserProfile } from '@/lib/services/auth/user-profiles';
import { AuthLogger } from '@/lib/services/auth/auth-logger';

export type UserRole = 'super_admin' | 'org_admin' | 'user';

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
  // New JWT claims integration
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

  // Fetch user profile and roles directly from database
  const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
      debug('Fetching user profile for:', userId);

      // Query profile from user_profiles table (new table name)
      // Cast to any to bypass generated type mismatches
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

      // Query role from user_roles table
      const { data: roleResult } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .order('created_at', { ascending: false })
        .maybeSingle();

      // Map the app_role enum to our role types
      let role: 'super_admin' | 'org_admin' | 'user' = 'user';
      const roleData = roleResult as any;
      if (roleData?.role) {
        // Map app_role values to our expected role types
        const roleMapping: Record<string, 'super_admin' | 'org_admin' | 'user'> = {
          'super_admin': 'super_admin',
          'admin': 'org_admin',
          'manager': 'org_admin',
          'employee': 'user',
          'org_admin': 'org_admin',
          'user': 'user'
        };
        role = roleMapping[roleData.role] || 'user';
      }

      const userProfile: UserProfile = {
        id: profileData.id,
        email: profileData.email,
        first_name: profileData.first_name,
        last_name: profileData.last_name,
        organization_id: profileData.organization_id || null,
        role: role,
        created_at: profileData.created_at,
        updated_at: profileData.updated_at
      };

      log('User profile loaded with role:', userProfile);
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

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        debug('Auth state changed:', event, session?.user?.email);

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
            setProfile(userProfile);
          }, 0);
        } else {
          setProfile(null);
          setClaims(null);
          setUserContext(null);
        }

        setIsLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      debug('Initial session check:', session?.user?.email);

      setSession(session);
      JWTClaimsService.setCurrentSession(session ?? null);
      setUser(session?.user ?? null);

      if (session?.user) {
        // Update JWT claims and user context
        const jwtClaims = JWTClaimsService.getClaimsFromSession(session);
        const userContext = JWTClaimsService.getUserContextFromSession(session);
        setClaims(jwtClaims);
        setUserContext(userContext);

        fetchUserProfile(session.user.id).then(setProfile);
      } else {
        setClaims(null);
        setUserContext(null);
      }

      setIsLoading(false);
    });

    return () => {
      debug('Cleaning up auth subscription');
      subscription.unsubscribe();
    };
  }, []);

  // Login function - Uses secure-login Edge Function
  const login = async (email: string, password: string) => {
    setIsLoading(true);

    try {
      debug('Attempting login for:', email);

      // Call secure-login Edge Function using Supabase client's invoke method
      // This handles authentication headers automatically
      const { data: result, error: invokeError } = await supabase.functions.invoke('secure-login', {
        body: {
          email,
          password,
        },
      });

      // Handle invocation errors
      if (invokeError) {
        debug('Edge Function invocation error:', {
          name: invokeError.name,
          message: invokeError.message,
          context: invokeError.context,
          stack: invokeError.stack,
        });

        // Extract error message from context if available
        let errorMessage = 'Invalid email or password';
        if (invokeError.context) {
          const context = invokeError.context as any;
          if (context.body) {
            try {
              const body = typeof context.body === 'string' ? JSON.parse(context.body) : context.body;
              errorMessage = body.message || body.error || errorMessage;
            } catch {
              errorMessage = context.body || errorMessage;
            }
          } else if (context.message) {
            errorMessage = context.message;
          }
        }

        if (invokeError.message && invokeError.message !== 'Edge Function returned a non-2xx status code') {
          errorMessage = invokeError.message;
        }

        logError('Login error:', {
          error: invokeError,
          message: errorMessage,
          context: invokeError.context,
        });

        toast({
          title: "Login Failed",
          description: errorMessage,
          variant: "destructive",
        });

        throw new Error(errorMessage);
      }

      // Handle function-level errors (when function returns but with success: false)
      if (!result) {
        const errorMessage = 'Invalid email or password';
        logError('Login error: No result from Edge Function');

        toast({
          title: "Login Failed",
          description: errorMessage,
          variant: "destructive",
        });

        throw new Error(errorMessage);
      }

      if (!result.success) {
        // Generic error message (no disclosure of account status)
        const errorMessage = result.message || 'Invalid email or password';
        logError('Login error:', errorMessage);

        toast({
          title: "Login Failed",
          description: errorMessage,
          variant: "destructive",
        });

        throw new Error(errorMessage);
      }

      // Set session manually since Edge Function returns session data
      if (result.session && result.user) {
        // Set the session in Supabase client
        await supabase.auth.setSession({
          access_token: result.session.access_token,
          refresh_token: result.session.refresh_token,
        });

        setSession(result.session);
        JWTClaimsService.setCurrentSession(result.session);
        setUser(result.user);

        // Update JWT claims
        const jwtClaims = JWTClaimsService.getClaimsFromSession(result.session);
        const userContext = JWTClaimsService.getUserContextFromSession(result.session);
        setClaims(jwtClaims);
        setUserContext(userContext);

        // Fetch user profile after successful login
        const userProfile = await fetchUserProfile(result.user.id);
        setProfile(userProfile);

        log('Login successful:', result.user.email);

        toast({
          title: "Welcome back!",
          description: `Successfully logged in as ${result.user.email}`,
        });
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

  // Logout function - Logs logout event
  const logout = async () => {
    setIsLoading(true);

    try {
      debug('Logging out...');

      const currentUserId = user?.id;
      const currentUserEmail = user?.email;

      // Log logout event before signing out
      if (currentUserId) {
        try {
          // Get user's organization
          const { data: profile } = await supabase
            .from('profiles')
            .select('organization_id')
            .eq('id', currentUserId)
            .single();

          await AuthLogger.log({
            user_id: currentUserId,
            org_id: profile?.organization_id || undefined,
            event_type: 'logout',
            success: true,
          });
        } catch (logError) {
          console.error('Error logging logout event:', logError);
          // Don't fail logout if logging fails
        }
      }

      const { error } = await supabase.auth.signOut();

      if (error) {
        logError('Logout error:', error);
        throw error;
      }

      setUser(null);
      setProfile(null);
      setSession(null);
      JWTClaimsService.setCurrentSession(null);
      setClaims(null);
      setUserContext(null);

      log('Logout successful');

      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    } catch (error) {
      logError('Logout failed:', error);
      toast({
        title: "Logout Failed",
        description: "Failed to logout. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
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
