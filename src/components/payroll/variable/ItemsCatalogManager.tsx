// @ts-nocheck
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, Package, Search, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CatalogItem {
  id: string;
  name: string;
  description: string | null;
  unit: string;
  unit_cost: number;
  category: string;
  is_active: boolean;
  project_id: string | null;
}

interface ItemsCatalogManagerProps {
  organizationId: string;
  projectId?: string;
  projectName?: string;
}

const CATEGORIES = [
  { value: "general", label: "General" },
  { value: "materials", label: "Materials" },
  { value: "tools", label: "Tools" },
  { value: "output", label: "Output / Production" },
  { value: "consumables", label: "Consumables" },
  { value: "services", label: "Services" },
];

const UNITS = ["unit", "kg", "bag", "litre", "metre", "hour", "day", "piece", "box", "tonne"];

export function ItemsCatalogManager({ organizationId, projectId, projectName }: ItemsCatalogManagerProps) {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<CatalogItem | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [form, setForm] = useState({
    name: "", description: "", unit: "unit", unit_cost: "", category: "general",
  });

  useEffect(() => { fetchItems(); }, [organizationId, projectId]);

  const fetchItems = async () => {
    setLoading(true);
    let query = supabase
      .from("items_catalog")
      .select("*")
      .eq("organization_id", organizationId)
      .order("category").order("name");

    if (projectId) query = query.or(`project_id.eq.${projectId},project_id.is.null`);

    const { data, error } = await query;
    if (!error) setItems(data || []);
    setLoading(false);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", description: "", unit: "unit", unit_cost: "", category: "general" });
    setDialogOpen(true);
  };

  const openEdit = (item: CatalogItem) => {
    setEditing(item);
    setForm({
      name: item.name,
      description: item.description || "",
      unit: item.unit,
      unit_cost: String(item.unit_cost),
      category: item.category,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.unit_cost) {
      toast({ title: "Validation Error", description: "Name and unit cost are required.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      organization_id: organizationId,
      project_id: projectId || null,
      name: form.name.trim(),
      description: form.description.trim() || null,
      unit: form.unit,
      unit_cost: parseFloat(form.unit_cost),
      category: form.category,
    };

    const { error } = editing
      ? await supabase.from("items_catalog").update(payload).eq("id", editing.id)
      : await supabase.from("items_catalog").insert(payload);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editing ? "Item updated" : "Item created", description: `"${form.name}" saved to catalog.` });
      setDialogOpen(false);
      fetchItems();
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("items_catalog").delete().eq("id", deleteId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Deleted", description: "Item removed from catalog." });
      fetchItems();
    }
    setDeleteId(null);
  };

  const toggleActive = async (item: CatalogItem) => {
    await supabase.from("items_catalog").update({ is_active: !item.is_active }).eq("id", item.id);
    fetchItems();
  };

  const filtered = items.filter(i => {
    const matchSearch = i.name.toLowerCase().includes(search.toLowerCase()) ||
      (i.description || "").toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCategory === "all" || i.category === filterCategory;
    return matchSearch && matchCat;
  });

  const byCategory = CATEGORIES.reduce((acc, cat) => {
    const catItems = filtered.filter(i => i.category === cat.value);
    if (catItems.length) acc[cat.value] = { label: cat.label, items: catItems };
    return acc;
  }, {} as Record<string, { label: string; items: CatalogItem[] }>);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-base flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            Items Catalog
            {projectName && <Badge variant="outline" className="text-xs">{projectName}</Badge>}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pre-define work items, materials & output with unit costs for automatic pay calculation
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" /> Add Item
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-40 h-8 text-sm">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">Loading catalog…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No items yet</p>
          <p className="text-xs mt-1">Add items that workers can log for piece-rate pay</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(byCategory).map(([cat, { label, items: catItems }]) => (
            <Card key={cat} className="overflow-hidden">
              <div className="bg-muted/40 px-4 py-2 flex items-center gap-2 border-b">
                <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
                <Badge variant="secondary" className="text-xs ml-auto">{catItems.length}</Badge>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-20">Unit</TableHead>
                    <TableHead className="w-28 text-right">Unit Cost</TableHead>
                    <TableHead className="w-20">Status</TableHead>
                    <TableHead className="w-20 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {catItems.map(item => (
                    <TableRow key={item.id} className={!item.is_active ? "opacity-50" : ""}>
                      <TableCell className="font-medium text-sm">{item.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{item.description || "—"}</TableCell>
                      <TableCell className="text-xs">{item.unit}</TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold">
                        {item.unit_cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => toggleActive(item)}
                          className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${item.is_active
                            ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400"
                            : "bg-muted text-muted-foreground border-border"
                          }`}
                        >
                          {item.is_active ? "Active" : "Inactive"}
                        </button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(item.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Catalog Item" : "Add Catalog Item"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Item Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Harvested Bags" />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="Optional description" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Unit *</Label>
                <Select value={form.unit} onValueChange={v => setForm(f => ({ ...f, unit: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Unit Cost *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.unit_cost}
                  onChange={e => setForm(f => ({ ...f, unit_cost: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save Item"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove the item from the catalog. Existing work logs will retain the item name as a snapshot.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
