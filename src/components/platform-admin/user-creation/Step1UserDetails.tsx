import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StepProps } from './types';

export function Step1UserDetails({ data, updateData }: StepProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>User Details</CardTitle>
                <CardDescription>Enter the user's basic information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                            id="firstName"
                            value={data.firstName}
                            onChange={(e) => updateData({ firstName: e.target.value })}
                            placeholder="John"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                            id="lastName"
                            value={data.lastName}
                            onChange={(e) => updateData({ lastName: e.target.value })}
                            placeholder="Doe"
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                        id="email"
                        type="email"
                        value={data.email}
                        onChange={(e) => updateData({ email: e.target.value })}
                        placeholder="john.doe@example.com"
                    />
                </div>
            </CardContent>
        </Card>
    );
}
