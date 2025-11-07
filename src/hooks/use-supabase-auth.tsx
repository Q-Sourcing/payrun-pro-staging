import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { log, warn, error as logError, debug } from '@/lib/logger';
import { JWTClaimsService, UserContext } from '@/lib/services/auth/jwt-claims';
import { UserProfileService, UserProfile } from '@/lib/services/auth/user-profiles';

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

  // Fetch user profile and roles using new system
  const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
      debug('Fetching user profile for:', userId);
      
      // Use the new UserProfileService
      const userProfile = await UserProfileService.getCurrentProfile();
      
      if (userProfile) {
      log('User profile loaded:', userProfile);
      }
      
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
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Update JWT claims and user context
          const jwtClaims = JWTClaimsService.getCurrentClaims();
          const userContext = JWTClaimsService.getCurrentUserContext();
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
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Update JWT claims and user context
        const jwtClaims = JWTClaimsService.getCurrentClaims();
        const userContext = JWTClaimsService.getCurrentUserContext();
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

  // Login function
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    
    try {
      debug('Attempting login for:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        logError('Login error:', error);
        throw error;
      }

      log('Login successful:', data.user?.email);
      
      // Fetch user profile after successful login
      if (data.user) {
        const userProfile = await fetchUserProfile(data.user.id);
        setProfile(userProfile);
      }

      toast({
        title: "Welcome back!",
        description: `Successfully logged in as ${data.user?.email}`,
      });
    } catch (error: any) {
      logError('Login failed:', error);
      
      let errorMessage = 'Invalid email or password';
      
      if (error.message?.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password. Please try again.';
      } else if (error.message?.includes('Email not confirmed')) {
        errorMessage = 'Please confirm your email address before logging in.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
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

  // Logout function
  const logout = async () => {
    setIsLoading(true);
    
    try {
      debug('Logging out...');
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        logError('Logout error:', error);
        throw error;
      }
      
      setUser(null);
      setProfile(null);
      setSession(null);
      
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
