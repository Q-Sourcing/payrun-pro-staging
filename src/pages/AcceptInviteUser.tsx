import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldCheck, CheckCircle2, XCircle, Mail, User, Eye, EyeOff } from 'lucide-react';
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
      <CheckCircle2 className={`h-3.5 w-3.5 flex-shrink-0 ${isValid ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground/40'}`} />
      {label}
    </div>
  );
}

const INVITE_FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-user`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Parse the URL hash that Supabase appends after processing an invite link.
 * e.g. #access_token=xxx&token_type=bearer&type=invite&...
 */
function parseHashParams(): Record<string, string> {
  const hash = window.location.hash.replace(/^#/, '');
  const params: Record<string, string> = {};
  hash.split('&').forEach((part) => {
    const [key, ...rest] = part.split('=');
    if (key) params[decodeURIComponent(key)] = decodeURIComponent(rest.join('='));
  });
  return params;
}

export default function AcceptInviteUser() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  // UI states
  const [stage, setStage] = useState<'loading' | 'form' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [invitationInfo, setInvitationInfo] = useState<InvitationInfo | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // The custom invitation token is in the query string
  const inviteToken = searchParams.get('token');
  // PKCE code (if Supabase used code flow)
  const pkceCode = searchParams.get('code');

  // Password rules
  const hasMinLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch = password !== '' && password === confirmPassword;
  const isPasswordValid = hasMinLength && hasUpperCase && hasNumber && passwordsMatch;

  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const init = async () => {
      // ── Step 1: Extract session from hash (Supabase implicit/invite flow) ───
      const hashParams = parseHashParams();
      const hashAccessToken = hashParams['access_token'];
      const hashRefreshToken = hashParams['refresh_token'];
      const hashType = hashParams['type']; // "invite" or "recovery"

      // Determine the custom token: prefer query param, but also check hash
      const customToken = inviteToken || hashParams['invitation_token'];

      if (!customToken && !hashAccessToken && !pkceCode) {
        setErrorMessage('No invitation token found. Please use the link from your invitation email.');
        setStage('error');
        return;
      }

      // ── Step 2: Establish Supabase session ────────────────────────────────

      // Option A: Hash contains access_token (most common for invite emails)
      if (hashAccessToken && hashRefreshToken) {
        const { data, error } = await supabase.auth.setSession({
          access_token: hashAccessToken,
          refresh_token: hashRefreshToken,
        });
        if (!error && data.session) {
          setSessionReady(true);
          // Clean the hash from the URL so it's not visible
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        } else {
          console.warn('setSession from hash failed:', error?.message);
        }
      }
      // Option B: PKCE code flow
      else if (pkceCode) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(pkceCode);
        if (!error && data.session) {
          setSessionReady(true);
        } else {
          console.warn('Code exchange failed:', error?.message);
        }
      }
      // Option C: Already have a session (returning to page)
      else {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) setSessionReady(true);
      }

      // ── Step 3: Verify the custom invite token ────────────────────────────
      if (customToken) {
        try {
          const res = await fetch(`${INVITE_FN_URL}?action=verify-token`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${ANON_KEY}`,
              'apikey': ANON_KEY,
            },
            body: JSON.stringify({ token: customToken }),
          });
          const result = await res.json();

          if (!result.success) {
            const msg = result.status === 'accepted'
              ? 'This invitation has already been accepted. Please log in with your credentials.'
              : result.status === 'cancelled'
              ? 'This invitation has been cancelled. Please contact your administrator.'
              : result.expired || result.status === 'expired'
              ? 'This invitation link has expired (48-hour limit). Please ask your administrator to resend it.'
              : result.message || 'Invalid invitation token.';
            setErrorMessage(msg);
            setStage('error');
            return;
          }

          setInvitationInfo(result.invitation);
        } catch {
          setErrorMessage('Could not verify invitation. Please try again or contact your administrator.');
          setStage('error');
          return;
        }
      } else if (hashType === 'invite') {
        // Session came from Supabase hash but no custom token — still allow password set
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setInvitationInfo({
            id: '',
            email: session.user.email || '',
            full_name: session.user.user_metadata?.full_name || '',
            role: session.user.user_metadata?.role || 'employee',
            department: session.user.user_metadata?.department,
            status: 'pending',
            expires_at: '',
          });
        }
      }

      // ── Step 4: If session still not ready, listen for auth state change ──
      if (!sessionReady) {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
          if (s) {
            setSessionReady(true);
            subscription.unsubscribe();
          }
        });

        // Fallback: show form after 2s regardless
        setTimeout(() => {
          setStage((prev) => prev === 'loading' ? 'form' : prev);
        }, 2000);
      }

      setStage('form');
    };

    init();
  }, []);

  // Keep sessionReady in sync if auth state changes after initial load
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && !sessionReady) setSessionReady(true);
    });
    return () => subscription.unsubscribe();
  }, [sessionReady]);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordValid) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({
        variant: 'destructive',
        title: 'Session expired',
        description: 'Please click the invitation link from your email again.',
      });
      return;
    }

    setSubmitting(true);
    try {
      // 1. Set the password
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      // 2. Mark invitation as accepted
      const customToken = inviteToken || parseHashParams()['invitation_token'];
      if (customToken) {
        await fetch(`${INVITE_FN_URL}?action=accept`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': ANON_KEY,
          },
          body: JSON.stringify({ token: customToken, user_id: session.user.id }),
        });
      }

      // 3. Sign out — user should log in fresh
      await supabase.auth.signOut();

      setStage('success');
      toast({
        title: 'Account activated!',
        description: 'Your password has been set. Redirecting to login…',
      });

      setTimeout(() => navigate('/login'), 2500);
    } catch (err: unknown) {
      toast({
        variant: 'destructive',
        title: 'Failed to set password',
        description: err instanceof Error ? err.message : 'An unexpected error occurred.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const roleLabel = invitationInfo?.role
    ? invitationInfo.role.charAt(0).toUpperCase() + invitationInfo.role.slice(1)
    : '';

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">

        {/* Brand */}
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">PayRun Pro</h1>
          <p className="text-muted-foreground text-sm">Secure Employee Management & Payroll</p>
        </div>

        <Card className="shadow-xl border overflow-hidden">
          <div className="h-1.5 bg-primary w-full" />
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">
              {stage === 'success' ? 'Account Activated!' : stage === 'error' ? 'Invitation Issue' : 'Set Your Password'}
            </CardTitle>
            <CardDescription>
              {stage === 'success'
                ? "You're all set. Redirecting you to the login page…"
                : stage === 'error'
                ? 'There was a problem with your invitation link.'
                : "You've been invited to join the platform. Create a password to activate your account."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">

            {/* ── Loading ── */}
            {stage === 'loading' && (
              <div className="flex flex-col items-center py-10 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Verifying your invitation…</p>
              </div>
            )}

            {/* ── Error ── */}
            {stage === 'error' && (
              <div className="space-y-4">
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-foreground leading-relaxed">{errorMessage}</p>
                </div>
                <Button variant="outline" className="w-full" onClick={() => navigate('/login')}>
                  Go to Login
                </Button>
              </div>
            )}

            {/* ── Success ── */}
            {stage === 'success' && (
              <div className="flex flex-col items-center py-6 gap-4 text-center">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">Your account is ready. Please log in with your email and new password.</p>
                <Button className="w-full" onClick={() => navigate('/login')}>
                  Go to Login
                </Button>
              </div>
            )}

            {/* ── Form ── */}
            {stage === 'form' && (
              <>
                {/* Invitation info */}
                {invitationInfo && (
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
                        <Badge variant="secondary" className="mt-0.5 capitalize">{roleLabel}</Badge>
                      </div>
                    </div>
                    {invitationInfo.department && (
                      <p className="text-xs text-muted-foreground">
                        Department: <span className="font-medium text-foreground">{invitationInfo.department}</span>
                      </p>
                    )}
                  </div>
                )}

                {/* Session status warning */}
                {!sessionReady && (
                  <div className="bg-muted border rounded-lg p-3 text-xs text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin flex-shrink-0" />
                    Establishing your session… If this persists, please click the email link again.
                  </div>
                )}

                <Separator />

                <form onSubmit={handleSetPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">New Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Minimum 8 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={!sessionReady || submitting}
                        required
                        className="pr-10"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirm ? 'text' : 'password'}
                        placeholder="Repeat your password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={!sessionReady || submitting}
                        required
                        className="pr-10"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowConfirm(!showConfirm)}
                        tabIndex={-1}
                      >
                        {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Password requirements */}
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    <ValidationItem label="8+ characters" isValid={hasMinLength} />
                    <ValidationItem label="Uppercase letter" isValid={hasUpperCase} />
                    <ValidationItem label="Contains number" isValid={hasNumber} />
                    <ValidationItem label="Passwords match" isValid={passwordsMatch} />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={submitting || !sessionReady || !isPasswordValid}
                  >
                    {submitting
                      ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Activating Account…</>
                      : 'Activate Account & Set Password'}
                  </Button>
                </form>
              </>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Already have an account?{' '}
          <button onClick={() => navigate('/login')} className="text-primary hover:underline font-medium">
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
