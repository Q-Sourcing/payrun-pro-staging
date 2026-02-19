// @ts-nocheck
import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOrg } from "@/lib/tenant/OrgContext";
import { ProjectsService } from "@/lib/services/projects.service";
import { EmployeesService } from "@/lib/data/employees.service";
import { PayGroupsService } from "@/lib/services/paygroups.service";
import { formatProjectType } from "@/lib/types/projects";
import { Button } from "@/components/ui/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X, UserPlus, MapPin, Building2, DollarSign } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import AddProjectEmployeesDialog from "./AddProjectEmployeesDialog";
import { IppmsWorkTab } from "../ippms/IppmsWorkTab";
import ProjectOnboardingChecklist from "./ProjectOnboardingChecklist";

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

  const isIppms = project.project_type === "ippms";

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <p className="text-sm text-muted-foreground font-mono">{project.code}</p>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <Badge variant="secondary">{project.status}</Badge>
            {project.project_type && (
              <Badge>{formatProjectType(project.project_type)}{project.project_subtype ? ` • ${project.project_subtype}` : ""}</Badge>
            )}
            {project.client_name && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Building2 className="h-3 w-3" /> {project.client_name}
              </span>
            )}
            {project.location && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" /> {project.location}
              </span>
            )}
            {project.contract_value != null && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <DollarSign className="h-3 w-3" /> {Number(project.contract_value).toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Onboarding Checklist */}
      <Card>
        <CardContent className="pt-5">
          <ProjectOnboardingChecklist projectId={projectId as string} />
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="employees">Employees ({totalEmployees})</TabsTrigger>
          <TabsTrigger value="paygroups">Pay Groups ({payGroups.length})</TabsTrigger>
          {isIppms && <TabsTrigger value="workboard">Workboard</TabsTrigger>}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader><CardTitle className="text-base">Project Information</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <Label className="text-xs text-muted-foreground">Project (Employee) Type</Label>
                  <div>{formatProjectType(project.project_type || "")}{project.project_type === "manpower" && project.project_subtype ? ` • ${project.project_subtype}` : ""}</div>
                </div>
                {project.description && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Description</Label>
                    <div className="text-muted-foreground">{project.description}</div>
                  </div>
                )}
                {project.client_name && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Client</Label>
                    <div>{project.client_name}</div>
                  </div>
                )}
                {project.location && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Location</Label>
                    <div>{project.location}</div>
                  </div>
                )}
                {project.contract_value != null && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Contract Value</Label>
                    <div>{Number(project.contract_value).toLocaleString()}</div>
                  </div>
                )}
                <div>
                  <Label className="text-xs text-muted-foreground">Employees</Label>
                  <div className="font-medium">{totalEmployees}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Allowed Pay Types</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="text-muted-foreground">
                  {project.supports_all_pay_types
                    ? "All pay types supported for this project type"
                    : (project.allowed_pay_types || []).length
                      ? project.allowed_pay_types.map((pt: string) => <Badge key={pt} className="mr-1">{pt.replace("_", " ")}</Badge>)
                      : "No specific pay types configured"}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Metrics</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
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
          </div>
        </TabsContent>

        {/* Employees Tab */}
        <TabsContent value="employees" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Assigned Employees</CardTitle>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="sm" onClick={() => setShowAssignDialog(true)}>
                        <UserPlus className="h-4 w-4 mr-1" /> Assign
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Add Employees to Project</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </CardHeader>
            <CardContent className="text-sm">
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
                          <td className="py-2 pr-4">{[e.first_name, e.middle_name, e.last_name].filter(Boolean).join(" ")}</td>
                          <td className="py-2 pr-4">{e.employee_type}</td>
                          <td className="py-2 pr-4">{e.pay_type || "-"}</td>
                          <td className="py-2 pr-4">{e.pay_group_id || "-"}</td>
                          <td className="py-2 pr-4">{e.status || "-"}</td>
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
        </TabsContent>

        {/* Pay Groups Tab */}
        <TabsContent value="paygroups" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Linked Pay Groups</CardTitle></CardHeader>
            <CardContent className="text-sm">
              {payGroups.length === 0 ? (
                <div className="text-muted-foreground">No pay groups linked to this project.</div>
              ) : (
                <ul className="list-disc pl-5 space-y-1">
                  {payGroups.map((pg: any) => (
                    <li key={pg.id}>
                      {pg.name} <span className="text-muted-foreground">({pg.employee_type}{pg.pay_type ? ` • ${pg.pay_type}` : ""}{pg.pay_frequency ? ` • ${pg.pay_frequency}` : ""})</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Workboard Tab (IPPMS only) */}
        {isIppms && (
          <TabsContent value="workboard" className="mt-4">
            <IppmsWorkTab projectId={projectId as string} />
          </TabsContent>
        )}
      </Tabs>

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
