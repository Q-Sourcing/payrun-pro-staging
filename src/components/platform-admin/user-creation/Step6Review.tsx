import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { StepProps } from './types';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export function Step6Review({ data }: Pick<StepProps, 'data'>) {
    const totalOrgs = data.selectedOrgIds.length;
    const totalPlatformRoles = data.platformRoles.length;

    // Org Names State
    const [orgNames, setOrgNames] = React.useState<Record<string, string>>({});

    React.useEffect(() => {
        if (data.selectedOrgIds.length > 0) {
            import('@/integrations/supabase/client').then(({ supabase }) => {
                supabase.from('organizations')
                    .select('id, name')
                    .in('id', data.selectedOrgIds)
                    .then(({ data: orgs }: { data: { id: string, name: string }[] | null }) => {
                        if (orgs) {
                            const map: Record<string, string> = {};
                            orgs.forEach(o => map[o.id] = o.name);
                            setOrgNames(map);
                        }
                    });
            });
        }
    }, [data.selectedOrgIds]);

    const orgAssignments = data.selectedOrgIds.map(orgId => {
        const config = data.orgConfig[orgId] || { companyIds: [], roles: [] };
        return {
            orgId,
            orgName: orgNames[orgId] || 'Loading...',
            companies: config.companyIds.length,
            roles: config.roles.length,
            roleNames: config.roles.join(', ')
        };
    });

    return (
        <Card>
            <CardHeader>
                <CardTitle>Review & Create</CardTitle>
                <CardDescription>Verify the details below before creating the user.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

                {/* User Details */}
                <div>
                    <h3 className="text-lg font-semibold mb-2">User Identity</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-muted-foreground block">Full Name</span>
                            <span className="font-medium">{data.firstName} {data.lastName}</span>
                        </div>
                        <div>
                            <span className="text-muted-foreground block">Email</span>
                            <span className="font-medium">{data.email}</span>
                        </div>
                    </div>
                </div>

                <Separator />

                {/* Platform Roles */}
                <div>
                    <h3 className="text-lg font-semibold mb-2">Platform Access</h3>
                    {totalPlatformRoles === 0 ? (
                        <p className="text-sm text-muted-foreground">No platform roles assigned.</p>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {data.platformRoles.map(r => (
                                <Badge key={r} variant="secondary">{r}</Badge>
                            ))}
                        </div>
                    )}
                </div>

                <Separator />

                {/* Organization Access */}
                <div>
                    <h3 className="text-lg font-semibold mb-2">Organization Access ({totalOrgs})</h3>
                    {totalOrgs === 0 ? (
                        <p className="text-sm text-muted-foreground">No organizations assigned.</p>
                    ) : (
                        <div className="space-y-4">
                            {orgAssignments.map(assign => (
                                <div key={assign.orgId} className="border p-3 rounded-md text-sm">
                                    <div className="font-medium mb-1">Organization: {assign.orgName}</div>
                                    <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                                        <div>Companies: {assign.companies} selected</div>
                                        <div>Roles: {assign.roleNames || 'None'}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200">
                    <p className="text-sm text-yellow-800">
                        <strong>Note:</strong> An email invitation will be sent to <strong>{data.email}</strong> immediately after creation.
                    </p>
                </div>

            </CardContent>
        </Card>
    );
}
