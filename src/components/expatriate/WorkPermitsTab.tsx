import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from '@/lib/auth/OrgProvider';
import type { WorkPermit, WorkPermitFormData, WorkPermitClass, WorkPermitStatus } from "@/lib/types/expatriate-payroll";
import { WORK_PERMIT_CLASSES } from "@/lib/types/expatriate-payroll";

interface WorkPermitsTabProps {
  projectId: string;
}

function daysUntilExpiry(expiryDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  return Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function permitStatusBadge(permit: WorkPermit) {
  const days = daysUntilExpiry(permit.expiry_date);
  if (permit.status === 'cancelled') return <Badge variant="outline">Cancelled</Badge>;
  if (permit.status === 'renewal_pending') return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Renewal Pending</Badge>;
  if (days < 0) return <Badge variant="destructive">Expired</Badge>;
  if (days <= 30) return <Badge className="bg-red-100 text-red-800 border-red-200">Expiring in {days}d</Badge>;
  if (days <= 90) return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Expiring in {days}d</Badge>;
  return <Badge className="bg-green-100 text-green-800 border-green-200">Active · {days}d left</Badge>;
}

const emptyForm: WorkPermitFormData = {
  employee_id: "",
  permit_class: "G2",
  permit_number: "",
  issue_date: "",
  expiry_date: "",
  fee_paid_usd: "",
  status: "active",
  notes: "",
};

export function WorkPermitsTab({ projectId }: WorkPermitsTabProps) {
  const { organizationId } = useOrg();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<WorkPermit | null>(null);
  const [form, setForm] = useState<WorkPermitFormData>(emptyForm);

  // Load project employees (expatriates)
  const { data: employees = [] } = useQuery({
    queryKey: ["project-employees", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, first_name, last_name, email")
        .eq("project_id", projectId)
        .eq("status", "active");
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  // Load work permits for this project's employees
  const { data: permits = [], isLoading } = useQuery({
    queryKey: ["work-permits", projectId],
    queryFn: async () => {
      if (!employees.length) return [];
      const employeeIds = employees.map((e: any) => e.id);
      const { data, error } = await supabase
        .from("work_permits")
        .select("*, employee:employees(id, first_name, last_name, email)")
        .in("employee_id", employeeIds)
        .order("expiry_date", { ascending: true });
      if (error) throw error;
      return (data || []) as WorkPermit[];
    },
    enabled: employees.length > 0,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: WorkPermitFormData) => {
      const payload = {
        org_id: organizationId,
        employee_id: data.employee_id,
        permit_class: data.permit_class,
        permit_number: data.permit_number || null,
        issue_date: data.issue_date || null,
        expiry_date: data.expiry_date,
        fee_paid_usd: data.fee_paid_usd ? parseFloat(data.fee_paid_usd) : null,
        status: data.status,
        notes: data.notes || null,
      };
      if (editing) {
        const { error } = await supabase.from("work_permits").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("work_permits").insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["work-permits", projectId] });
      toast({ title: editing ? "Permit updated" : "Permit added" });
      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm);
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e?.message || "Failed to save permit", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("work_permits").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["work-permits", projectId] });
      toast({ title: "Permit deleted" });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e?.message || "Failed to delete permit", variant: "destructive" });
    },
  });

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (permit: WorkPermit) => {
    setEditing(permit);
    setForm({
      employee_id: permit.employee_id,
      permit_class: permit.permit_class,
      permit_number: permit.permit_number || "",
      issue_date: permit.issue_date || "",
      expiry_date: permit.expiry_date,
      fee_paid_usd: permit.fee_paid_usd != null ? String(permit.fee_paid_usd) : "",
      status: permit.status,
      notes: permit.notes || "",
    });
    setDialogOpen(true);
  };

  // Group permits by status urgency
  const expiring = permits.filter((p) => {
    const days = daysUntilExpiry(p.expiry_date);
    return p.status === "active" && days >= 0 && days <= 90;
  });
  const expired = permits.filter((p) => {
    const days = daysUntilExpiry(p.expiry_date);
    return p.status === "active" && days < 0;
  });
  const active = permits.filter((p) => {
    const days = daysUntilExpiry(p.expiry_date);
    return p.status === "active" && days > 90;
  });
  const other = permits.filter((p) => p.status !== "active");

  const employeeLabel = (id: string) => {
    const e = employees.find((emp: any) => emp.id === id);
    if (!e) return id.slice(0, 8);
    return [e.first_name, e.last_name].filter(Boolean).join(" ") || e.email;
  };

  if (isLoading) {
    return <div className="p-4 text-muted-foreground text-sm">Loading work permits...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center justify-between">
        <div className="flex gap-3 text-sm">
          {expired.length > 0 && (
            <span className="flex items-center gap-1 text-red-600">
              <AlertTriangle className="h-4 w-4" /> {expired.length} expired
            </span>
          )}
          {expiring.length > 0 && (
            <span className="flex items-center gap-1 text-amber-600">
              <Clock className="h-4 w-4" /> {expiring.length} expiring soon
            </span>
          )}
          {active.length > 0 && (
            <span className="flex items-center gap-1 text-green-600">
              <CheckCircle className="h-4 w-4" /> {active.length} active
            </span>
          )}
          {permits.length === 0 && (
            <span className="text-muted-foreground">No work permits recorded</span>
          )}
        </div>
        <Button size="sm" onClick={openAdd}>
          <Plus className="h-4 w-4 mr-1" /> Add Permit
        </Button>
      </div>

      {/* Permits table */}
      {permits.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="py-2 pr-4">Employee</th>
                    <th className="py-2 pr-4">Class</th>
                    <th className="py-2 pr-4">Permit No.</th>
                    <th className="py-2 pr-4">Issue Date</th>
                    <th className="py-2 pr-4">Expiry Date</th>
                    <th className="py-2 pr-4">Fee (USD)</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {[...expired, ...expiring, ...active, ...other].map((permit) => (
                    <tr key={permit.id} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">
                        {permit.employee
                          ? [permit.employee.first_name, permit.employee.last_name].filter(Boolean).join(" ") || permit.employee.email
                          : employeeLabel(permit.employee_id)}
                      </td>
                      <td className="py-2 pr-4">
                        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{permit.permit_class}</span>
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground">{permit.permit_number || "—"}</td>
                      <td className="py-2 pr-4 text-muted-foreground">{permit.issue_date || "—"}</td>
                      <td className="py-2 pr-4">{permit.expiry_date}</td>
                      <td className="py-2 pr-4 text-muted-foreground">
                        {permit.fee_paid_usd != null ? `$${Number(permit.fee_paid_usd).toLocaleString()}` : "—"}
                      </td>
                      <td className="py-2 pr-4">{permitStatusBadge(permit)}</td>
                      <td className="py-2 pr-2 flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(permit)}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete work permit?</AlertDialogTitle>
                              <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteMutation.mutate(permit.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Work Permit" : "Add Work Permit"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Employee *</Label>
              <Select value={form.employee_id} onValueChange={(v) => setForm({ ...form, employee_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>
                      {[e.first_name, e.last_name].filter(Boolean).join(" ") || e.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Permit Class *</Label>
                <Select value={form.permit_class} onValueChange={(v) => setForm({ ...form, permit_class: v as WorkPermitClass })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WORK_PERMIT_CLASSES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as WorkPermitStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="renewal_pending">Renewal Pending</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Permit Number</Label>
              <Input value={form.permit_number} onChange={(e) => setForm({ ...form, permit_number: e.target.value })} placeholder="e.g., UG/G2/2024/00123" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Issue Date</Label>
                <Input type="date" value={form.issue_date} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Expiry Date *</Label>
                <Input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Fee Paid (USD)</Label>
              <Input type="number" value={form.fee_paid_usd} onChange={(e) => setForm({ ...form, fee_paid_usd: e.target.value })} placeholder="e.g., 2500" />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Optional notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => saveMutation.mutate(form)}
              disabled={!form.employee_id || !form.expiry_date || saveMutation.isPending}
            >
              {saveMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
