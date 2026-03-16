import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrg } from '@/lib/tenant/OrgContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';

interface Designation {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export const DesignationsManager: React.FC = () => {
  const { organizationId } = useOrg();
  const { toast } = useToast();

  const [designations, setDesignations] = useState<Designation[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', description: '' });

  const fetchDesignations = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('designations')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('name');

    if (error) {
      toast({ title: 'Error', description: 'Failed to load designations.', variant: 'destructive' });
    } else {
      setDesignations(data ?? []);
    }
    setLoading(false);
  }, [organizationId, toast]);

  useEffect(() => {
    fetchDesignations();
  }, [fetchDesignations]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ name: '', description: '' });
    setModalOpen(true);
  };

  const openEdit = (d: Designation) => {
    setEditingId(d.id);
    setForm({ name: d.name, description: d.description || '' });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!organizationId || !form.name.trim()) return;
    setSaving(true);

    try {
      if (editingId) {
        const { error } = await (supabase as any)
          .from('designations')
          .update({ name: form.name.trim(), description: form.description.trim() || null })
          .eq('id', editingId);
        if (error) throw error;
        toast({ title: 'Designation updated' });
      } else {
        const { error } = await (supabase as any)
          .from('designations')
          .insert({
            organization_id: organizationId,
            name: form.name.trim(),
            description: form.description.trim() || null,
          });
        if (error) throw error;
        toast({ title: 'Designation created' });
      }
      setModalOpen(false);
      await fetchDesignations();
    } catch (err: any) {
      const msg = err?.message?.includes('duplicate')
        ? 'A designation with this name already exists.'
        : 'Failed to save designation.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await (supabase as any)
      .from('designations')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to remove designation.', variant: 'destructive' });
    } else {
      toast({ title: 'Designation removed' });
      await fetchDesignations();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Designations</h3>
          <p className="text-sm text-muted-foreground">
            Manage job designations/titles used across your organization.
          </p>
        </div>
        <Button onClick={openCreate} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Designation
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Loading…
        </div>
      ) : designations.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg">
          <p className="text-sm text-muted-foreground">
            No designations configured yet. Add your first designation to get started.
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {designations.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{d.description || '—'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(d)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(d.id)}
                      >
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
            <DialogTitle>{editingId ? 'Edit Designation' : 'Add Designation'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="designation-name">Name *</Label>
              <Input
                id="designation-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Chief Financial Officer"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="designation-desc">Description</Label>
              <Input
                id="designation-desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Optional description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancel
            </Button>
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
