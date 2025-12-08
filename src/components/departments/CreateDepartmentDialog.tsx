import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CreateDepartmentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: (department: { id: string; name: string }) => void;
    defaultCompanyUnitId?: string;
}

interface CompanyUnit {
    id: string;
    name: string;
}

export const CreateDepartmentDialog: React.FC<CreateDepartmentDialogProps> = ({
    open,
    onOpenChange,
    onSuccess,
    defaultCompanyUnitId,
}) => {
    const [formData, setFormData] = useState({
        name: '',
        company_unit_id: defaultCompanyUnitId || '',
    });
    const [companyUnits, setCompanyUnits] = useState<CompanyUnit[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingUnits, setLoadingUnits] = useState(false);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const { toast } = useToast();

    useEffect(() => {
        if (open && !defaultCompanyUnitId) {
            loadCompanyUnits();
        }
    }, [open, defaultCompanyUnitId]);

    useEffect(() => {
        if (defaultCompanyUnitId) {
            setFormData(prev => ({ ...prev, company_unit_id: defaultCompanyUnitId }));
        }
    }, [defaultCompanyUnitId]);

    const loadCompanyUnits = async () => {
        setLoadingUnits(true);
        try {
            const { data, error } = await supabase
                .from('company_units')
                .select('id, name')
                .order('name');

            if (error) throw error;
            setCompanyUnits(data || []);
        } catch (error: any) {
            console.error('Error loading company units:', error);
            toast({
                title: 'Error',
                description: 'Failed to load company units',
                variant: 'destructive',
            });
        } finally {
            setLoadingUnits(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});

        // Validation
        if (!formData.name.trim()) {
            setErrors({ name: 'Department name is required' });
            return;
        }
        if (!formData.company_unit_id) {
            setErrors({ company_unit_id: 'Company unit is required' });
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('departments')
                .insert([{
                    name: formData.name.trim(),
                    company_unit_id: formData.company_unit_id,
                }])
                .select()
                .single();

            if (error) throw error;

            toast({
                title: 'Success',
                description: 'Department created successfully',
            });

            onSuccess({ id: data.id, name: data.name });
            setFormData({ name: '', company_unit_id: defaultCompanyUnitId || '' });
            onOpenChange(false);
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Failed to create department',
                variant: 'destructive',
            });
            setErrors({ submit: error.message || 'Failed to create department' });
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setFormData({ name: '', company_unit_id: defaultCompanyUnitId || '' });
        setErrors({});
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Create New Department</DialogTitle>
                    <DialogDescription>
                        Add a new department to the selected company unit.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4 py-4">
                        {!defaultCompanyUnitId && (
                            <div className="space-y-2">
                                <Label htmlFor="department-company-unit">
                                    Company Unit <span className="text-red-500">*</span>
                                </Label>
                                <Select
                                    value={formData.company_unit_id}
                                    onValueChange={(value) => setFormData({ ...formData, company_unit_id: value })}
                                    disabled={loadingUnits}
                                >
                                    <SelectTrigger className={errors.company_unit_id ? 'border-red-500' : ''}>
                                        <SelectValue placeholder={loadingUnits ? 'Loading...' : 'Select company unit'} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {companyUnits.map((unit) => (
                                            <SelectItem key={unit.id} value={unit.id}>
                                                {unit.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.company_unit_id && <p className="text-sm text-red-500">{errors.company_unit_id}</p>}
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="department-name">
                                Department Name <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="department-name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Enter department name"
                                className={errors.name ? 'border-red-500' : ''}
                            />
                            {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                        </div>

                        {errors.submit && (
                            <p className="text-sm text-red-500">{errors.submit}</p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Creating...' : 'Create Department'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
