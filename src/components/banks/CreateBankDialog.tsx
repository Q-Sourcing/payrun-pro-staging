import React, { useState } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { BanksService, CreateBankInput } from '@/lib/services/banks.service';
import { ALL_COUNTRIES } from '@/lib/constants/countries';

interface CreateBankDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (bank: { id: string; name: string }) => void;
  defaultCountryCode?: string;
}

export const CreateBankDialog: React.FC<CreateBankDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
  defaultCountryCode,
}) => {
  const [formData, setFormData] = useState<CreateBankInput>({
    name: '',
    country_code: defaultCountryCode || '',
    swift_code: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validation
    if (!formData.name.trim()) {
      setErrors({ name: 'Bank name is required' });
      return;
    }
    if (!formData.country_code) {
      setErrors({ country_code: 'Country is required' });
      return;
    }

    setLoading(true);
    try {
      const bank = await BanksService.createBank({
        name: formData.name.trim(),
        country_code: formData.country_code,
        swift_code: formData.swift_code?.trim() || undefined,
      });

      toast({
        title: 'Success',
        description: 'Bank created successfully',
      });

      onSuccess({ id: bank.id, name: bank.name });
      setFormData({ name: '', country_code: defaultCountryCode || '', swift_code: '' });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create bank',
        variant: 'destructive',
      });
      setErrors({ submit: error.message || 'Failed to create bank' });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ name: '', country_code: defaultCountryCode || '', swift_code: '' });
    setErrors({});
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Bank</DialogTitle>
          <DialogDescription>
            Add a new bank to the system. This bank will be available for selection when creating employees.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="bank-name">
                Bank Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="bank-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter bank name"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bank-country">
                Country <span className="text-red-500">*</span>
              </Label>
              <select
                id="bank-country"
                value={formData.country_code}
                onChange={(e) => setFormData({ ...formData, country_code: e.target.value })}
                className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${errors.country_code ? 'border-red-500' : ''}`}
              >
                <option value="">Select country</option>
                {ALL_COUNTRIES.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
              {errors.country_code && <p className="text-sm text-red-500">{errors.country_code}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bank-swift">SWIFT Code (Optional)</Label>
              <Input
                id="bank-swift"
                value={formData.swift_code || ''}
                onChange={(e) => setFormData({ ...formData, swift_code: e.target.value })}
                placeholder="Enter SWIFT/BIC code"
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
              {loading ? 'Creating...' : 'Create Bank'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

