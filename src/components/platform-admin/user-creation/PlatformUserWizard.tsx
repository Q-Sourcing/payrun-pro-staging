import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Step1UserDetails } from './Step1UserDetails';
import { Step2OrgAssignment } from './Step2OrgAssignment';
import { Step3CompanyAssignment } from './Step3CompanyAssignment';
import { Step4RoleAssignment } from './Step4RoleAssignment';
import { Step5PlatformRoles } from './Step5PlatformRoles';
import { Step6Review } from './Step6Review';
import { useToast } from '@/hooks/use-toast';
import { PlatformAdminService } from '@/lib/services/platform-admin.service';

import { WizardData } from './types';

const INITIAL_DATA: WizardData = {
    firstName: '',
    lastName: '',
    email: '',
    selectedOrgIds: [],
    orgConfig: {},
    platformRoles: []
};

interface PlatformUserWizardProps {
    onComplete: () => void;
    onCancel: () => void;
}

export function PlatformUserWizard({ onComplete, onCancel }: PlatformUserWizardProps) {
    const [step, setStep] = useState(1);
    const [data, setData] = useState<WizardData>(INITIAL_DATA);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const totalSteps = 6;
    const progress = (step / totalSteps) * 100;

    const updateData = (partial: Partial<WizardData>) => {
        setData(prev => ({ ...prev, ...partial }));
    };

    const nextStep = () => setStep(s => Math.min(s + 1, totalSteps));
    const prevStep = () => setStep(s => Math.max(s - 1, 1));

    const handleSubmit = async () => {
        if (!data.email || !data.firstName || !data.lastName) {
            toast({ title: 'Validation Error', description: 'User details required', variant: 'destructive' });
            return;
        }

        setLoading(true);
        try {
            // Transform data for backend
            const payload = {
                email: data.email,
                firstName: data.firstName,
                lastName: data.lastName,
                platformRoles: data.platformRoles,
                orgs: data.selectedOrgIds.map(orgId => ({
                    orgId,
                    companyIds: data.orgConfig[orgId]?.companyIds || [],
                    roles: data.orgConfig[orgId]?.roles || []
                }))
            };

            const result = await PlatformAdminService.createPlatformUser(payload);

            toast({
                title: 'Success',
                description: 'User created/updated successfully',
            });
            onComplete();
        } catch (error: any) {
            toast({
                title: 'Creation Failed',
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <div className="flex justify-between text-sm">
                    <span>Step {step} of {totalSteps}</span>
                    <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
            </div>

            <div className="min-h-[400px]">
                {step === 1 && (
                    <Step1UserDetails
                        data={data}
                        updateData={updateData}
                    />
                )}
                {step === 2 && (
                    <Step2OrgAssignment
                        data={data}
                        updateData={updateData}
                    />
                )}
                {step === 3 && (
                    <Step3CompanyAssignment
                        data={data}
                        updateData={updateData}
                    />
                )}
                {step === 4 && (
                    <Step4RoleAssignment
                        data={data}
                        updateData={updateData}
                    />
                )}
                {step === 5 && (
                    <Step5PlatformRoles
                        data={data}
                        updateData={updateData}
                    />
                )}
                {step === 6 && (
                    <Step6Review
                        data={data}
                    />
                )}
            </div>

            <div className="flex justify-between pt-4 border-t">
                <Button variant="outline" onClick={step === 1 ? onCancel : prevStep} disabled={loading}>
                    {step === 1 ? 'Cancel' : 'Back'}
                </Button>

                {step < totalSteps ? (
                    <Button onClick={nextStep} disabled={loading}>
                        Next
                    </Button>
                ) : (
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading ? 'Creating...' : 'Create User'}
                    </Button>
                )}
            </div>
        </div>
    );
}
