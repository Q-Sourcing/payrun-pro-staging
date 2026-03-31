import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth/AuthProvider';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, session } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // If the URL hash contains a Supabase OTP-expired error (corporate email
    // scanner consumed the invite magic link), send the user directly to
    // /set-password so the email-lookup fallback is presented automatically.
    const hash = window.location.hash;
    if (hash.includes('error=access_denied') && (hash.includes('otp_expired') || hash.includes('invite'))) {
      return <Navigate to="/set-password" replace />;
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Detect a fresh invite session that hasn't completed the set-password flow.
  // This handles the case where Supabase auto-logs the user in via the magic link
  // but the redirect_to URL wasn't followed (e.g. not yet in the Supabase allowlist).
  // Guard: skip redirect if RBAC roles already exist (user previously completed onboarding).
  const meta = session?.user?.user_metadata;
  const rbacRoles: unknown[] = (session?.user?.app_metadata as Record<string, unknown>)?.rbac_roles as unknown[] ?? [];
  const isIncompleteInvite =
    meta?.invitation_token &&
    !meta?.invite_accepted &&
    rbacRoles.length === 0;

  if (isIncompleteInvite) {
    return <Navigate to={`/set-password?token=${meta.invitation_token}`} replace />;
  }

  return <>{children}</>;
}
