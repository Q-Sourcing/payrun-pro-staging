// @ts-nocheck
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/lib/tenant/OrgContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Clock, AlertTriangle, CheckCircle2, User } from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { useNavigate } from "react-router-dom";

interface ProbationEmployee {
  id: string;
  first_name: string;
  last_name: string;
  employee_number: string;
  email: string;
  probation_end_date: string;
  probation_status: string;
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  extended: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

export default function ProbationDashboard() {
  const { organizationId } = useOrg();
  const [employees, setEmployees] = useState<ProbationEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!organizationId) return;
    (async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, first_name, last_name, employee_number, email, probation_end_date, probation_status")
        .eq("organization_id", organizationId)
        .not("probation_end_date", "is", null)
        .neq("probation_status", "not_applicable")
        .order("probation_end_date");
      if (!error) setEmployees(data ?? []);
      setLoading(false);
    })();
  }, [organizationId]);

  const urgent = employees.filter((e) => {
    if (!e.probation_end_date || e.probation_status !== "active") return false;
    const days = differenceInDays(parseISO(e.probation_end_date), new Date());
    return days <= 7;
  });
  const upcoming = employees.filter((e) => {
    if (!e.probation_end_date || e.probation_status !== "active") return false;
    const days = differenceInDays(parseISO(e.probation_end_date), new Date());
    return days > 7 && days <= 30;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Probation Tracker</h1>
        <p className="text-muted-foreground text-sm">Monitor employee probation periods and schedule reviews</p>
      </div>

      {/* Urgent alerts */}
      {urgent.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{urgent.length} employee(s)</strong> have probation ending within 7 days — review required.
          </AlertDescription>
        </Alert>
      )}
      {upcoming.length > 0 && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            <strong>{upcoming.length} employee(s)</strong> have probation ending within 30 days.
          </AlertDescription>
        </Alert>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Active", color: "text-blue-600", filter: (e: ProbationEmployee) => e.probation_status === "active" },
          { label: "Urgent (≤7d)", color: "text-red-600", filter: (e: ProbationEmployee) => urgent.includes(e) },
          { label: "Completed", color: "text-green-600", filter: (e: ProbationEmployee) => e.probation_status === "completed" },
          { label: "Extended", color: "text-amber-600", filter: (e: ProbationEmployee) => e.probation_status === "extended" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-3 text-center">
              <p className={`text-3xl font-bold ${s.color}`}>{employees.filter(s.filter).length}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" /> All Probation Records
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Loading...</p>
          ) : employees.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">No probation records found.</p>
              <p className="text-xs text-muted-foreground mt-1">Set probation end dates on employee profiles.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Number</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Days Remaining</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((e) => {
                  const daysLeft = differenceInDays(parseISO(e.probation_end_date), new Date());
                  const isOverdue = daysLeft < 0 && e.probation_status === "active";
                  return (
                    <TableRow key={e.id} className={isOverdue ? "bg-red-50 dark:bg-red-950/20" : ""}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{e.first_name} {e.last_name}</p>
                          <p className="text-xs text-muted-foreground">{e.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{e.employee_number}</TableCell>
                      <TableCell>{format(parseISO(e.probation_end_date), "MMM d, yyyy")}</TableCell>
                      <TableCell>
                        {e.probation_status !== "active" ? (
                          <span className="text-muted-foreground">—</span>
                        ) : isOverdue ? (
                          <span className="text-red-600 font-medium">{Math.abs(daysLeft)}d overdue</span>
                        ) : (
                          <span className={daysLeft <= 7 ? "text-red-600 font-medium" : daysLeft <= 30 ? "text-amber-600 font-medium" : "text-foreground"}>
                            {daysLeft}d
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[e.probation_status] || "bg-muted text-muted-foreground"}>
                          {e.probation_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/employees/${e.id}`)}>
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
