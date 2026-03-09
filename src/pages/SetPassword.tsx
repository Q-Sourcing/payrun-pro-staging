/**
 * /set-password
 *
 * This page is the target of Supabase's invitation email link.
 * Supabase appends auth tokens as a URL hash fragment:
 *   /set-password#access_token=...&refresh_token=...&type=invite
 *
 * Flow:
 *  1. Parse hash → establish Supabase session via setSession()
 *  2. Optionally verify the custom invite token (query param ?token=...)
 *  3. User fills in password → supabase.auth.updateUser({ password })
 *  4. Mark invite accepted → sign out → redirect to /login
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2, Eye, EyeOff, CheckCircle2, XCircle, ShieldCheck, KeyRound,
} from 'lucide-react';

// ── helpers ─────────────────────────────────────────────────────────────────

function parseHash(): Record<string, string> {
  return Object.fromEntries(
    window.location.hash
      .replace(/^#/, '')
      .split('&')
      .filter(Boolean)
      .map((p) => {
        const [k, ...v] = p.split('=');
        return [decodeURIComponent(k), decodeURIComponent(v.join('='))];
      })
  );
}

const INVITE_FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-user`;
const ANON_KEY = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY
) as string;

// ── component ────────────────────────────────────────────────────────────────

type Stage = 'loading' | 'form' | 'success' | 'error';

interface Check { label: string; ok: boolean }

function RequirementRow({ label, ok }: Check) {
  return (
    <div className={`flex items-center gap-1.5 text-xs ${ok ? 'text-primary' : 'text-muted-foreground'}`}>
      <CheckCircle2 className={`h-3.5 w-3.5 shrink-0 ${ok ? 'text-primary' : 'text-muted-foreground/30'}`} />
      {label}
    </div>
  );
}

export default function SetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [stage, setStage] = useState<Stage>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [sessionReady, setSessionReady] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showConf, setShowConf] = useState(false);

  const inviteToken = searchParams.get('token');   // custom DB token
  const pkceCode    = searchParams.get('code');    // PKCE flow code

  // Password rules
  const minLen   = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasNum   = /[0-9]/.test(password);
  const matches  = password.length > 0 && password === confirm;
  const valid    = minLen && hasUpper && hasNum && matches;

  const didInit = useRef(false);

  // ── initialise: parse URL → establish session ─────────────────────────────
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    (async () => {
      const hash = parseHash();
      const accessToken  = hash['access_token'];
      const refreshToken = hash['refresh_token'];
      const hashType     = hash['type'];           // "invite" | "recovery"
      const hashErr      = hash['error'];
      const hashErrDesc  = hash['error_description'];

      // Surface Supabase errors carried in the hash
      if (hashErr) {
        setErrorMsg(
          hashErrDesc
            ? decodeURIComponent(hashErrDesc.replace(/\\+/g, ' '))
            : 'The invitation link is invalid or has expired.'
        );
        setStage('error');
        return;
      }

      let session: { user: { id: string; email?: string; user_metadata?: Record<string, string> }; access_token: string } | null = null;

      // ── A. Implicit / invite hash ────────────────────────────────────────
      if (accessToken && refreshToken) {
        const { data, error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        if (!error && data.session) {
          session = data.session as typeof session;
          // Remove tokens from the address bar
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        } else {
          console.error('[SetPassword] setSession failed:', error?.message);
        }
      }
      // ── B. PKCE code ─────────────────────────────────────────────────────
      else if (pkceCode) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(pkceCode);
        if (!error && data.session) {
          session = data.session as typeof session;
          const clean = new URL(window.location.href);
          clean.searchParams.delete('code');
          window.history.replaceState(null, '', clean.toString());
        }
      }
      // ── C. Existing session (page refresh) ───────────────────────────────
      else {
        const { data: { session: existing } } = await supabase.auth.getSession();
        if (existing) session = existing as typeof session;
      }

      if (session) {
        setSessionReady(true);
        setUserEmail(session.user.email ?? '');
        setUserName(session.user.user_metadata?.full_name ?? session.user.user_metadata?.name ?? '');
      }

      // ── Verify the custom invite token (if present) ─────────────────────
      if (inviteToken) {
        try {
          const res    = await fetch(`${INVITE_FN_URL}?action=verify-token`, {
            method : 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ANON_KEY}`, apikey: ANON_KEY },
            body   : JSON.stringify({ token: inviteToken }),
          });
          const result = await res.json();

          if (!result.success) {
            setErrorMsg(
              result.status === 'accepted' ? 'This invitation has already been used. Please log in.'
              : result.status === 'cancelled' ? 'This invitation has been cancelled. Contact your administrator.'
              : (result.expired || result.status === 'expired') ? 'This invitation has expired (48-hour limit). Ask your admin to resend it.'
              : result.message ?? 'Invalid invitation link.'
            );
            setStage('error');
            return;
          }

          // Populate user info from invite record if session didn't have it
          if (!userEmail && result.invitation?.email) setUserEmail(result.invitation.email);
          if (!userName  && result.invitation?.full_name) setUserName(result.invitation.full_name);
        } catch {
          setErrorMsg('Could not verify the invitation. Please try again or contact your administrator.');
          setStage('error');
          return;
        }
      }

      // If we have neither a session nor a custom token this is a cold/invalid URL
      if (!session && !inviteToken && hashType !== 'invite') {
        setErrorMsg('No valid invitation found. Please use the link from your invitation email.');
        setStage('error');
        return;
      }

      setStage('form');
    })();
  }, []);

  // Keep session state in sync in case auth event fires asynchronously
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      if (s && !sessionReady) {
        setSessionReady(true);
        setUserEmail(s.user.email ?? '');
        setUserName(s.user.user_metadata?.full_name ?? s.user.user_metadata?.name ?? '');
      }
    });
    return () => subscription.unsubscribe();
  }, [sessionReady]);

  // If we only have an invite token (no Supabase hash session), the password
  // update goes through a server-side call via the accept action after we
  // exchange the token. Allow form submission regardless of sessionReady when
  // an inviteToken is present so the user is never blocked.
  const canSubmit = valid && (sessionReady || !!inviteToken);

  // ── submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        // ── Path A: Supabase session available → update password directly ──
        const { error: pwErr } = await supabase.auth.updateUser({ password });
        if (pwErr) throw pwErr;

        // Mark invite accepted (best-effort)
        if (inviteToken) {
          try {
            await fetch(`${INVITE_FN_URL}?action=accept`, {
              method : 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}`, apikey: ANON_KEY },
              body   : JSON.stringify({ token: inviteToken, user_id: session.user.id }),
            });
          } catch (e) {
            console.warn('[SetPassword] accept call failed (non-fatal):', e);
          }
        }

        await supabase.auth.signOut();
      } else if (inviteToken) {
        // ── Path B: Token-only flow → call accept which sets status to active ─
        const res = await fetch(`${INVITE_FN_URL}?action=accept`, {
          method : 'POST',
          headers: { 'Content-Type': 'application/json', apikey: ANON_KEY },
          body   : JSON.stringify({ token: inviteToken, password }),
        });
        const result = await res.json();
        if (!result.success) throw new Error(result.message || 'Failed to activate account');
      } else {
        throw new Error('No active session or invite token. Please click the invitation link again.');
      }

      setStage('success');
      toast({ title: 'Password set!', description: 'Redirecting you to the login page…' });
      setTimeout(() => navigate('/login'), 2500);
    } catch (err: unknown) {
      toast({
        variant: 'destructive',
        title: 'Could not set password',
        description: err instanceof Error ? err.message : 'An unexpected error occurred.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // ── render ────────────────────────────────────────────────────────────────
  const stageTitle: Record<Stage, string> = {
    loading: 'Verifying Invitation…',
    form   : 'Create Your Password',
    success: 'Account Activated!',
    error  : 'Invitation Issue',
  };

  const stageDesc: Record<Stage, string> = {
    loading: 'Please wait while we verify your invitation link.',
    form   : `You've been invited to Q-Payroll. Set a password to activate your account.`,
    success: 'Your password has been set. Redirecting you to the login page…',
    error  : 'There was a problem with your invitation link.',
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">

        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center">
            <div className="h-11 w-11 rounded-xl bg-primary flex items-center justify-center shadow-md">
              <KeyRound className="h-5 w-5 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Q-Payroll</h1>
          <p className="text-sm text-muted-foreground">Professional Payroll Management System</p>
        </div>

        <Card className="shadow-lg border overflow-hidden">
          <div className="h-1 bg-primary" />

          <CardHeader className="pt-6 pb-3">
            <CardTitle className="flex items-center gap-2 text-xl">
              {stage === 'loading' && <Loader2 className="h-5 w-5 text-primary animate-spin" />}
              {stage === 'form'    && <ShieldCheck className="h-5 w-5 text-primary" />}
              {stage === 'success' && <CheckCircle2 className="h-5 w-5 text-primary" />}
              {stage === 'error'   && <XCircle className="h-5 w-5 text-destructive" />}
              {stageTitle[stage]}
            </CardTitle>
            <CardDescription>{stageDesc[stage]}</CardDescription>
          </CardHeader>

          <CardContent className="pb-6 space-y-5">

            {/* Loading */}
            {stage === 'loading' && (
              <div className="flex justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}

            {/* Error */}
            {stage === 'error' && (
              <div className="space-y-4">
                <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                  <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                  <p className="text-sm leading-relaxed">{errorMsg}</p>
                </div>
                <Button variant="outline" className="w-full" onClick={() => navigate('/login')}>
                  Go to Login
                </Button>
              </div>
            )}

            {/* Success */}
            {stage === 'success' && (
              <div className="flex flex-col items-center gap-4 py-6 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <CheckCircle2 className="h-8 w-8 text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-foreground">Password created successfully!</p>
                  <p className="text-sm text-muted-foreground">
                    Log in with your email and new password.
                  </p>
                </div>
                <Button className="w-full" onClick={() => navigate('/login')}>
                  Go to Login
                </Button>
              </div>
            )}

            {/* Form */}
            {stage === 'form' && (
              <>
                {/* User info pill */}
                {(userEmail || userName) && (
                  <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm">
                    {userName && <p className="font-medium text-foreground">{userName}</p>}
                    {userEmail && <p className="text-muted-foreground text-xs mt-0.5">{userEmail}</p>}
                  </div>
                )}

                {/* Session status — only shown when no invite token or session not ready */}
                {sessionReady ? (
                  <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                    <p className="text-xs font-medium text-primary">Identity verified — set your password below.</p>
                  </div>
                ) : inviteToken ? (
                  <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                    <p className="text-xs font-medium text-primary">Invitation verified — set your password below.</p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-lg border bg-muted px-3 py-2.5">
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">
                      Establishing secure session… If this takes too long, click the email link again.
                    </p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
                  {/* Password */}
                  <div className="space-y-1.5">
                    <Label htmlFor="pwd">New Password</Label>
                    <div className="relative">
                      <Input
                        id="pwd"
                        type={showPwd ? 'text' : 'password'}
                        placeholder="Minimum 8 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={!sessionReady || submitting}
                        className="pr-10"
                        autoComplete="new-password"
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                        onClick={() => setShowPwd((v) => !v)}
                        tabIndex={-1}
                        aria-label={showPwd ? 'Hide password' : 'Show password'}
                      >
                        {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm */}
                  <div className="space-y-1.5">
                    <Label htmlFor="conf">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        id="conf"
                        type={showConf ? 'text' : 'password'}
                        placeholder="Re-enter your password"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        disabled={!sessionReady || submitting}
                        className="pr-10"
                        autoComplete="new-password"
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                        onClick={() => setShowConf((v) => !v)}
                        tabIndex={-1}
                        aria-label={showConf ? 'Hide password' : 'Show password'}
                      >
                        {showConf ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Requirements */}
                  <div className="grid grid-cols-2 gap-1.5 px-1 pt-1">
                    <RequirementRow label="8+ characters"    ok={minLen} />
                    <RequirementRow label="Uppercase letter" ok={hasUpper} />
                    <RequirementRow label="Contains number"  ok={hasNum} />
                    <RequirementRow label="Passwords match"  ok={matches} />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={submitting || !canSubmit}
                  >
                    {submitting
                      ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Activating Account…</>
                      : 'Set Password & Activate Account'}
                  </Button>
                </form>
              </>
            )}
          </CardContent>
        </Card>

        <p className="pb-4 text-center text-xs text-muted-foreground">
          Already have an account?{' '}
          <button onClick={() => navigate('/login')} className="font-medium text-primary hover:underline">
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
