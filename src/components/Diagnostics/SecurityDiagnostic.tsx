import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ShieldCheck, ShieldAlert, Fingerprint, Lock, Unlock, Database, RefreshCw, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/hooks/use-supabase-auth';
import { JWTClaimsService } from '@/lib/services/auth/jwt-claims';

interface SecurityCheckResult {
    id: string;
    name: string;
    status: 'pending' | 'success' | 'warning' | 'error';
    message: string;
    details?: any;
}

export function SecurityDiagnostic() {
    const { user, profile, userContext, claims } = useSupabaseAuth();
    const [checks, setChecks] = useState<SecurityCheckResult[]>([]);
    const [isRunning, setIsRunning] = useState(false);

    const runSecurityChecks = async () => {
        setIsRunning(true);
        const newChecks: SecurityCheckResult[] = [];

        // 1. JWT Claims Check
        const jwtClaims = JWTClaimsService.getCurrentClaims();
        newChecks.push({
            id: 'jwt-claims',
            name: 'JWT Claims Integrity',
            status: jwtClaims ? 'success' : 'error',
            message: jwtClaims ? `Claims extracted: ${jwtClaims.app_metadata?.rbac_roles?.[0]?.role || 'N/A'}` : 'Failed to extract claims',
            details: jwtClaims
        });

        // 2. Profile vs Claims Sync
        if (profile && jwtClaims) {
            const isRoleSynced = profile.role === (jwtClaims.app_metadata?.rbac_roles?.[0]?.role || 'SELF_USER');
            const isOrgSynced = profile.organization_id === jwtClaims.organization_id;

            newChecks.push({
                id: 'role-sync',
                name: 'Role/Org Sync',
                status: (isRoleSynced && isOrgSynced) ? 'success' : 'warning',
                message: (isRoleSynced && isOrgSynced)
                    ? 'Profile and JWT claims are synchronized.'
                    : `Sync issues: Role(${isRoleSynced ? 'OK' : 'FAIL'}), Org(${isOrgSynced ? 'OK' : 'FAIL'})`,
                details: { profile, claims: jwtClaims }
            });
        }

        // 3. RLS Isolation Check (Cross-tenant attempt)
        try {
            // Intentional check: query organizations table
            const { data: orgs, error: orgError } = await supabase
                .from('organizations')
                .select('id, name')
                .limit(5);

            if (orgError) throw orgError;

            const isSuperAdmin = profile?.role === 'PLATFORM_SUPER_ADMIN';
            const orgCount = orgs?.length || 0;

            newChecks.push({
                id: 'rls-check',
                name: 'RLS Isolation',
                status: (isSuperAdmin && orgCount > 1) || (!isSuperAdmin && orgCount <= 1) ? 'success' : 'warning',
                message: isSuperAdmin
                    ? `Super Admin: Can see ${orgCount} organizations.`
                    : `Standard User: Limited to ${orgCount} organization.`,
                details: orgs
            });
        } catch (err: any) {
            newChecks.push({
                id: 'rls-check',
                name: 'RLS Isolation',
                status: 'error',
                message: `Query failed: ${err.message}`,
                details: err
            });
        }

        // 4. Activity Logs RLS
        try {
            const { data: logs, error: logsError } = await supabase
                .from('activity_logs')
                .select('id, organization_id')
                .limit(1);

            if (logsError) throw logsError;

            newChecks.push({
                id: 'activity-logs-rls',
                name: 'Audit Log Privacy',
                status: 'success',
                message: logs?.length ? 'Shared org logs accessible.' : 'No logs found (expected if new org).',
                details: logs
            });
        } catch (err: any) {
            newChecks.push({
                id: 'activity-logs-rls',
                name: 'Audit Log Privacy',
                status: 'error',
                message: `Logs check failed: ${err.message}`,
                details: err
            });
        }

        setChecks(newChecks);
        setIsRunning(false);
    };

    useEffect(() => {
        runSecurityChecks();
    }, [user]);

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    Security & Access Control (OBAC)
                </CardTitle>
                <CardDescription>
                    Verifies RLS policies, role synchronization, and JWT claim integrity.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex gap-2">
                        <Badge variant="outline" className="font-mono">
                            UID: {user?.id?.substring(0, 8)}...
                        </Badge>
                        <Badge variant="secondary" className="capitalize">
                            {profile?.role || 'No Role'}
                        </Badge>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={runSecurityChecks}
                        disabled={isRunning}
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${isRunning ? 'animate-spin' : ''}`} />
                        Re-run Checks
                    </Button>
                </div>

                <div className="grid gap-3">
                    {checks.map((check) => (
                        <div
                            key={check.id}
                            className={`p-3 rounded-lg border flex items-start gap-3 ${check.status === 'success' ? 'bg-green-50 border-green-100' :
                                check.status === 'warning' ? 'bg-yellow-50 border-yellow-100' :
                                    'bg-red-50 border-red-100'
                                }`}
                        >
                            <div className="mt-0.5">
                                {check.status === 'success' ? <CheckCircle className="h-4 w-4 text-green-600" /> :
                                    check.status === 'warning' ? <ShieldAlert className="h-4 w-4 text-yellow-600" /> :
                                        <ShieldAlert className="h-4 w-4 text-red-600" />}
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-semibold">{check.name}</p>
                                <p className="text-xs text-gray-600 mt-1">{check.message}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {profile?.role !== 'PLATFORM_SUPER_ADMIN' && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-800">
                        <strong>Note for Admins:</strong> Cross-tenant isolation checks are most effective when logged in as a standard user. Super Admins will bypass most RLS filters by design.
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
