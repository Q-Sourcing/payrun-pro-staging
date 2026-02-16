import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { StepProps } from './types';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface OrgRole {
    id: string;
    org_id: string;
    key: string;
    name: string;
    description?: string;
}

export function Step4RoleAssignment({ data, updateData }: StepProps) {
    const [loading, setLoading] = useState(false);
    const [rolesByOrg, setRolesByOrg] = useState<Record<string, OrgRole[]>>({});
    const [orgNames, setOrgNames] = useState<Record<string, string>>({});

    useEffect(() => {
        async function load() {
            if (data.selectedOrgIds.length === 0) {
                setLoading(false);
                return;
            }

            // Fetch dates (roles and org names)
            const [rolesResponse, orgsResponse] = await Promise.all([
                supabase.from('org_roles').select('*').in('org_id', data.selectedOrgIds),
                supabase.from('organizations').select('id, name').in('id', data.selectedOrgIds)
            ]);

            if (rolesResponse.data) {
                const grouped: Record<string, OrgRole[]> = {};
                rolesResponse.data.forEach(r => {
                    if (!grouped[r.org_id]) grouped[r.org_id] = [];
                    grouped[r.org_id].push(r);
                });
                setRolesByOrg(grouped);
            }

            if (orgsResponse.data) {
                const names: Record<string, string> = {};
                orgsResponse.data.forEach(org => {
                    names[org.id] = org.name;
                });
                setOrgNames(names);
            }

            setLoading(false);
        }
        load();
    }, [data.selectedOrgIds]);

    const toggleRole = (orgId: string, roleKey: string, checked: boolean) => {
        const currentConfig = data.orgConfig[orgId] || { companyIds: [], roles: [] };
        let newRoles = [...currentConfig.roles];

        if (checked) {
            if (!newRoles.includes(roleKey)) newRoles.push(roleKey);
        } else {
            newRoles = newRoles.filter(k => k !== roleKey);
        }

        updateData({
            orgConfig: {
                ...data.orgConfig,
                [orgId]: { ...currentConfig, roles: newRoles }
            }
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Role Assignment</CardTitle>
                <CardDescription>Assign roles for each organization.</CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
                ) : data.selectedOrgIds.length === 0 ? (
                    <p className="text-muted-foreground">No organizations selected.</p>
                ) : (
                    <div className="space-y-6">
                        {data.selectedOrgIds.map(orgId => {
                            const roles = rolesByOrg[orgId] || [];
                            const config = data.orgConfig[orgId] || { companyIds: [], roles: [] };
                            const orgName = orgNames[orgId] || 'Unknown Organization';

                            return (
                                <div key={orgId} className="border p-4 rounded-md">
                                    <h3 className="font-semibold mb-3">Organization: {orgName}</h3>
                                    <div className="space-y-3">
                                        {roles.length === 0 ? <p className="text-sm text-muted-foreground">No roles found.</p> :
                                            roles.map(r => (
                                                <div key={r.id} className="flex items-center justify-between p-2 border rounded hover:bg-muted/50">
                                                    <div className="flex items-center space-x-3">
                                                        <Checkbox
                                                            id={`role-${r.id}`}
                                                            checked={config.roles.includes(r.key)}
                                                            onCheckedChange={(checked) => toggleRole(orgId, r.key, checked as boolean)}
                                                        />
                                                        <div className="space-y-0.5">
                                                            <Label htmlFor={`role-${r.id}`} className="font-medium">{r.name}</Label>
                                                            <p className="text-xs text-muted-foreground">{r.description}</p>
                                                        </div>
                                                    </div>
                                                    {r.key === 'ORG_ADMIN' || r.key === 'ORG_OWNER' ? (
                                                        <Badge variant="destructive" className="ml-2">Admin</Badge>
                                                    ) : null}
                                                </div>
                                            ))
                                        }
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
