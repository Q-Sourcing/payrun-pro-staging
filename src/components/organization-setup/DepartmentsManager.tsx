import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrg } from '@/lib/tenant/OrgContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

interface Department {
  id: string;
  name: string;
  description: string | null;
  parent_department_id: string | null;
  is_active: boolean;
}

const emptyForm = { name: '', description: '', parent_department_id: '' };

export const DepartmentsManager: React.FC = () => {
  const { organizationId } = useOrg();
  const { toast } = useToast();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');

  const fetchDepartments = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('org_departments')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('name');

    if (error) {
      toast({ title: 'Error', description: 'Failed to load departments.', variant: 'destructive' });
    } else {
      setDepartments(data ?? []);
    }
    setLoading(false);
  }, [organizationId, toast]);

  useEffect(() => { fetchDepartments(); }, [fetchDepartments]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (d: Department) => {
    setEditingId(d.id);
    setForm({
      name: d.name,
      description: d.description || '',
      parent_department_id: d.parent_department_id || '',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!organizationId || !form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        parent_department_id: form.parent_department_id || null,
      };
      if (editingId) {
        const { error } = await (supabase as any).from('org_departments').update(payload).eq('id', editingId);
        if (error) throw error;
        toast({ title: 'Department updated' });
      } else {
        const { error } = await (supabase as any).from('org_departments').insert({ ...payload, organization_id: organizationId });
        if (error) throw error;
        toast({ title: 'Department created' });
      }
      setModalOpen(false);
      await fetchDepartments();
    } catch (err: any) {
      const msg = err?.message?.includes('duplicate')
        ? 'A department with this name already exists.'
        : 'Failed to save department.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await (supabase as any).from('org_departments').update({ is_active: false }).eq('id', id);
    if (error) {
      toast({ title: 'Error', description: 'Failed to remove department.', variant: 'destructive' });
    } else {
      toast({ title: 'Department removed' });
      await fetchDepartments();
    }
  };

  const getParentName = (id: string | null) => {
    if (!id) return '—';
    return departments.find((d) => d.id === id)?.name || '—';
  };

  const filtered = departments.filter((d) =>
    [d.name, d.description].some((v) => v?.toLowerCase().includes(search.toLowerCase()))
  );

  // For the parent dropdown, exclude the currently editing department to prevent self-reference
  const parentOptions = departments.filter((d) => d.id !== editingId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Departments</h3>
          <p className="text-sm text-muted-foreground">Manage organizational departments and hierarchy.</p>
        </div>
        <Button onClick={openCreate} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Department
        </Button>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search departments…"
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
            {search ? 'No departments match your search.' : 'No departments configured yet. Add your first department to get started.'}
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Parent Department</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{d.description || '—'}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{getParentName(d.parent_department_id)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(d)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(d.id)}>
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
            <DialogTitle>{editingId ? 'Edit Department' : 'Add Department'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="dept-name">Name *</Label>
              <Input id="dept-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Finance" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dept-desc">Description</Label>
              <Input id="dept-desc" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Optional description" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dept-parent">Parent Department</Label>
              <Select
                value={form.parent_department_id || '__none'}
                onValueChange={(val) => setForm((f) => ({ ...f, parent_department_id: val === '__none' ? '' : val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select parent department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">— None (Top Level) —</SelectItem>
                  {parentOptions.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
