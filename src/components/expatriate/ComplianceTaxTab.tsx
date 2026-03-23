import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Info, Edit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { TaxResidencyStatus } from "@/lib/types/expatriate-payroll";
import { URAExportButton } from "./URAExportButton";

interface ComplianceTaxTabProps {
  projectId: string;
  taxCountry?: string; // e.g. "Uganda"
}

const RESIDENCY_STATUS_LABELS: Record<TaxResidencyStatus, string> = {
  resident: "Resident",
  non_resident: "Non-Resident",
  pending: "Pending Review",
};

const RESIDENCY_STATUS_COLORS: Record<TaxResidencyStatus, string> = {
  resident: "bg-green-100 text-green-800 border-green-200",
  non_resident: "bg-blue-100 text-blue-800 border-blue-200",
  pending: "bg-amber-100 text-amber-800 border-amber-200",
};

const PAYE_DESCRIPTION: Record<TaxResidencyStatus, string> = {
  resident: "Progressive PAYE (0–40% brackets, same as local employees)",
  non_resident: "Flat 15% PAYE on gross (Uganda non-resident rate)",
  pending: "Awaiting residency determination — using non-resident rate (15%)",
};

const NSSF_DESCRIPTION: Record<TaxResidencyStatus, string> = {
  resident: "Standard: 5% employee + 10% employer",
  non_resident: "Exempt from employee NSSF — employer pays 10% special contribution",
  pending: "Using non-resident treatment — employer pays 10% special contribution",
};

