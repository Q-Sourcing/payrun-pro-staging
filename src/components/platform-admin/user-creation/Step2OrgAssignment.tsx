import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { StepProps } from './types';
import { PlatformAdminService, Organization } from '@/lib/services/platform-admin.service';
import { Loader2 } from 'lucide-react';

export function Step2OrgAssignment({ data, updateData }: StepProps) {
    const [orgs, setOrgs] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            const list = await PlatformAdminService.getAllOrganizations();
            setOrgs(list);
            setLoading(false);
        }
        load();
    }, []);

    const toggleOrg = (orgId: string, checked: boolean) => {
        let newSelected = [...data.selectedOrgIds];
        if (checked) {
            if (!newSelected.includes(orgId)) newSelected.push(orgId);
        } else {
            newSelected = newSelected.filter(id => id !== orgId);
        }
        updateData({ selectedOrgIds: newSelected });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Organization Assignment</CardTitle>
                <CardDescription>Select which organizations this user belongs to.</CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
                ) : (
                    <div className="space-y-4">
                        {orgs.map(org => (
                            <div key={org.id} className="flex items-start space-x-3 p-3 border rounded-md hover:bg-muted/50">
                                <Checkbox
                                    id={`org-${org.id}`}
                                    checked={data.selectedOrgIds.includes(org.id)}
                                    onCheckedChange={(checked) => toggleOrg(org.id, checked as boolean)}
                                />
                                <div className="space-y-1">
                                    <Label htmlFor={`org-${org.id}`} className="font-medium cursor-pointer">
                                        {org.name}
                                    </Label>
                                    <p className="text-sm text-muted-foreground">{org.description || 'No description'}</p>
                                </div>
                            </div>
                        ))}
                        {orgs.length === 0 && <p className="text-muted-foreground">No organizations found.</p>}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
