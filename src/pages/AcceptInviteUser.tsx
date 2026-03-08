import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2, ShieldCheck, CheckCircle2, XCircle, Mail, User, Eye, EyeOff, KeyRound,
} from 'lucide-react';
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

type Stage = 'loading' | 'form' | 'success' | 'error';

function ValidationItem({ label, isValid }: { label: string; isValid: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 text-xs ${isValid ? 'text-primary' : 'text-muted-foreground'}`}>
      <CheckCircle2 className={`h-3.5 w-3.5 flex-shrink-0 ${isValid ? 'text-primary' : 'text-muted-foreground/30'}`} />
      {label}
    </div>
  );
}

const INVITE_FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-user`;
const ANON_KEY = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY) as string;

/** Extract key=value pairs from the URL hash fragment (#). */
function parseHash(): Record<string, string> {
  const hash = window.location.hash.replace(/^#/, '');
  return Object.fromEntries(
    hash.split('&').filter(Boolean).map((p) => {
      const [k, ...v] = p.split('=');
      return [decodeURIComponent(k), decodeURIComponent(v.join('='))];
    })
  );
}

export default function AcceptInviteUser() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [stage, setStage] = useState<Stage>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [invitationInfo, setInvitationInfo] = useState<InvitationInfo | null>(null);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Password validation
  const hasMinLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const isPasswordValid = hasMinLength && hasUpperCase && hasNumber && passwordsMatch;

  // Tokens from URL
  const customToken = searchParams.get('token');   // our invite token
  const pkceCode = searchParams.get('code');        // PKCE flow code

  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const init = async () => {
      const hash = parseHash();
      const hashAccessToken = hash['access_token'];
      const hashRefreshToken = hash['refresh_token'];
      const hashType = hash['type']; // "invite" | "recovery"
      const hashError = hash['error'];
      const hashErrorDesc = hash['error_description'];

      // ── 0. Surface Supabase-level errors from the hash ───────────────────────
      if (hashError) {
        const desc = hashErrorDesc
          ? decodeURIComponent(hashErrorDesc.replace(/\+/g, ' '))
          : hashError;
        setErrorMessage(desc);
        setStage('error');
        return;
      }

      // ── 1. Establish a Supabase session ────────────────────────────────────
      let activeSession: { user: { id: string }; access_token: string } | null = null;

      if (hashAccessToken && hashRefreshToken) {
        // Implicit / invite-type flow — session tokens are in the hash
        const { data, error } = await supabase.auth.setSession({
          access_token: hashAccessToken,
          refresh_token: hashRefreshToken,
        });
        if (!error && data.session) {
          activeSession = data.session;
          // Clean hash from the address bar
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        } else {
          console.warn('[AcceptInviteUser] setSession failed:', error?.message);
        }
      } else if (pkceCode) {
        // PKCE code flow
        const { data, error } = await supabase.auth.exchangeCodeForSession(pkceCode);
        if (!error && data.session) {
          activeSession = data.session;
          // Remove code from URL
          const clean = new URL(window.location.href);
          clean.searchParams.delete('code');
          window.history.replaceState(null, '', clean.toString());
        } else {
          console.warn('[AcceptInviteUser] code exchange failed:', error?.message);
        }
      } else {
        // Check for an existing session (e.g. user refreshed the page)
        const { data: { session } } = await supabase.auth.getSession();
        if (session) activeSession = session;
      }

      if (activeSession) {
        setSessionUserId(activeSession.user.id);
        setSessionToken(activeSession.access_token);
      }

      // ── 2. Validate the custom invite token via edge function ───────────────
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
            const msg =
              result.status === 'accepted'
                ? 'This invitation has already been accepted. Please log in with your credentials.'
                : result.status === 'cancelled'
                ? 'This invitation has been cancelled. Please contact your administrator.'
                : result.expired || result.status === 'expired'
                ? 'This invitation link has expired (48-hour limit). Ask your administrator to resend it.'
                : result.message || 'Invalid invitation token.';
            setErrorMessage(msg);
            setStage('error');
            return;
          }

          setInvitationInfo(result.invitation);
        } catch {
          setErrorMessage('Could not verify your invitation. Please try again or contact your administrator.');
          setStage('error');
          return;
        }
      } else if (hashType === 'invite' && activeSession) {
        // Supabase invite hash but no custom token — build minimal info from session metadata
        const meta = (activeSession as any).user?.user_metadata || {};
        setInvitationInfo({
          id: '',
          email: (activeSession as any).user?.email || '',
          full_name: meta.full_name || meta.name || '',
          role: meta.role || 'employee',
          department: meta.department,
          status: 'pending',
          expires_at: '',
        });
      } else if (!activeSession && !customToken) {
        // Nothing at all — definitely an invalid/direct URL access
        setErrorMessage(
          'No valid invitation found. Please use the link from your invitation email, or contact your administrator.'
        );
        setStage('error');
        return;
      }

      // ── 3. If we have a session OR a custom token, show the form ───────────
      // If we have a custom token but no session yet, the form will show a
      // warning and keep the submit button disabled until the session arrives.
      setStage('form');
    };

    init();
  }, []);

  // Keep session state in sync if auth fires later (e.g. hash processed async)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && !sessionUserId) {
        setSessionUserId(session.user.id);
        setSessionToken(session.access_token);
      }
    });
    return () => subscription.unsubscribe();
  }, [sessionUserId]);

  // ── Submit: set password & activate account ─────────────────────────────────
  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordValid || !sessionUserId) return;

    // Re-fetch the session to get the freshest access token
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
      // 1. Set the password via Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      // 2. Mark the custom invitation record as accepted
      if (customToken) {
        const acceptRes = await fetch(`${INVITE_FN_URL}?action=accept`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': ANON_KEY,
          },
          body: JSON.stringify({ token: customToken, user_id: session.user.id }),
        });
        const acceptResult = await acceptRes.json();
        if (!acceptResult.success) {
          console.warn('[AcceptInviteUser] accept returned non-success:', acceptResult.message);
          // Non-fatal — continue so the password is still set
        }
      }

      // 3. Sign out so the user logs in fresh with their new password
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

  const sessionReady = !!sessionUserId;
  const roleLabel = invitationInfo?.role
    ? invitationInfo.role.charAt(0).toUpperCase() + invitationInfo.role.slice(1).replace(/_/g, ' ')
    : '';

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">

        {/* Brand header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow">
              <KeyRound className="h-5 w-5 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Q-Payroll</h1>
          <p className="text-muted-foreground text-sm">Professional Payroll Management System</p>
        </div>

        <Card className="shadow-xl border overflow-hidden">
          {/* Accent bar */}
          <div className="h-1 bg-primary w-full" />

          <CardHeader className="pb-3 pt-6">
            <CardTitle className="text-xl flex items-center gap-2">
              {stage === 'success' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
              {stage === 'error' && <XCircle className="h-5 w-5 text-destructive" />}
              {stage === 'loading' && <Loader2 className="h-5 w-5 text-primary animate-spin" />}
              {stage === 'form' && <ShieldCheck className="h-5 w-5 text-primary" />}
              {stage === 'success'
                ? 'Account Activated!'
                : stage === 'error'
                ? 'Invitation Issue'
                : stage === 'loading'
                ? 'Verifying Invitation…'
                : 'Complete Account Setup'}
            </CardTitle>
            <CardDescription>
              {stage === 'success'
                ? "You're all set. Redirecting you to the login page…"
                : stage === 'error'
                ? 'There was a problem with your invitation link.'
                : stage === 'loading'
                ? 'Please wait while we verify your invitation.'
                : "Create a password to activate your account and gain access to the platform."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5 pb-6">

            {/* ── Loading ─────────────────────────────────────────── */}
            {stage === 'loading' && (
              <div className="flex flex-col items-center py-8 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Verifying your invitation…</p>
              </div>
            )}

            {/* ── Error ───────────────────────────────────────────── */}
            {stage === 'error' && (
              <div className="space-y-4">
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-foreground leading-relaxed">{errorMessage}</p>
                </div>
                <Button variant="outline" className="w-full" onClick={() => navigate('/login')}>
                  Go to Login
                </Button>
              </div>
            )}

            {/* ── Success ─────────────────────────────────────────── */}
            {stage === 'success' && (
              <div className="flex flex-col items-center py-6 gap-4 text-center">
                <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-foreground">Password created successfully!</p>
                  <p className="text-sm text-muted-foreground">
                    Your account is now active. Please log in with your email and new password.
                  </p>
                </div>
                <Button className="w-full mt-2" onClick={() => navigate('/login')}>
                  Go to Login
                </Button>
              </div>
            )}

            {/* ── Form ────────────────────────────────────────────── */}
            {stage === 'form' && (
              <>
                {/* Invitation details card */}
                {invitationInfo && (
                  <div className="bg-muted/40 rounded-lg p-4 space-y-3 border">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Invitation Details
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                      <div className="flex items-center gap-2.5">
                        <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">Email</p>
                          <p className="text-sm font-medium text-foreground">{invitationInfo.email}</p>
                        </div>
                      </div>
                      {invitationInfo.full_name && (
                        <div className="flex items-center gap-2.5">
                          <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div>
                            <p className="text-xs text-muted-foreground">Name</p>
                            <p className="text-sm font-medium text-foreground">{invitationInfo.full_name}</p>
                          </div>
                        </div>
                      )}
                      {roleLabel && (
                        <div className="flex items-center gap-2.5">
                          <ShieldCheck className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div>
                            <p className="text-xs text-muted-foreground">Role</p>
                            <Badge variant="secondary" className="mt-0.5 capitalize text-xs">
                              {roleLabel}
                            </Badge>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Session loading warning */}
                {!sessionReady && (
                  <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 flex items-center gap-2.5">
                    <Loader2 className="h-4 w-4 animate-spin text-amber-600 dark:text-amber-400 flex-shrink-0" />
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      Establishing your session… If this takes too long, please click the email link again.
                    </p>
                  </div>
                )}

                {sessionReady && (
                  <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3 flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                    <p className="text-xs text-green-700 dark:text-green-300 font-medium">
                      Identity verified — create your password below.
                    </p>
                  </div>
                )}

                <Separator />

                <form onSubmit={handleSetPassword} className="space-y-4">
                  {/* New password */}
                  <div className="space-y-1.5">
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
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setShowPassword((v) => !v)}
                        tabIndex={-1}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm password */}
                  <div className="space-y-1.5">
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
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setShowConfirm((v) => !v)}
                        tabIndex={-1}
                        aria-label={showConfirm ? 'Hide password' : 'Show password'}
                      >
                        {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Requirements checklist */}
                  <div className="grid grid-cols-2 gap-1.5 px-1">
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
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Activating Account…
                      </>
                    ) : (
                      'Activate Account & Set Password'
                    )}
                  </Button>
                </form>
              </>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground pb-4">
          Already have an account?{' '}
          <button
            onClick={() => navigate('/login')}
            className="text-primary hover:underline font-medium"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
