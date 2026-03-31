// @ts-nocheck
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { AttendanceService } from "@/lib/services/attendance.service";
import { useAuth } from '@/lib/auth/AuthProvider';
import { Check, X, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import TableWrapper from "@/components/TableWrapper";

interface RegularizationPanelProps {
  organizationId: string;
  mode: "employee" | "admin";
  employeeId?: string;
}

const STATUS_BADGE: Record<string, { variant: any; class: string }> = {
  PENDING: { variant: "outline", class: "border-amber-500 text-amber-600" },
  APPROVED: { variant: "outline", class: "border-emerald-500 text-emerald-600" },
  REJECTED: { variant: "outline", class: "border-destructive text-destructive" },
  AUTO_APPROVED: { variant: "outline", class: "border-blue-500 text-blue-600" },
};

export function RegularizationPanel({ organizationId, mode, employeeId }: RegularizationPanelProps) {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionNotes, setActionNotes] = useState<Record<string, string>>({});
  const { session } = useAuth();

  useEffect(() => {
    loadRequests();
  }, [organizationId]);

  const loadRequests = async () => {
    try {
      const data = await AttendanceService.getRegularizationRequests(
        organizationId,
        mode === "admin" ? "PENDING" : undefined
      );
      const filtered = mode === "employee" && employeeId
        ? data?.filter((r: any) => r.employee_id === employeeId)
        : data;
      setRequests(filtered || []);
    } catch (err) {
      console.error("Error loading regularization requests:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: string, action: "approve" | "reject") => {
    try {
      const userId = session?.user?.id;
      if (!userId) return;

      if (action === "approve") {
        await AttendanceService.approveRegularization(id, userId, actionNotes[id]);
      } else {
        await AttendanceService.rejectRegularization(id, userId, actionNotes[id]);
      }
      toast({ title: `Request ${action}d` });
      await loadRequests();
    } catch (err: any) {
      toast({ title: "Action failed", description: err.message, variant: "destructive" });
    }
  };

  if (loading) {
    return <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-muted animate-pulse rounded" />)}</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Regularization Requests
        </CardTitle>
        <CardDescription>
          {mode === "admin" ? "Review and approve/reject attendance correction requests" : "Your attendance correction requests"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No regularization requests found.</p>
        ) : (
          <TableWrapper>
            <thead>
              <tr className="border-b border-border">
                {mode === "admin" && <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Employee</th>}
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Date</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Clock In</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Clock Out</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Reason</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                {mode === "admin" && <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => {
                const badge = STATUS_BADGE[req.status] || STATUS_BADGE.PENDING;
                return (
                  <tr key={req.id} className="border-b border-border/50">
                    {mode === "admin" && (
                      <td className="px-4 py-2.5 text-sm">
                        {req.employees?.first_name} {req.employees?.last_name}
                      </td>
                    )}
                    <td className="px-4 py-2.5 text-sm">{req.attendance_date}</td>
                    <td className="px-4 py-2.5 text-sm">{format(new Date(req.requested_clock_in), "HH:mm")}</td>
                    <td className="px-4 py-2.5 text-sm">{format(new Date(req.requested_clock_out), "HH:mm")}</td>
                    <td className="px-4 py-2.5 text-sm max-w-[200px] truncate">{req.reason}</td>
                    <td className="px-4 py-2.5">
                      <Badge variant={badge.variant} className={badge.class}>
                        {req.status}
                      </Badge>
                    </td>
                    {mode === "admin" && req.status === "PENDING" && (
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <Textarea
                            value={actionNotes[req.id] || ""}
                            onChange={(e) => setActionNotes(p => ({ ...p, [req.id]: e.target.value }))}
                            placeholder="Notes..."
                            className="h-8 min-h-[32px] text-xs w-32"
                          />
                          <Button size="sm" variant="outline" className="h-8" onClick={() => handleAction(req.id, "approve")}>
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline" className="h-8 text-destructive" onClick={() => handleAction(req.id, "reject")}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </TableWrapper>
        )}
      </CardContent>
    </Card>
  );
}
