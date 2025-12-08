import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useOrg } from "@/lib/tenant/OrgContext";
import { ProjectsService } from "@/lib/services/projects.service";
import { EmployeesService } from "@/lib/data/employees.service";
import { PayGroupsService } from "@/lib/services/paygroups.service";
import { formatProjectType } from "@/lib/types/projects";
import { Button } from "@/components/ui/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import AddProjectEmployeesDialog from "./AddProjectEmployeesDialog";

export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const { organizationId } = useOrg();
  const qc = useQueryClient();
  const [showAssignDialog, setShowAssignDialog] = useState(false);

  const { data: project, isLoading: loadingProject } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => ProjectsService.getProject(projectId as string),
    enabled: !!projectId,
  });

  const { data: employees = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ["project-employees", projectId],
    queryFn: () => EmployeesService.getEmployeesByProject(projectId as string),
    enabled: !!projectId,
  });

  const { data: payGroups = [], isLoading: loadingPayGroups } = useQuery({
    queryKey: ["project-paygroups", projectId],
    queryFn: () => PayGroupsService.getPayGroupsByProject(projectId as string, organizationId || undefined),
    enabled: !!projectId,
  });

  const removeMutation = useMutation({
    mutationFn: (employeeId: string) => EmployeesService.removeFromProject(employeeId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project", projectId] });
      qc.invalidateQueries({ queryKey: ["project-employees", projectId] });
      qc.invalidateQueries({ queryKey: ["employees"] });
    }
  });

  const loading = loadingProject || loadingEmployees || loadingPayGroups;
  const totalEmployees = employees.length;
  const byEmployeeType = useMemo(() => {
    const map: Record<string, number> = {};
    employees.forEach((e: any) => { map[e.employee_type || "unknown"] = (map[e.employee_type || "unknown"] || 0) + 1; });
    return map;
  }, [employees]);
  const byPayType = useMemo(() => {
    const map: Record<string, number> = {};
    employees.forEach((e: any) => { const k = e.pay_type || "unknown"; map[k] = (map[k] || 0) + 1; });
    return map;
  }, [employees]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
      </div>
    );
  }

  if (!project) {
    return <div className="p-6 text-muted-foreground">Project not found.</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{project.name}</h1>
        <p className="text-sm text-muted-foreground font-mono">{project.code}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Project Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <Label className="text-xs text-muted-foreground">Project (Employee) Type</Label>
              <div>{formatProjectType(project.project_type || '')}{project.project_type === 'manpower' && project.project_subtype ? ` • ${project.project_subtype}` : ''}</div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Status</Label>
              <div>
                <Badge variant="secondary">{project.status}</Badge>
              </div>
            </div>
            {project.description && (
              <div>
                <Label className="text-xs text-muted-foreground">Description</Label>
                <div className="text-muted-foreground">{project.description}</div>
              </div>
            )}
            <div>
              <Label className="text-xs text-muted-foreground">Employees</Label>
              <div className="text-foreground font-medium">{totalEmployees}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Allowed Pay Types</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="text-muted-foreground">
              {project.supports_all_pay_types
                ? "All pay types supported for this project type"
                : (project.allowed_pay_types || []).length
                ? project.allowed_pay_types.map((pt: string) => <Badge key={pt} className="mr-1">{pt.replace('_', ' ')}</Badge>)
                : "No specific pay types configured"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Linked Pay Groups</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {payGroups.length === 0 ? (
              <div className="text-muted-foreground">No pay groups linked to this project.</div>
            ) : (
              <ul className="list-disc pl-5">
                {payGroups.map(pg => (
                  <li key={pg.id}>
                    {pg.name} <span className="text-muted-foreground">({pg.employee_type}{pg.pay_type ? ` • ${pg.pay_type}` : ''}{pg.pay_frequency ? ` • ${pg.pay_frequency}` : ''})</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between flex-row">
          <CardTitle className="text-base">Project Metrics</CardTitle>
          <div className="text-xs text-muted-foreground">Breakdown</div>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <Label className="text-xs text-muted-foreground">By Employee Type</Label>
            <div className="flex gap-2 flex-wrap mt-1">
              {Object.entries(byEmployeeType).map(([k, v]) => (
                <Badge key={k} variant="outline">{k}: {v}</Badge>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">By Pay Type</Label>
            <div className="flex gap-2 flex-wrap mt-1">
              {Object.entries(byPayType).map(([k, v]) => (
                <Badge key={k} variant="outline">{k}: {v}</Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Assigned Employees</CardTitle>
            <Button size="sm" onClick={() => setShowAssignDialog(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add Employees to Project
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {employees.length === 0 ? (
            <div className="text-muted-foreground">No employees assigned to this project.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 pr-4">Employee Type</th>
                    <th className="py-2 pr-4">Pay Type</th>
                    <th className="py-2 pr-4">Pay Group</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((e: any) => (
                    <tr key={e.id} className="border-t">
                      <td className="py-2 pr-4">{[e.first_name, e.middle_name, e.last_name].filter(Boolean).join(' ')}</td>
                      <td className="py-2 pr-4">{e.employee_type}</td>
                      <td className="py-2 pr-4">{(e as any).pay_type || '-'}</td>
                      <td className="py-2 pr-4">{(e as any).pay_group_id ? (e as any).pay_group_id : '-'}</td>
                      <td className="py-2 pr-4">{(e as any).status || '-'}</td>
                      <td className="py-2 pr-4 text-right">
                        <Button variant="ghost" size="sm" onClick={() => removeMutation.mutate(e.id)} title="Remove from project">
                          <X className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <AddProjectEmployeesDialog
        project={project}
        open={showAssignDialog}
        onOpenChange={setShowAssignDialog}
        onAssigned={() => {
          qc.invalidateQueries({ queryKey: ["project", projectId] });
          qc.invalidateQueries({ queryKey: ["project-employees", projectId] });
          qc.invalidateQueries({ queryKey: ["employees"] });
        }}
      />
    </div>
  );
}


