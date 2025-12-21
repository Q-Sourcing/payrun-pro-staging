import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldCheck, Building2, UserCircle, CheckCircle2, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface InviteMetadata {
    email: string;
    orgName: string;
    roles: string[];
}

export default function AcceptInvite() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [loading, setLoading] = useState(false);
    const [fetchingMetadata, setFetchingMetadata] = useState(false);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [inviteInfo, setInviteInfo] = useState<InviteMetadata | null>(null);

    // Extract token/code from URL
    const token = searchParams.get('token') || searchParams.get('access_token');
    const code = searchParams.get('code');
    const type = searchParams.get('type') || 'invite';

    // Password validation criteria
    const hasMinLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const passwordsMatch = password === confirmPassword && password !== '';

    const fetchInviteMetadata = async (email: string) => {
        setFetchingMetadata(true);
        try {
            console.log('[AcceptInvite] Fetching metadata for:', email);
            const { data, error } = await supabase
                .from('user_invites')
                .select(`
                    email,
                    role_data,
                    tenant_id
                `)
                .ilike('email', email)
                .eq('status', 'pending')
                .order('created_at', { ascending: false })
                .maybeSingle();

            if (error) throw error;

            if (data) {
                // Fetch organization name
                let orgName = 'Your Organization';
                if (data.tenant_id) {
                    const { data: orgData } = await supabase
                        .from('organizations')
                        .select('name')
                        .eq('id', data.tenant_id)
                        .single();
                    if (orgData) orgName = orgData.name;
                }

                // Extract roles from role_data
                let roles: string[] = [];
                const roleData = data.role_data as any;
                if (roleData?.orgs?.[0]?.roles) {
                    roles = roleData.orgs[0].roles;
                }

                setInviteInfo({
                    email: data.email,
                    orgName,
                    roles
                });
                setAuthError(null);
            } else {
                console.warn('[AcceptInvite] No pending invitation record found for:', email);
                setAuthError(`We found your account (${email}), but no pending invitation record was found. This link might have already been used, or you may need a new invitation.`);
            }
        } catch (err: any) {
            console.error('[AcceptInvite] Error fetching metadata:', err);
            setAuthError(`Database error: ${err.message || 'Could not retrieve invitation details.'}`);
        } finally {
            setFetchingMetadata(false);
        }
    };

    const [authError, setAuthError] = useState<string | null>(null);
    const authAttempted = useRef(false);

    useEffect(() => {
        if (authAttempted.current) return;

        const handleAuth = async () => {
            console.log('[AcceptInvite] Handling Auth flow...');
            authAttempted.current = true;

            // 1. Handle code-to-session exchange (PKCE)
            if (code) {
                setLoading(true);
                const { data, error } = await supabase.auth.exchangeCodeForSession(code);
                setLoading(false);

                if (error) {
                    console.error('[AcceptInvite] Code exchange error:', error);
                    setAuthError("This invitation link has expired or has already been used.");
                    toast({
                        variant: "destructive",
                        title: "Link Error",
                        description: "The invitation link is no longer valid."
                    });
                } else if (data.session) {
                    console.log('[AcceptInvite] Code exchange successful');
                    fetchInviteMetadata(data.session.user.email!);
                }
                return;
            }

            // 2. Handle hash-based sessions
            const { data: { session: existingSession } } = await supabase.auth.getSession();
            if (existingSession) {
                console.log('[AcceptInvite] Session already present:', existingSession.user.email);
                fetchInviteMetadata(existingSession.user.email!);
                return;
            }

            // 3. Defensive check for hash fragment before waiting
            const hash = window.location.hash;
            if (hash) {
                const params = new URLSearchParams(hash.substring(1));
                const error = params.get('error');
                const errorDescription = params.get('error_description');

                if (error) {
                    console.error('[AcceptInvite] Auth error from hash:', error, errorDescription);
                    setAuthError(errorDescription || `Authentication failed: ${error}`);
                    return;
                }

                if (hash.includes('access_token') || hash.includes('type=invite') || hash.includes('type=signup') || hash.includes('type=recovery')) {
                    console.log('[AcceptInvite] Hash fragment detected, waiting for event to fire...');
                    // We DON'T return here, but we set a much longer timeout
                }
            }

            // 4. Final fallback for cases where hash parsing is slow or failing
            if (type === 'invite' || type === 'signup' || hash.includes('type=')) {
                console.log('[AcceptInvite] Invite flow detected, staying on page for session catch...');
                setTimeout(async () => {
                    // One last check of the session
                    const { data: { session: finalSession } } = await supabase.auth.getSession();
                    if (finalSession) {
                        console.log('[AcceptInvite] Session caught late in timeout:', finalSession.user.email);
                        fetchInviteMetadata(finalSession.user.email!);
                    } else if (!inviteInfo) {
                        console.log('[AcceptInvite] No session confirmed after extended timeout');
                        setAuthError("Authentication session not found. If you just clicked the link, please try refreshing the page.");
                    }
                }, 8000); // 8 seconds is very conservative for hash processing
            } else if (!hash.includes('access_token')) {
                console.log('[AcceptInvite] No auth context found');
                setAuthError("No invitation context found. Please use the activation link sent to your email.");
            }
        };

        handleAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('[AcceptInvite] Auth event (Global):', event);
            if (session) {
                console.log('[AcceptInvite] Global session captured:', session.user.email);
                setAuthError(null);
                fetchInviteMetadata(session.user.email!);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [code, token, navigate, toast, type, inviteInfo]);

    const handleAccept = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!passwordsMatch) {
            toast({
                variant: "destructive",
                title: "Passwords mismatch",
                description: "Please ensure both passwords match."
            });
            return;
        }

        if (!hasMinLength || !hasUpperCase || !hasNumber) {
            toast({
                variant: "destructive",
                title: "Weak Password",
                description: "Password does not meet the security requirements."
            });
            return;
        }

        setLoading(true);

        try {
            const { error: updateError } = await supabase.auth.updateUser({
                password: password
            });

            if (updateError) throw updateError;

            toast({
                title: "Account Ready!",
                description: "Your password has been set and your account is active."
            });

            navigate('/dashboard');
        } catch (error: any) {
            console.error('Accept Invite Error:', error);
            toast({
                variant: "destructive",
                title: "Setup Failed",
                description: error.message || "Could not complete account setup."
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 font-sans">
            <div className="w-full max-w-lg space-y-6">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">PayRun Pro</h1>
                    <p className="text-slate-500 dark:text-slate-400">Secure Employee Management & Payroll</p>
                </div>

                <Card className="border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
                    <div className="h-1.5 bg-primary w-full" />
                    <CardHeader className="pb-4">
                        <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
                        <CardDescription>
                            Welcome! You've been invited to join the platform. Let's finish setting up your account.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        {fetchingMetadata ? (
                            <div className="flex flex-col items-center justify-center py-8 space-y-4">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                <p className="text-sm text-slate-500">Retrieving invitation details...</p>
                            </div>
                        ) : authError && !inviteInfo ? (
                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 space-y-3">
                                <div className="flex items-start gap-3">
                                    <XCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-amber-900 dark:text-amber-100">Setup Issue</p>
                                        <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                                            {authError}
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full text-xs h-8"
                                    onClick={() => navigate('/login')}
                                >
                                    Go to Login
                                </Button>
                            </div>
                        ) : inviteInfo ? (
                            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 space-y-4 border border-slate-100 dark:border-slate-800">
                                <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-3">
                                    <UserCircle className="h-5 w-5 text-slate-400" />
                                    <div>
                                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Invited Email</p>
                                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{inviteInfo.email}</p>
                                    </div>

                                    <Building2 className="h-5 w-5 text-slate-400" />
                                    <div>
                                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Organization</p>
                                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{inviteInfo.orgName}</p>
                                    </div>

                                    <ShieldCheck className="h-5 w-5 text-slate-400" />
                                    <div>
                                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Assigned Roles</p>
                                        <div className="flex flex-wrap gap-1.5 mt-1">
                                            {inviteInfo.roles.length > 0 ? (
                                                inviteInfo.roles.map((role) => (
                                                    <Badge key={role} variant="secondary" className="capitalize text-[10px] px-2 py-0">
                                                        {role.replace('_', ' ')}
                                                    </Badge>
                                                ))
                                            ) : (
                                                <Badge variant="outline" className="text-[10px]">Standard Access</Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-6">
                                <p className="text-sm text-slate-500 italic">Waiting for invitation authentication...</p>
                            </div>
                        )}

                        {inviteInfo && (
                            <>
                                <Separator />

                                <form onSubmit={handleAccept} className="space-y-5">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="password">Create Password</Label>
                                            <Input
                                                id="password"
                                                type="password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                required
                                                placeholder="Minimum 8 characters"
                                                className="h-11"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="confirmPassword">Confirm Password</Label>
                                            <Input
                                                id="confirmPassword"
                                                type="password"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                required
                                                placeholder="Repeat your password"
                                                className="h-11"
                                            />
                                        </div>
                                    </div>

                                    {/* Validation Indicators */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <ValidationItem label="8+ characters" isValid={hasMinLength} />
                                        <ValidationItem label="Uppercase letter" isValid={hasUpperCase} />
                                        <ValidationItem label="Number" isValid={hasNumber} />
                                        <ValidationItem label="Passwords match" isValid={passwordsMatch} />
                                    </div>

                                    <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={loading}>
                                        {loading ? (
                                            <>
                                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                                Creating Account...
                                            </>
                                        ) : (
                                            "Activate Account"
                                        )}
                                    </Button>
                                </form>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function ValidationItem({ label, isValid }: { label: string; isValid: boolean }) {
    return (
        <div className="flex items-center space-x-2">
            {isValid ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            ) : (
                <XCircle className="h-4 w-4 text-slate-300 dark:text-slate-700" />
            )}
            <span className={`text-xs ${isValid ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500'}`}>
                {label}
            </span>
        </div>
    );
}
