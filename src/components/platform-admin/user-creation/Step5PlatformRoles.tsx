import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { StepProps } from './types';

const PLATFORM_ROLES = [
    { key: 'super_admin', name: 'Platform Super Admin', description: 'Full access to all platform and tenant settings.' },
    { key: 'support_admin', name: 'Platform Support', description: 'Access to support tools and read-only tenant data.' },
    { key: 'compliance', name: 'Compliance Officer', description: 'Access to audit logs and compliance reports.' },
    { key: 'billing', name: 'Billing Admin', description: 'Manage billing and subscriptions.' },
];

export function Step5PlatformRoles({ data, updateData }: StepProps) {
    const toggleRole = (key: string, checked: boolean) => {
        let newRoles = [...data.platformRoles];
        if (checked) {
            if (!newRoles.includes(key)) newRoles.push(key);
        } else {
            newRoles = newRoles.filter(k => k !== key);
        }
        updateData({ platformRoles: newRoles });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Platform Roles (Optional)</CardTitle>
                <CardDescription>Assign global platform-level rules. These apply across ALL tenants.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {PLATFORM_ROLES.map(role => (
                        <div key={role.key} className="flex items-start space-x-3 p-3 border rounded-md hover:bg-muted/50">
                            <Checkbox
                                id={`pr-${role.key}`}
                                checked={data.platformRoles.includes(role.key)}
                                onCheckedChange={(checked) => toggleRole(role.key, checked as boolean)}
                            />
                            <div className="space-y-1">
                                <Label htmlFor={`pr-${role.key}`} className="font-medium">{role.name}</Label>
                                <p className="text-sm text-muted-foreground">{role.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
