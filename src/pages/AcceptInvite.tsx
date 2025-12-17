
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function AcceptInvite() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [loading, setLoading] = useState(false);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Extract token/code from URL
    const token = searchParams.get('token') || searchParams.get('access_token');
    const code = searchParams.get('code');
    const type = searchParams.get('type') || 'invite';

    // Check hash for access_token (Implicit flow fallback)
    useEffect(() => {
        const hash = window.location.hash;
        if (hash && hash.includes('access_token')) {
            // Supabase client auto-handles hash processing on load, 
            // but we can ensure we don't redirect to login if session is recovering
            console.log('Detected hash token, waiting for session...');
        }
    }, []);

    useEffect(() => {
        const handleAuth = async () => {
            // Case 1: PKCE Code
            if (code) {
                setLoading(true);
                const { data, error } = await supabase.auth.exchangeCodeForSession(code);
                setLoading(false);

                if (error) {
                    console.error('Exchange Code Error:', error);
                    toast({
                        variant: "destructive",
                        title: "Invalid Link",
                        description: "Could not verify invitation code. It may be expired."
                    });
                    navigate('/login');
                } else {
                    console.log('Session established via code');
                }
                return;
            }

            // Case 2: Existing Session (Auto-handled by Supabase client from hash)
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                console.log('Session already active');
                return;
            }

            // Case 3: Magic Link Token (Legacy/OTP)
            if (!token && !code) {
                // Wait a brief moment for session to restore from hash if present
                const hash = window.location.hash;
                if (hash && hash.includes('access_token')) return;

                console.warn('No token, code, or session found');
                toast({
                    variant: "destructive",
                    title: "Invalid Link",
                    description: "No invitation token found. Please check your email link."
                });
                navigate('/login');
            }
        };

        handleAuth();
    }, [token, code, navigate, toast]);

    const handleAccept = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            toast({
                variant: "destructive",
                title: "Passwords do not match",
                description: "Please ensure both passwords are the same."
            });
            return;
        }

        if (password.length < 6) {
            toast({
                variant: "destructive",
                title: "Weak Password",
                description: "Password must be at least 6 characters long."
            });
            return;
        }

        setLoading(true);

        try {
            // 1. Verify session or token
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                if (!token) throw new Error("No session or token available");

                // Fallback to verifyOtp for legacy magic links
                const { error: verifyError } = await supabase.auth.verifyOtp({
                    token_hash: token,
                    type: type as any,
                });

                if (verifyError) {
                    console.error('Verify OTP Error:', verifyError);
                    throw new Error("Invalid or expired invitation link.");
                }
            }

            // 2. Set the user's password
            const { error: updateError } = await supabase.auth.updateUser({
                password: password
            });

            if (updateError) throw updateError;

            // Password updated successfully
            // The database trigger (activate_invited_user) will automatically:
            // - Update org_users.status to 'active'
            // - Assign roles to org_user_roles
            // - Assign companies to user_company_memberships
            // - Mark user_invites as 'accepted'

            toast({
                title: "Account Setup Complete",
                description: "You have successfully set your password and logged in."
            });

            // 3. Navigate to dashboard
            navigate('/dashboard');

        } catch (error: any) {
            console.error('Accept Invite Error:', error);
            toast({
                variant: "destructive",
                title: "Invitation Failed",
                description: error.message || "Could not verify invitation. It may be expired."
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Welcome to PayRun Pro</CardTitle>
                    <CardDescription>
                        Complete your account setup by creating a password.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleAccept} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="password">New Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="••••••••"
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
                                placeholder="••••••••"
                            />
                        </div>

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Setting up account...
                                </>
                            ) : (
                                "Set Password & Login"
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
