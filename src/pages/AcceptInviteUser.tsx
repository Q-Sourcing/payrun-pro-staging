import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldCheck, CheckCircle2, XCircle, Mail, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface InvitationInfo {
  id: string;
  email: string;
  full_name: string;
  role: string;
  department?: string;
  status: string;
  expires_at: string;
}

function ValidationItem({ label, isValid }: { label: string; isValid: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 text-xs ${isValid ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
      <CheckCircle2 className={`h-3.5 w-3.5 ${isValid ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground/40'}`} />
      {label}
    </div>
  );
}

const INVITE_FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-user`;

export default function AcceptInviteUser() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [invitationInfo, setInvitationInfo] = useState<InvitationInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  const inviteToken = searchParams.get('token');
  const code = searchParams.get('code');

  // Password validation
  const hasMinLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch = password === confirmPassword && password !== '';

  const authAttempted = useRef(false);

  // Step 1: Verify token validity (unauthenticated call to edge function)
  const verifyInviteToken = async () => {
    if (!inviteToken) {
      setError('No invitation token found in the URL. Please use the link from your invitation email.');
      setVerifying(false);
      return;
    }

    try {
      const res = await fetch(`${INVITE_FN_URL}?action=verify-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ token: inviteToken }),
      });

      const result = await res.json();
      if (result.success) {
        setInvitationInfo(result.invitation);
      } else {
        setError(result.message || 'Invalid or expired invitation token.');
      }
    } catch (err) {
      console.error('Token verification error:', err);
      setError('Could not verify invitation. Please try again or contact your administrator.');
    } finally {
      setVerifying(false);
    }
  };

  // Step 2: Handle Supabase auth code exchange
  useEffect(() => {
    if (authAttempted.current) return;
    authAttempted.current = true;

    const handleAuth = async () => {
      // Verify token first
      await verifyInviteToken();

      // Handle PKCE code exchange (from Supabase email invite link)
      if (code) {
        setLoading(true);
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        setLoading(false);
        if (exchangeError) {
          console.error('Code exchange error:', exchangeError);
          // Don't block the UI — user may already have a session
        } else if (data.session) {
          setSessionReady(true);
        }
        return;
      }

      // Check for existing session
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setSessionReady(true);
        return;
      }

      // Listen for auth state changes (handles hash-based invite links)
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session) {
          setSessionReady(true);
          subscription.unsubscribe();
        }
      });

      // Fallback timeout
      setTimeout(async () => {
        const { data: { session: lateSession } } = await supabase.auth.getSession();
        if (lateSession) {
          setSessionReady(true);
        }
      }, 5000);
    };

    handleAuth();
  }, []);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwordsMatch) {
      toast({ variant: 'destructive', title: 'Passwords do not match', description: 'Please ensure both passwords are identical.' });
      return;
    }
    if (!hasMinLength || !hasUpperCase || !hasNumber) {
      toast({ variant: 'destructive', title: 'Password too weak', description: 'Please meet all password requirements.' });
      return;
    }

    setLoading(true);
    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ variant: 'destructive', title: 'Session expired', description: 'Please click the invitation link again from your email.' });
        setLoading(false);
        return;
      }

      // Set the password
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      // Call edge function to mark invitation as accepted and activate profile
      if (inviteToken) {
        const res = await fetch(`${INVITE_FN_URL}?action=accept`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ token: inviteToken, user_id: session.user.id }),
        });
        const result = await res.json();
        if (!result.success) {
          console.warn('Accept invitation warning:', result.message);
          // Don't block — password was already set
        }
      }

      // Sign out so user can log in fresh
      await supabase.auth.signOut();

      setSuccess(true);
      toast({
        title: 'Account activated!',
        description: 'Your password has been set. You can now log in.',
      });

      setTimeout(() => navigate('/login'), 2500);
    } catch (err: unknown) {
      console.error('Set password error:', err);
      toast({
        variant: 'destructive',
        title: 'Failed to set password',
        description: err instanceof Error ? err.message : 'An unexpected error occurred.',
      });
    } finally {
      setLoading(false);
    }
  };

  const roleLabel = invitationInfo?.role
    ? invitationInfo.role.charAt(0).toUpperCase() + invitationInfo.role.slice(1)
    : '';

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo / Brand */}
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">PayRun Pro</h1>
          <p className="text-muted-foreground text-sm">Secure Employee Management & Payroll</p>
        </div>

        <Card className="shadow-xl border">
          <div className="h-1.5 bg-primary w-full rounded-t-lg" />
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">
              {success ? 'Account Activated!' : 'Set Your Password'}
            </CardTitle>
            <CardDescription>
              {success
                ? "You're all set. Redirecting to login…"
                : "You've been invited to join the platform. Create your password to get started."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            {/* Loading state */}
            {verifying && (
              <div className="flex flex-col items-center py-8 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Verifying invitation…</p>
              </div>
            )}

            {/* Error state */}
            {!verifying && error && !invitationInfo && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-destructive">Invitation Issue</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{error}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full" onClick={() => navigate('/login')}>
                  Go to Login
                </Button>
              </div>
            )}

            {/* Success state */}
            {success && (
              <div className="flex flex-col items-center py-6 gap-3 text-center">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">You will be redirected to login shortly…</p>
                <Button variant="outline" size="sm" onClick={() => navigate('/login')}>
                  Go to Login now
                </Button>
              </div>
            )}

            {/* Invitation info + password form */}
            {!verifying && invitationInfo && !success && (
              <>
                {/* Invitation card */}
                <div className="bg-muted/50 rounded-lg p-4 space-y-3 border">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Invited Email</p>
                      <p className="text-sm font-semibold text-foreground">{invitationInfo.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Name</p>
                      <p className="text-sm font-semibold text-foreground">{invitationInfo.full_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Role</p>
                      <Badge variant="secondary" className="mt-0.5">{roleLabel}</Badge>
                    </div>
                  </div>
                  {invitationInfo.department && (
                    <div className="text-xs text-muted-foreground">
                      Department: <span className="font-medium text-foreground">{invitationInfo.department}</span>
                    </div>
                  )}
                </div>

                {!sessionReady && (
                  <div className="bg-muted border rounded-lg p-3 text-xs text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin flex-shrink-0" />
                    Waiting for your authentication session. If this takes too long, try refreshing the page or clicking the email link again.
                  </div>
                )}

                <Separator />

                <form onSubmit={handleSetPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">New Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Minimum 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={!sessionReady || loading}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Repeat your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={!sessionReady || loading}
                      required
                    />
                  </div>

                  {/* Password strength indicators */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <ValidationItem label="8+ characters" isValid={hasMinLength} />
                    <ValidationItem label="Uppercase letter" isValid={hasUpperCase} />
                    <ValidationItem label="Contains number" isValid={hasNumber} />
                    <ValidationItem label="Passwords match" isValid={passwordsMatch} />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loading || !sessionReady || !passwordsMatch || !hasMinLength || !hasUpperCase || !hasNumber}
                  >
                    {loading ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Activating Account…</>
                    ) : (
                      'Activate Account'
                    )}
                  </Button>
                </form>
              </>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Already have an account?{' '}
          <button onClick={() => navigate('/login')} className="text-primary hover:underline">
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