export function ComplianceTaxTab({ projectId, taxCountry }: ComplianceTaxTabProps) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: processedPayRuns = [] } = useQuery({
    queryKey: ["project-processed-payruns", projectId],
    queryFn: async () => {
      // Find pay groups for this project's employees
      const { data: emps } = await supabase
        .from("employees")
        .select("pay_group_id")
        .eq("project_id", projectId)
        .not("pay_group_id", "is", null);
      const pgIds = [...new Set((emps || []).map((e: any) => e.pay_group_id).filter(Boolean))];
      if (!pgIds.length) return [];

      const { data: runs } = await supabase
        .from("pay_runs")
        .select("id, pay_period_start, pay_period_end, status")
        .in("pay_group_id", pgIds)
        .in("status", ["processed", "approved"])
        .order("pay_period_start", { ascending: false })
        .limit(12);
      return runs || [];
    },
    enabled: !!projectId,
  });
  const [editingEmployee, setEditingEmployee] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ tax_residency_status: "non_resident" as TaxResidencyStatus, days_in_country_current_year: "", country_of_tax_residence: "", uganda_entry_date: "", lst_exempt: false });

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["project-employees-compliance", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, first_name, last_name, email, tax_residency_status, days_in_country_current_year, country_of_tax_residence, uganda_entry_date, lst_exempt, employment_start_date")
        .eq("project_id", projectId)
        .eq("status", "active");
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  const { data: treaties = [] } = useQuery({
    queryKey: ["tax-treaties", taxCountry],
    queryFn: async () => {
      if (!taxCountry) return [];
      const { data, error } = await supabase
        .from("tax_treaties")
        .select("*")
        .or(`country_a.eq.${taxCountry},country_b.eq.${taxCountry}`);
      if (error) return [];
      return data || [];
    },
    enabled: !!taxCountry,
  });

  const treatyCountries = new Set(
    treaties.flatMap((t: any) => [t.country_a, t.country_b]).filter((c: string) => c !== taxCountry)
  );

  const updateResidencyMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { error } = await supabase.from("employees").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project-employees-compliance", projectId] });
      toast({ title: "Compliance info updated" });
      setEditingEmployee(null);
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e?.message, variant: "destructive" });
    },
  });

  const openEdit = (emp: any) => {
    setEditingEmployee(emp);
    setEditForm({
      tax_residency_status: emp.tax_residency_status || "non_resident",
      days_in_country_current_year: String(emp.days_in_country_current_year ?? ""),
      country_of_tax_residence: emp.country_of_tax_residence || "",
      uganda_entry_date: emp.uganda_entry_date || "",
      lst_exempt: emp.lst_exempt ?? false,
    });
  };

  const saveEdit = () => {
    if (!editingEmployee) return;
    updateResidencyMutation.mutate({
      id: editingEmployee.id,
      updates: {
        tax_residency_status: editForm.tax_residency_status,
        days_in_country_current_year: editForm.days_in_country_current_year ? parseInt(editForm.days_in_country_current_year) : 0,
        country_of_tax_residence: editForm.country_of_tax_residence || null,
        uganda_entry_date: editForm.uganda_entry_date || null,
        lst_exempt: editForm.lst_exempt,
      },
    });
  };

  const residentCount = employees.filter((e: any) => e.tax_residency_status === "resident").length;
  const nonResidentCount = employees.filter((e: any) => e.tax_residency_status !== "resident").length;

  if (isLoading) return <div className="p-4 text-muted-foreground text-sm">Loading compliance data...</div>;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Residency Status</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <div className="flex justify-between"><span>Non-Resident (15% flat PAYE)</span><Badge variant="outline">{nonResidentCount}</Badge></div>
            <div className="flex justify-between"><span>Resident (progressive PAYE)</span><Badge variant="outline">{residentCount}</Badge></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">NSSF Treatment</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p className="text-muted-foreground">Non-residents: employer pays 10% special contribution (no employee deduction)</p>
            <p className="text-muted-foreground mt-1">Residents: standard 5% + 10%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Tax Treaties ({taxCountry || "—"})</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {treatyCountries.size > 0
              ? <p>Treaties with: {Array.from(treatyCountries).join(", ")}</p>
              : <p>No treaty data loaded</p>}
            <p className="mt-1 text-xs">If an employee's home country has a treaty, double taxation relief may apply. Verify with tax advisor.</p>
          </CardContent>
        </Card>
      </div>

      {/* Employee compliance table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Employee Tax & Compliance Status</CardTitle>
        </CardHeader>
        <CardContent>
          {employees.length === 0 ? (
            <p className="text-muted-foreground text-sm">No active employees in this project.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="py-2 pr-4">Employee</th>
                    <th className="py-2 pr-4">Residency Status</th>
                    <th className="py-2 pr-4">PAYE Rate</th>
                    <th className="py-2 pr-4">NSSF</th>
                    <th className="py-2 pr-4">LST</th>
                    <th className="py-2 pr-4">Home Country</th>
                    <th className="py-2 pr-4">Treaty</th>
                    <th className="py-2 pr-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp: any) => {
                    const status: TaxResidencyStatus = emp.tax_residency_status || "non_resident";
                    const hasTreaty = emp.country_of_tax_residence && treatyCountries.has(emp.country_of_tax_residence);
                    return (
                      <tr key={emp.id} className="border-b last:border-0">
                        <td className="py-2 pr-4 font-medium">
                          {[emp.first_name, emp.last_name].filter(Boolean).join(" ") || emp.email}
                        </td>
                        <td className="py-2 pr-4">
                          <Badge className={RESIDENCY_STATUS_COLORS[status]}>
                            {RESIDENCY_STATUS_LABELS[status]}
                          </Badge>
                          {emp.days_in_country_current_year > 0 && (
                            <div className="text-xs text-muted-foreground mt-0.5">{emp.days_in_country_current_year} days this year</div>
                          )}
                        </td>
                        <td className="py-2 pr-4 text-xs text-muted-foreground">
                          {status === "resident" ? "Progressive" : "15% flat"}
                        </td>
                        <td className="py-2 pr-4 text-xs text-muted-foreground">
                          {status === "resident" ? "5% + 10%" : "Employer 10%"}
                        </td>
                        <td className="py-2 pr-4 text-xs text-muted-foreground">
                          {emp.lst_exempt ? <Badge variant="outline" className="text-xs">Exempt</Badge> : "4,000 UGX"}
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground">{emp.country_of_tax_residence || "—"}</td>
                        <td className="py-2 pr-4">
                          {hasTreaty ? (
                            <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-xs">
                              <Info className="h-3 w-3 mr-1" /> Treaty applies
                            </Badge>
                          ) : "—"}
                        </td>
                        <td className="py-2 pr-2">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(emp)}>
                            <Edit className="h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* URA P10 Export — Uganda only */}
      {(taxCountry === "Uganda" || taxCountry === "UG") && processedPayRuns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">URA P10 Monthly PAYE Returns</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Export monthly PAYE returns in URA P10 format. Due by the 15th of each following month.
            </p>
            <div className="space-y-2">
              {processedPayRuns.map((run: any) => (
                <div key={run.id} className="flex items-center justify-between border rounded px-3 py-2 text-sm">
                  <span>
                    {run.pay_period_start} — {run.pay_period_end}
                    <span className="ml-2 text-muted-foreground">({run.status})</span>
                  </span>
                  <URAExportButton
                    payRunId={run.id}
                    payRunStatus={run.status}
                    taxCountry="Uganda"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit residency dialog */}
      <Dialog open={!!editingEmployee} onOpenChange={(open) => { if (!open) setEditingEmployee(null); }}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>
              Edit Tax Compliance —{" "}
              {editingEmployee ? [editingEmployee.first_name, editingEmployee.last_name].filter(Boolean).join(" ") : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tax Residency Status</Label>
              <Select
                value={editForm.tax_residency_status}
                onValueChange={(v) => setEditForm({ ...editForm, tax_residency_status: v as TaxResidencyStatus })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="non_resident">Non-Resident (15% flat PAYE)</SelectItem>
                  <SelectItem value="resident">Resident (Progressive PAYE)</SelectItem>
                  <SelectItem value="pending">Pending Review</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {PAYE_DESCRIPTION[editForm.tax_residency_status]}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Days in Uganda (this year)</Label>
                <Input
                  type="number"
                  value={editForm.days_in_country_current_year}
                  onChange={(e) => setEditForm({ ...editForm, days_in_country_current_year: e.target.value })}
                  placeholder="e.g., 120"
                />
                <p className="text-xs text-muted-foreground">Resident threshold: 183 days</p>
              </div>
              <div className="space-y-2">
                <Label>Entry Date (Uganda)</Label>
                <Input
                  type="date"
                  value={editForm.uganda_entry_date}
                  onChange={(e) => setEditForm({ ...editForm, uganda_entry_date: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Home Country (for treaty check)</Label>
              <Input
                value={editForm.country_of_tax_residence}
                onChange={(e) => setEditForm({ ...editForm, country_of_tax_residence: e.target.value })}
                placeholder="e.g., United Kingdom, India"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="lst_exempt"
                checked={editForm.lst_exempt}
                onChange={(e) => setEditForm({ ...editForm, lst_exempt: e.target.checked })}
              />
              <Label htmlFor="lst_exempt">LST Exempt (diplomatic mission member)</Label>
            </div>
            <p className="text-xs text-muted-foreground">
              NSSF treatment: {NSSF_DESCRIPTION[editForm.tax_residency_status]}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingEmployee(null)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={updateResidencyMutation.isPending}>
              {updateResidencyMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
