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
import { CompanyUnitsService, CreateCompanyUnitInput } from '@/lib/services/company-units.service';
import { supabase } from '@/integrations/supabase/client';

interface CreateCompanyUnitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (companyUnit: { id: string; name: string }) => void;
  defaultCompanyId?: string;
}

interface Company {
  id: string;
  name: string;
}

export const CreateCompanyUnitDialog: React.FC<CreateCompanyUnitDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
  defaultCompanyId,
}) => {
  const [formData, setFormData] = useState<CreateCompanyUnitInput>({
    name: '',
    company_id: defaultCompanyId || '',
    kind: undefined,
    description: '',
  });
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadCompanies();
    }
  }, [open]);

  useEffect(() => {
    if (defaultCompanyId) {
      setFormData(prev => ({ ...prev, company_id: defaultCompanyId }));
    }
  }, [defaultCompanyId]);

  const loadCompanies = async () => {
    setLoadingCompanies(true);
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setCompanies(data || []);
    } catch (error: any) {
      console.error('Error loading companies:', error);
      toast({
        title: 'Error',
        description: 'Failed to load companies',
        variant: 'destructive',
      });
    } finally {
      setLoadingCompanies(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validation
    if (!formData.name.trim()) {
      setErrors({ name: 'Company unit name is required' });
      return;
    }
    if (!formData.company_id) {
      setErrors({ company_id: 'Company is required' });
      return;
    }

    setLoading(true);
    try {
      const companyUnit = await CompanyUnitsService.createCompanyUnit({
        name: formData.name.trim(),
        company_id: formData.company_id,
        kind: formData.kind || undefined,
        description: formData.description?.trim() || undefined,
      });

      toast({
        title: 'Success',
        description: 'Company unit created successfully',
      });

      onSuccess({ id: companyUnit.id, name: companyUnit.name });
      setFormData({ name: '', company_id: defaultCompanyId || '', kind: undefined, description: '' });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create company unit',
        variant: 'destructive',
      });
      setErrors({ submit: error.message || 'Failed to create company unit' });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ name: '', company_id: defaultCompanyId || '', kind: undefined, description: '' });
    setErrors({});
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Company Unit</DialogTitle>
          <DialogDescription>
            Add a new company unit to the system.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="company-unit-name">
                Company Unit Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="company-unit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter company unit name"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="company-unit-company">
                Company <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.company_id}
                onValueChange={(value) => setFormData({ ...formData, company_id: value })}
                disabled={loadingCompanies}
              >
                <SelectTrigger className={errors.company_id ? 'border-red-500' : ''}>
                  <SelectValue placeholder={loadingCompanies ? 'Loading...' : 'Select company'} />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.company_id && <p className="text-sm text-red-500">{errors.company_id}</p>}
            </div>


            <div className="space-y-2">
              <Label htmlFor="company-unit-description">Description (Optional)</Label>
              <Input
                id="company-unit-description"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter description"
              />
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
              {loading ? 'Creating...' : 'Create Company Unit'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

