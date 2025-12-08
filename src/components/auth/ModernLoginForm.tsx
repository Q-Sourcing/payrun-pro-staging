import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabaseAuth } from '@/hooks/use-supabase-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { log, warn, error as logError, debug } from '@/lib/logger';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, Lock, LogIn } from 'lucide-react';
import { getEnvironmentLabel, getEnvironmentColor, getEnvironmentIcon } from '@/lib/getEnvironmentLabel';
import { PlatformAdminLoginChoice } from './PlatformAdminLoginChoice';

const PLATFORM_ADMIN_EMAIL = 'nalungukevin@gmail.com';

export function ModernLoginForm() {
  const navigate = useNavigate();
  const { login, isLoading, isAuthenticated } = useSupabaseAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPlatformAdminChoice, setShowPlatformAdminChoice] = useState(false);

  // Environment detection
  const envLabel = getEnvironmentLabel();
  const envColor = getEnvironmentColor(envLabel);
  const envIcon = getEnvironmentIcon(envLabel);

  // Console log for developers
  console.log(`🔗 Connected to ${envLabel} environment:`, import.meta.env.VITE_SUPABASE_URL);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      log('User authenticated, redirecting to dashboard');
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    // Validation
    if (!email || !password) {
      setError('Please enter both email and password');
      setIsSubmitting(false);
      return;
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      setIsSubmitting(false);
      return;
    }

    try {
      debug('Submitting login form...');
      await login(email, password);
      log('Login successful');
      
      // Check if this is a platform admin email
      if (email.toLowerCase() === PLATFORM_ADMIN_EMAIL.toLowerCase()) {
        // Show platform admin choice modal
        setShowPlatformAdminChoice(true);
      } else {
        // Regular user - navigate to dashboard
        log('Navigating to dashboard');
        navigate('/');
      }
    } catch (err: any) {
      logError('Login error:', err);
      setError(err.message || 'Failed to login. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormLoading = isLoading || isSubmitting;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
      {/* Environment Badge */}
      <div
        className={`absolute top-3 right-3 text-xs px-3 py-1 rounded-full font-semibold shadow-md ${envColor}`}
        aria-label={`Current environment: ${envLabel}`}
      >
        {envIcon} {envLabel}
      </div>

      <Card className="w-full max-w-md shadow-lg border-border/50">
        <CardHeader className="space-y-3 text-center pb-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <LogIn className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Welcome Back
          </CardTitle>
          <CardDescription className="text-base">
            Sign in to access your payroll dashboard
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-2">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isFormLoading}
                  className="pl-10 h-11"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isFormLoading}
                  className="pl-10 h-11"
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-base font-semibold"
              disabled={isFormLoading}
            >
              {isFormLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign In
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>
              Don't have an account?{' '}
              <a href="/register" className="text-primary hover:underline font-medium">
                Contact your administrator
              </a>
            </p>
          </div>

          {/* Footer Connection Info */}
          <div className="text-center mt-8 text-xs text-gray-500">
            Connected to {envLabel} Database
          </div>
        </CardContent>
      </Card>
      
      {/* Platform Admin Login Choice Modal */}
      <PlatformAdminLoginChoice
        open={showPlatformAdminChoice}
        onClose={() => {
          setShowPlatformAdminChoice(false);
          // If they close without choosing, they're still logged in, so navigate to dashboard
          navigate('/');
        }}
        userEmail={email}
      />
    </div>
  );
}
