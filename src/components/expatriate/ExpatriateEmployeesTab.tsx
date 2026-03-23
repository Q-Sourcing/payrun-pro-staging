import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { TaxResidencyStatus } from "@/lib/types/expatriate-payroll";

interface ExpatriateEmployeesTabProps {
  projectId: string;
  onAssign: () => void;
}

function daysUntilPermitExpiry(expiryDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  return Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function permitBadge(permit: { expiry_date: string; status: string } | null) {
  if (!permit) return <Badge variant="outline" className="text-xs">No Permit</Badge>;
  const days = daysUntilPermitExpiry(permit.expiry_date);
  if (days < 0) return <Badge variant="destructive" className="text-xs">Expired</Badge>;
  if (days <= 30) return <Badge className="bg-red-100 text-red-800 border-red-200 text-xs">Expiring {days}d</Badge>;
  if (days <= 90) return <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs">Expiring {days}d</Badge>;
  return <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">Active</Badge>;
}

function residencyBadge(status: TaxResidencyStatus | null) {
  if (!status || status === "non_resident") return <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">Non-Resident</Badge>;
  if (status === "resident") return <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">Resident</Badge>;
  return <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs">Pending</Badge>;
}

export function ExpatriateEmployeesTab({ projectId, onAssign }: ExpatriateEmployeesTabProps) {
  const navigate = useNavigate();

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["project-employees-expat", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, first_name, last_name, email, status, pay_type, pay_group_id, employee_type, tax_residency_status, country_of_tax_residence, nationality")
        .eq("project_id", projectId)
        .eq("status", "active");
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  const { data: allPermits = [] } = useQuery({
    queryKey: ["work-permits-by-project", projectId],
    queryFn: async () => {
      if (!employees.length) return [];
      const ids = employees.map((e: any) => e.id);
      const { data, error } = await supabase
        .from("work_permits")
        .select("employee_id, expiry_date, status, permit_class")
        .in("employee_id", ids)
        .eq("status", "active")
        .order("expiry_date", { ascending: true });
      if (error) return [];
      return data || [];
    },
    enabled: employees.length > 0,
  });

  // Latest active permit per employee
  const latestPermitByEmployee = useMemo(() => {
    const map = new Map<string, any>();
    for (const permit of allPermits as any[]) {
      if (!map.has(permit.employee_id)) {
        map.set(permit.employee_id, permit);
      }
    }
    return map;
  }, [allPermits]);

  if (isLoading) return <div className="p-4 text-muted-foreground text-sm">Loading employees...</div>;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Expatriate Employees ({employees.length})</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => navigate(`/projects/${projectId}/onboard`)}>
              <UserPlus className="h-4 w-4 mr-1" /> Onboard New
            </Button>
            <Button size="sm" onClick={onAssign}>
              <UserPlus className="h-4 w-4 mr-1" /> Assign
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {employees.length === 0 ? (
          <p className="text-muted-foreground text-sm">No employees assigned to this project.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Nationality</th>
                  <th className="py-2 pr-4">Tax Residency</th>
                  <th className="py-2 pr-4">Work Permit</th>
                  <th className="py-2 pr-4">Pay Group</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp: any) => {
                  const permit = latestPermitByEmployee.get(emp.id) || null;
                  return (
                    <tr key={emp.id} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">
                        {[emp.first_name, emp.last_name].filter(Boolean).join(" ") || emp.email}
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground">
                        {emp.nationality || emp.country_of_tax_residence || "—"}
                      </td>
                      <td className="py-2 pr-4">
                        {residencyBadge(emp.tax_residency_status)}
                      </td>
                      <td className="py-2 pr-4">
                        {permitBadge(permit)}
                        {permit && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {permit.permit_class} · exp {permit.expiry_date}
                          </div>
                        )}
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground">{emp.pay_group_id || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
