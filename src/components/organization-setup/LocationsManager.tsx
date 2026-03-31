import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrg } from '@/lib/auth/OrgProvider';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Pencil, Trash2, Loader2, Search } from 'lucide-react';

interface Location {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  is_active: boolean;
}

const emptyForm = { name: '', address: '', city: '', state: '', country: '' };

export const LocationsManager: React.FC = () => {
  const { organizationId } = useOrg();
  const { toast } = useToast();

  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');

  const fetchLocations = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('locations')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('name');

    if (error) {
      toast({ title: 'Error', description: 'Failed to load locations.', variant: 'destructive' });
    } else {
      setLocations(data ?? []);
    }
    setLoading(false);
  }, [organizationId, toast]);

  useEffect(() => { fetchLocations(); }, [fetchLocations]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (l: Location) => {
    setEditingId(l.id);
    setForm({
      name: l.name,
      address: l.address || '',
      city: l.city || '',
      state: l.state || '',
      country: l.country || '',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!organizationId || !form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        country: form.country.trim() || null,
      };
      if (editingId) {
        const { error } = await (supabase as any).from('locations').update(payload).eq('id', editingId);
        if (error) throw error;
        toast({ title: 'Location updated' });
      } else {
        const { error } = await (supabase as any).from('locations').insert({ ...payload, organization_id: organizationId });
        if (error) throw error;
        toast({ title: 'Location created' });
      }
      setModalOpen(false);
      await fetchLocations();
    } catch (err: any) {
      const msg = err?.message?.includes('duplicate')
        ? 'A location with this name already exists.'
        : 'Failed to save location.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await (supabase as any).from('locations').update({ is_active: false }).eq('id', id);
    if (error) {
      toast({ title: 'Error', description: 'Failed to remove location.', variant: 'destructive' });
    } else {
      toast({ title: 'Location removed' });
      await fetchLocations();
    }
  };

  const filtered = locations.filter((l) =>
    [l.name, l.city, l.state, l.country].some((v) => v?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Locations</h3>
          <p className="text-sm text-muted-foreground">Manage office locations and work sites.</p>
        </div>
        <Button onClick={openCreate} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Location
        </Button>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search locations…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 h-9"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg">
          <p className="text-sm text-muted-foreground">
            {search ? 'No locations match your search.' : 'No locations configured yet. Add your first location to get started.'}
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>City</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Country</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{l.city || '—'}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{l.state || '—'}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{l.country || '—'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(l)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(l.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Location' : 'Add Location'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="loc-name">Name *</Label>
              <Input id="loc-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Head Office" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="loc-address">Address</Label>
              <Input id="loc-address" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="Street address" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="loc-city">City</Label>
                <Input id="loc-city" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="loc-state">State</Label>
                <Input id="loc-state" value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="loc-country">Country</Label>
              <Input id="loc-country" value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim()} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingId ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
