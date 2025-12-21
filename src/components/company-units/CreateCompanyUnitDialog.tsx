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
import { supabase } from '@/integrations/supabase/client';
import { CompanyUnit, CompanyUnitsService } from '@/lib/services/company-units.service';
import { EmployeeCategoriesService, EmployeeCategory } from '@/lib/services/employee-categories.service';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Check, X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';

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
  const [formData, setFormData] = useState({
    name: '',
    company_id: defaultCompanyId || '',
    categoryIds: [] as string[],
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);
  const [categories, setCategories] = useState<EmployeeCategory[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadCompanies();
      loadCategories();
      setFormData(prev => ({
        ...prev,
        company_id: defaultCompanyId || prev.company_id
      }));
      setErrors({});
    }
  }, [open, defaultCompanyId]);

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

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      // For now, we assume the first organization context. 
      // In a real app, this would come from an OrgContext.
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (profile?.organization_id) {
        const list = await EmployeeCategoriesService.getCategoriesByOrg(profile.organization_id);
        setCategories(list);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      toast({
        title: 'Error',
        description: 'Failed to load categories',
        variant: 'destructive',
      });
    } finally {
      setLoadingCategories(false);
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
    // Categories are optional in N:M, but let's warn if none selected?
    // User requirement said "assign more than one", might imply at least one.
    // Let's make it required for now to align with old behavior.
    if (formData.categoryIds.length === 0) {
      setErrors({ categoryIds: 'At least one category is required' });
      return;
    }

    setLoading(true);
    try {
      const companyUnit = await CompanyUnitsService.createCompanyUnit({
        name: formData.name,
        company_id: formData.company_id,
        categoryIds: formData.categoryIds, // New N:M
        category_id: formData.categoryIds[0], // Legacy primary for fallback
        description: formData.description,
      });

      toast({
        title: 'Success',
        description: 'Company unit created successfully',
      });

      onSuccess({ id: companyUnit.id, name: companyUnit.name });
      setFormData({ name: '', company_id: defaultCompanyId || '', categoryIds: [], description: '' });
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
    setFormData({ name: '', company_id: defaultCompanyId || '', categoryIds: [], description: '' });
    setErrors({});
    onOpenChange(false);
  };

  const toggleCategory = (catId: string) => {
    setFormData(prev => {
      const exists = prev.categoryIds.includes(catId);
      return {
        ...prev,
        categoryIds: exists
          ? prev.categoryIds.filter(id => id !== catId)
          : [...prev.categoryIds, catId]
      };
    });
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
              <Label htmlFor="category">
                Employee Categories <span className="text-red-500">*</span>
              </Label>
              <div className={`border rounded-md p-3 ${errors.categoryIds ? 'border-red-500' : 'border-slate-200'} bg-white`}>
                {loadingCategories ? (
                  <div className="text-sm text-slate-500 italic p-2">Loading categories...</div>
                ) : categories.length === 0 ? (
                  <div className="text-sm text-slate-500 italic p-2">No categories found.</div>
                ) : (
                  <ScrollArea className="h-40">
                    <div className="space-y-2">
                      {categories.map(cat => (
                        <div key={cat.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`cat-${cat.id}`}
                            checked={formData.categoryIds.includes(cat.id)}
                            onCheckedChange={() => toggleCategory(cat.id)}
                          />
                          <label
                            htmlFor={`cat-${cat.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {cat.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {formData.categoryIds.map(id => {
                  const c = categories.find(cat => cat.id === id);
                  return c ? (
                    <Badge key={id} variant="secondary" className="text-xs">
                      {c.label}
                      <button
                        type="button"
                        className="ml-1 hover:text-red-500 focus:outline-none"
                        onClick={() => toggleCategory(id)}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ) : null;
                })}
              </div>
              {errors.categoryIds && <p className="text-sm text-red-500">{errors.categoryIds}</p>}
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

