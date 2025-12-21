import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, AlertTriangle, CheckCircle, User, Shield, Building } from 'lucide-react';

export default function Diagnostics() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const runDiagnostic = async () => {
    if (!email) return;
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const { data: result, error: rpcError } = await supabase.rpc('get_user_diagnostic_data', {
        _email: email.trim()
      });

      if (rpcError) throw rpcError;

      if ((result as any)?.error) {
        setError((result as any).error);
      } else if (result) {
        setData(result);
      }
    } catch (err: any) {
      console.error('Diagnostic error:', err);
      setError(err.message || 'Failed to run diagnostic');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">System Diagnostics</h1>
        <p className="text-muted-foreground">Troubleshoot user account and authentication state inconsistencies.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User State Inspector</CardTitle>
          <CardDescription>Enter a user's email to see their current standing across all systems.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="jane.doe@example.com"
                className="pl-9 h-10"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && runDiagnostic()}
              />
            </div>
            <Button onClick={runDiagnostic} disabled={loading || !email}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Run Check
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Auth Status */}
          <Card className={!data.auth_user?.confirmed_at ? "border-amber-500/50" : ""}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4" /> Auth Service (auth.users)
                </CardTitle>
                {data.auth_user?.confirmed_at ? (
                  <Badge variant="outline" className="text-emerald-500 border-emerald-500/20 bg-emerald-500/10">Confirmed</Badge>
                ) : (
                  <Badge variant="outline" className="text-amber-500 border-amber-500/20 bg-amber-500/10">Unconfirmed</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
              <DetailItem label="User ID" value={data.auth_user?.id} mono />
              <DetailItem label="Confirmed At" value={data.auth_user?.confirmed_at || 'Never'} />
              <DetailItem label="Last Sign In" value={data.auth_user?.last_sign_in_at || 'Never'} />
              <DetailItem label="Metadata Org ID" value={data.auth_user?.meta_org_id || 'Missing'} />
            </CardContent>
          </Card>

          {/* Profile Status */}
          <Card className={!data.profile ? "border-destructive/50" : ""}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4" /> App Profile (public.user_profiles)
                </CardTitle>
                {data.profile ? (
                  <Badge variant="outline" className="text-emerald-500 border-emerald-500/20 bg-emerald-500/10">Found</Badge>
                ) : (
                  <Badge variant="outline" className="text-destructive border-destructive/20 bg-destructive/10">Missing</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
              <DetailItem label="Email in Profile" value={data.profile?.email || 'N/A'} />
              <DetailItem label="Organization ID" value={data.profile?.organization_id || 'N/A'} mono />
              <DetailItem label="System Role" value={data.profile?.role || 'N/A'} />
              <DetailItem label="Account Status" value={data.profile?.locked_at ? `Locked (${data.profile.locked_at})` : 'Active'} color={data.profile?.locked_at ? 'text-destructive' : 'text-emerald-500'} />
            </CardContent>
          </Card>

          {/* Org Membership */}
          <Card className={data.org_user?.status !== 'active' ? "border-amber-500/50" : ""}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Building className="h-4 w-4" /> Org Membership (public.org_users)
                </CardTitle>
                <Badge variant="outline">{data.org_user?.status || 'No Membership'}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
              <DetailItem label="Status" value={data.org_user?.status || 'N/A'} />
              <DetailItem label="Org ID" value={data.org_user?.org_id || 'N/A'} mono />
            </CardContent>
          </Card>

          {/* Invitation Status */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" /> Invitation (public.user_invites)
                </CardTitle>
                <Badge variant="outline">{data.invitation?.status || 'No Invite Found'}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
              <DetailItem label="Invite Status" value={data.invitation?.status || 'N/A'} />
              <DetailItem label="Expires At" value={data.invitation?.expires_at || 'N/A'} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function DetailItem({ label, value, mono = false, color = "" }: { label: string; value: string | null; mono?: boolean; color?: string }) {
  return (
    <div className="flex flex-col space-y-1">
      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{label}</span>
      <span className={`text-sm truncate ${mono ? 'font-mono text-xs' : ''} ${color || 'text-foreground'}`}>
        {value || 'None'}
      </span>
    </div>
  );
}
