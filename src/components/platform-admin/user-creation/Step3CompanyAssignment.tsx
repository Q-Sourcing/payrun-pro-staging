import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { StepProps } from './types';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface Company {
    id: string;
    organization_id: string;
    name: string;
}

export function Step3CompanyAssignment({ data, updateData }: StepProps) {
    const [companiesByOrg, setCompaniesByOrg] = useState<Record<string, Company[]>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            if (data.selectedOrgIds.length === 0) {
                setLoading(false);
                return;
            }

            const { data: companies, error } = await supabase
                .from('companies')
                .select('id, name, organization_id')
                .in('organization_id', data.selectedOrgIds as string[]);

            if (companies) {
                const grouped: Record<string, Company[]> = {};
                companies.forEach(c => {
                    if (!grouped[c.organization_id]) grouped[c.organization_id] = [];
                    grouped[c.organization_id].push(c);
                });
                setCompaniesByOrg(grouped);
            }
            setLoading(false);
        }
        load();
    }, [data.selectedOrgIds]);

    const toggleCompany = (orgId: string, companyId: string, checked: boolean) => {
        const currentConfig = data.orgConfig[orgId] || { companyIds: [], roles: [] };
        let newCompanyIds = [...currentConfig.companyIds];

        if (checked) {
            if (!newCompanyIds.includes(companyId)) newCompanyIds.push(companyId);
        } else {
            newCompanyIds = newCompanyIds.filter(id => id !== companyId);
        }

        updateData({
            orgConfig: {
                ...data.orgConfig,
                [orgId]: { ...currentConfig, companyIds: newCompanyIds }
            }
        });
    };

    const getOrgName = (orgId: string) => {
        // In a real app we might pass org details down or fetch them, 
        // for now we trust the user knows which org is which or we could fetch org names too.
        // Simplification: just show "Organization {ID}" if we don't have name handy, 
        // but better to fetch it. Ideally Step 2 passed it? 
        // Let's just group by Org ID for now or fetch org names in useEffect.
        return `Organization ${orgId.substring(0, 8)}...`;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Company Assignment</CardTitle>
                <CardDescription>Select companies for each organization.</CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
                ) : data.selectedOrgIds.length === 0 ? (
                    <p className="text-muted-foreground">No organizations selected.</p>
                ) : (
                    <div className="space-y-6">
                        {data.selectedOrgIds.map(orgId => {
                            const companies = companiesByOrg[orgId] || [];
                            const config = data.orgConfig[orgId] || { companyIds: [], roles: [] };

                            return (
                                <div key={orgId} className="border p-4 rounded-md">
                                    {/* Ideally we'd show Org Name here. We can fetch it or just header. */}
                                    <h3 className="font-semibold mb-3">Organization: {orgId}</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {companies.length === 0 ? <p className="text-sm text-muted-foreground">No companies found.</p> :
                                            companies.map(c => (
                                                <div key={c.id} className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id={`comp-${c.id}`}
                                                        checked={config.companyIds.includes(c.id)}
                                                        onCheckedChange={(checked) => toggleCompany(orgId, c.id, checked as boolean)}
                                                    />
                                                    <Label htmlFor={`comp-${c.id}`}>{c.name}</Label>
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
