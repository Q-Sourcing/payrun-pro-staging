import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { log, warn, error, debug } from '@/lib/logger';
import { User, UserRole } from '@/lib/types/roles';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const login = async (email: string, password: string, rememberMe = false) => {
    setIsLoading(true);
    
    try {
      // Simulate login - in real app, this would call your backend
      debug('Login attempt:', { email, password: '[REDACTED]', rememberMe });
      
      // For demo purposes, create a mock user
      const mockUser: User = {
        id: '1',
        email: email,
        firstName: 'Demo',
        lastName: 'User',
        role: 'super_admin' as UserRole,
        organizationId: null,
        departmentId: null,
        managerId: null,
        isActive: true,
        lastLogin: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        permissions: [],
        restrictions: [],
        twoFactorEnabled: false,
        sessionTimeout: 480
      };
      
      setUser(mockUser);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error: any) {
      throw new Error(error.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, firstName: string, lastName: string) => {
    setIsLoading(true);
    
    try {
      // Simulate registration - in real app, this would call your backend
      console.log('Registration attempt:', { email, firstName, lastName });
      
      // For demo purposes, create a mock user
      const mockUser: User = {
        id: '1',
        email: email,
        firstName: firstName,
        lastName: lastName,
        role: 'employee' as UserRole,
        organizationId: null,
        departmentId: null,
        managerId: null,
        isActive: true,
        lastLogin: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        permissions: [],
        restrictions: [],
        twoFactorEnabled: false,
        sessionTimeout: 480
      };
      
      setUser(mockUser);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error: any) {
      throw new Error(error.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    
    try {
      setUser(null);
      console.log('User logged out');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}