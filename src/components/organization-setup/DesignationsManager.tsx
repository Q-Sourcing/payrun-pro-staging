import React, { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrg } from '@/lib/auth/OrgProvider';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Pencil, Trash2, Loader2, Upload, Download, FileText, MoreHorizontal, Search } from 'lucide-react';
import * as XLSX from 'xlsx';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [designations, setDesignations] = useState<Designation[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [bulkTextOpen, setBulkTextOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [bulkText, setBulkText] = useState('');
  const [search, setSearch] = useState('');
  const [importing, setImporting] = useState(false);

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

  useEffect(() => { fetchDesignations(); }, [fetchDesignations]);

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
          .insert({ organization_id: organizationId, name: form.name.trim(), description: form.description.trim() || null });
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

  // ── Bulk insert helper ──
  const bulkInsert = async (rows: { name: string; description?: string }[]) => {
    if (!organizationId) return 0;
    const existingNames = new Set(designations.map((d) => d.name.toLowerCase()));
    const unique = rows.filter((r) => r.name && !existingNames.has(r.name.toLowerCase()));
    if (unique.length === 0) return 0;

    const payload = unique.map((r) => ({
      organization_id: organizationId,
      name: r.name.trim(),
      description: r.description?.trim() || null,
    }));

    // Insert in batches of 50
    let inserted = 0;
    for (let i = 0; i < payload.length; i += 50) {
      const batch = payload.slice(i, i + 50);
      const { error } = await (supabase as any).from('designations').insert(batch);
      if (error) {
        toast({ title: 'Partial import error', description: error.message, variant: 'destructive' });
        break;
      }
      inserted += batch.length;
    }
    return inserted;
  };

  // ── Bulk Text Paste ──
  const handleBulkTextSubmit = async () => {
    if (!bulkText.trim()) return;
    setSaving(true);
    try {
      const lines = bulkText
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);

      const rows = lines.map((line) => {
        // Support "Name | Description" or "Name, Description" or just "Name"
        const sep = line.includes('|') ? '|' : line.includes('\t') ? '\t' : null;
        if (sep) {
          const [name, description] = line.split(sep).map((s) => s.trim());
          return { name, description };
        }
        return { name: line };
      });

      const count = await bulkInsert(rows);
      toast({ title: `${count} designation(s) added`, description: count === 0 ? 'All entries already exist or were empty.' : undefined });
      setBulkTextOpen(false);
      setBulkText('');
      await fetchDesignations();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // ── Import from XLSX / CSV ──
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' });

      const rows = json.map((row) => {
        // Try common column names
        const name = (row['Name'] || row['name'] || row['Designation'] || row['designation'] || row['Title'] || row['title'] || '').toString().trim();
        const description = (row['Description'] || row['description'] || row['Desc'] || row['desc'] || '').toString().trim();
        return { name, description };
      }).filter((r) => r.name);

      if (rows.length === 0) {
        toast({ title: 'No data found', description: 'The file must have a "Name" column.', variant: 'destructive' });
        return;
      }

      const count = await bulkInsert(rows);
      toast({ title: `${count} designation(s) imported`, description: `${rows.length} rows read, ${count} new entries added.` });
      await fetchDesignations();
    } catch (err: any) {
      toast({ title: 'Import failed', description: err.message, variant: 'destructive' });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ── Export to XLSX ──
  const handleExport = () => {
    if (designations.length === 0) {
      toast({ title: 'Nothing to export' });
      return;
    }
    const data = designations.map((d) => ({ Name: d.name, Description: d.description || '' }));
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [{ wch: 35 }, { wch: 50 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Designations');
    XLSX.writeFile(wb, 'designations_export.xlsx');
    toast({ title: 'Exported successfully' });
  };

  // ── Export CSV ──
  const handleExportCSV = () => {
    if (designations.length === 0) {
      toast({ title: 'Nothing to export' });
      return;
    }
    const data = designations.map((d) => ({ Name: d.name, Description: d.description || '' }));
    const ws = XLSX.utils.json_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'designations_export.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Exported successfully' });
  };

  const filtered = designations.filter((d) =>
    [d.name, d.description].some((v) => v?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={handleFileImport}
      />

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Designations</h3>
          <p className="text-sm text-muted-foreground">
            Manage job designations/titles used across your organization.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Bulk actions dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <MoreHorizontal className="h-4 w-4" />
                Bulk Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => setBulkTextOpen(true)} className="gap-2">
                <FileText className="h-4 w-4" />
                Bulk Add (Text)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()} className="gap-2" disabled={importing}>
                <Upload className="h-4 w-4" />
                Import from File
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExport} className="gap-2">
                <Download className="h-4 w-4" />
                Export as XLSX
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportCSV} className="gap-2">
                <Download className="h-4 w-4" />
                Export as CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button onClick={openCreate} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Designation
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search designations…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 h-9"
        />
      </div>

      {/* Import loading indicator */}
      {importing && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-4 py-2 rounded-lg">
          <Loader2 className="h-4 w-4 animate-spin" />
          Importing designations from file…
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg">
          <p className="text-sm text-muted-foreground">
            {search ? 'No designations match your search.' : 'No designations configured yet. Add your first designation to get started.'}
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
              {filtered.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{d.description || '—'}</TableCell>
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

      {/* Single Add/Edit Dialog */}
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
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim()} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingId ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Text Dialog */}
      <Dialog open={bulkTextOpen} onOpenChange={setBulkTextOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Bulk Add Designations</DialogTitle>
            <DialogDescription>
              Paste one designation per line. Optionally add a description separated by a pipe (|) or tab.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={`Chief Executive Officer\nChief Financial Officer | Finance leadership\nSenior Engineer\nProject Manager | Oversees project delivery`}
              rows={10}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              {bulkText.split('\n').filter((l) => l.trim()).length} designation(s) to add. Duplicates will be skipped.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkTextOpen(false)} disabled={saving}>Cancel</Button>
            <Button
              onClick={handleBulkTextSubmit}
              disabled={saving || !bulkText.trim()}
              className="gap-2"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Add All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
