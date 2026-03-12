import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useOrg } from '@/lib/tenant/OrgContext';
import { useSupabaseAuth } from '@/hooks/use-supabase-auth';
import { toast } from 'sonner';

interface CreateCompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

export function CreateCompanyDialog({ open, onOpenChange, onCreated }: CreateCompanyDialogProps) {
  const { organizationId } = useOrg();
  const { user } = useSupabaseAuth();
  const [name, setName] = useState('');
  const [countryId, setCountryId] = useState('');
  const [currency, setCurrency] = useState('');
  const [saving, setSaving] = useState(false);
  const [countries, setCountries] = useState<Array<{ id: string; name: string; code: string }>>([]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase.from('countries').select('id, name, code').order('name');
      setCountries(data || []);
    })();
  }, [open]);

  const handleSubmit = async () => {
    if (!name.trim() || !organizationId) return;
    setSaving(true);
    try {
      const { data: company, error } = await supabase
        .from('companies')
        .insert({
          organization_id: organizationId,
          name: name.trim(),
          country_id: countryId || null,
          currency: currency || null,
        })
        .select('id')
        .single();

      if (error) throw error;

      // Auto-add creating user as member
      if (user?.id && company?.id) {
        await supabase.from('user_company_memberships').insert({
          user_id: user.id,
          company_id: company.id,
        });
      }

      toast.success('Company created successfully');
      setName('');
      setCountryId('');
      setCurrency('');
      onOpenChange(false);
      onCreated?.();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create company');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Company</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="company-name">Company Name *</Label>
            <Input
              id="company-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter company name"
            />
          </div>
          <div className="space-y-2">
            <Label>Country</Label>
            <Select value={countryId} onValueChange={setCountryId}>
              <SelectTrigger>
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                {countries.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="company-currency">Currency Code</Label>
            <Input
              id="company-currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              placeholder="e.g. USD, UGX, EUR"
              maxLength={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || saving}>
            {saving ? 'Creating…' : 'Create Company'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
