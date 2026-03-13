// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
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
import { X, UserPlus, MapPin, Building2, DollarSign, Pencil, Save, AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import AddProjectEmployeesDialog from "./AddProjectEmployeesDialog";
import { ProjectEhsTab } from "../ehs/ProjectEhsTab";
import { IppmsWorkTab } from "../ippms/IppmsWorkTab";
import { IppmsWorkboardEnhanced } from "../ippms/IppmsWorkboardEnhanced";
import ProjectOnboardingChecklist from "./ProjectOnboardingChecklist";
import { VariablePayrollPage } from "@/components/payroll/variable/VariablePayrollPage";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ALL_COUNTRIES, CURRENCIES } from "@/lib/constants/countries";

export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { organizationId } = useOrg();
  const qc = useQueryClient();
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const { toast } = useToast();

  const [editMode, setEditMode] = useState(false);
  const [managerOptions, setManagerOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [editManagerId, setEditManagerId] = useState<string>("");
  const [editStartDate, setEditStartDate] = useState<string>("");
  const [editEndDate, setEditEndDate] = useState<string>("");
  const [editDescription, setEditDescription] = useState<string>("");
  const [editCountry, setEditCountry] = useState<string>("");
  const [editCurrency, setEditCurrency] = useState<string>("");

  const { data: project, isLoading: loadingProject } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => ProjectsService.getProject(projectId as string),
    enabled: !!projectId,
  });

  const { data: onboardingProgress } = useQuery({
    queryKey: ["project-onboarding-progress", projectId],
    queryFn: () => ProjectsService.getProjectOnboardingProgress(projectId as string),
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

  const updateProjectMutation = useMutation({
    mutationFn: (updates: any) => ProjectsService.updateProject(projectId as string, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project", projectId] });
      qc.invalidateQueries({ queryKey: ["project-onboarding-progress", projectId] });
      toast({ title: "Project updated" });
    },
    onError: (e: any) => {
      toast({ title: "Update failed", description: e?.message || "Failed to update project", variant: "destructive" });
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

  const payTypeMismatches = useMemo(() => {
    if (!project) return [];
    if (project.supports_all_pay_types) return [];
    const allowed = Array.isArray(project.allowed_pay_types) ? project.allowed_pay_types : [];
    if (allowed.length === 0) return [];
    return (employees || []).filter((e: any) => !e.pay_type || !allowed.includes(e.pay_type));
  }, [employees, project]);

  const isIppms = project?.project_type === "ippms";
  const progressPercent = onboardingProgress?.totalSteps
    ? Math.round((onboardingProgress.completedSteps / onboardingProgress.totalSteps) * 100)
    : 0;
  const isFullyOnboarded = onboardingProgress?.isFullyOnboarded === true;

  useEffect(() => {
    const requestedTab = searchParams.get("tab");
    if (!requestedTab) return;
    const allowedTabs = isIppms
      ? ["overview", "employees", "paygroups", "workboard", "ehs"]
      : ["overview", "employees", "paygroups", "ehs"];
    if (allowedTabs.includes(requestedTab) && requestedTab !== activeTab) {
      setActiveTab(requestedTab);
    }
  }, [searchParams, isIppms, activeTab]);

  useEffect(() => {
    if (searchParams.get("assign") !== "1") return;
    setShowAssignDialog(true);
    const next = new URLSearchParams(searchParams);
    next.delete("assign");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  // Keep edit fields in sync when project loads or edit mode resets.
  useEffect(() => {
    if (!project) return;
    if (!editMode) {
      setEditManagerId(project.responsible_manager_id || "");
      setEditStartDate(project.start_date || "");
      setEditEndDate(project.end_date || "");
      setEditDescription(project.description || "");
      setEditCountry(project.country || "");
      setEditCurrency(project.currency || "");
    }
  }, [project, editMode]);

  // Load eligible managers for the org (ORG_PROJECT_MANAGER, ORG_ADMIN, ORG_OWNER).
  useEffect(() => {
    const loadManagers = async () => {
      if (!organizationId) return;
      try {
        const keys = ["ORG_PROJECT_MANAGER", "ORG_ADMIN", "ORG_OWNER"];
        const { data: roleRows, error: roleErr } = await supabase
          .from("org_roles")
          .select("id")
          .eq("org_id", organizationId)
          .in("key", keys as any);
        if (roleErr) throw roleErr;
        const roleIds = (roleRows || []).map((r: any) => r.id);
        if (roleIds.length === 0) {
          setManagerOptions([]);
          return;
        }

        const { data: our, error: ourErr } = await supabase
          .from("org_user_roles")
          .select("org_user_id, role_id")
          .in("role_id", roleIds as any);
        if (ourErr) throw ourErr;
        const orgUserIds = Array.from(new Set((our || []).map((x: any) => x.org_user_id)));
        if (orgUserIds.length === 0) {
          setManagerOptions([]);
          return;
        }

        const { data: orgUsers, error: ouErr } = await supabase
          .from("org_users")
          .select("id, user_id, status")
          .eq("org_id", organizationId)
          .in("id", orgUserIds as any);
        if (ouErr) throw ouErr;
        const userIds = Array.from(new Set((orgUsers || []).filter((ou: any) => ou.status === "active").map((ou: any) => ou.user_id)));
        if (userIds.length === 0) {
          setManagerOptions([]);
          return;
        }

        const { data: profiles, error: pErr } = await supabase
          .from("user_profiles")
          .select("id, email, first_name, last_name")
          .in("id", userIds as any);
        if (pErr) throw pErr;

        const opts = (profiles || [])
          .map((p: any) => {
            const name = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
            const label = name ? `${name} (${p.email || ""})` : (p.email || p.id);
            return { value: p.id, label };
          })
          .sort((a: any, b: any) => a.label.localeCompare(b.label));

        setManagerOptions(opts);
      } catch (e) {
        console.error("Failed to load managers:", e);
        setManagerOptions([]);
      }
    };
    void loadManagers();
  }, [organizationId]);

  const handleSave = async () => {
    await updateProjectMutation.mutateAsync({
      responsible_manager_id: editManagerId || null,
      start_date: editStartDate || null,
      end_date: editEndDate || null,
      description: editDescription || null,
      country: editCountry || null,
      currency: editCurrency || null,
    });
    setEditMode(false);
  };

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

  const isManpower = project.project_type === "manpower";
  const hasVariablePay = isIppms || isManpower;
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
            {onboardingProgress?.totalSteps ? (
              <Badge variant={isFullyOnboarded ? "default" : "outline"}>
                {isFullyOnboarded ? "Fully Onboarded" : `Onboarding ${progressPercent}%`}
              </Badge>
            ) : null}
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
          {onboardingProgress?.totalSteps ? (
            <div className="mt-3 max-w-md">
              <Progress value={progressPercent} className="h-2" />
              <div className="mt-1 text-xs text-muted-foreground">
                {onboardingProgress.completedSteps}/{onboardingProgress.totalSteps} onboarding steps completed
              </div>
            </div>
          ) : null}
        </div>
        <div className="flex gap-2">
          {editMode ? (
            <>
              <Button variant="outline" onClick={() => setEditMode(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={updateProjectMutation.isPending}>
                <Save className="h-4 w-4 mr-1" /> {updateProjectMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setEditMode(true)}>
              <Pencil className="h-4 w-4 mr-1" /> Edit
            </Button>
          )}
        </div>
      </div>

      {/* Onboarding Checklist */}
      <Card>
        <CardContent className="pt-5">
          <ProjectOnboardingChecklist projectId={projectId as string} />
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="employees">Employees ({totalEmployees})</TabsTrigger>
          <TabsTrigger value="paygroups">Pay Groups ({payGroups.length})</TabsTrigger>
          {isIppms && <TabsTrigger value="workboard">IPPMS Workboard</TabsTrigger>}
          {hasVariablePay && <TabsTrigger value="variable-payroll">⚡ Variable Pay</TabsTrigger>}
          <TabsTrigger value="ehs">🛡️ EHS</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader><CardTitle className="text-base">Project Information</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <Label className="text-xs text-muted-foreground">Responsible Manager</Label>
                  {editMode ? (
                    <div className="mt-1">
                      <SearchableSelect
                        options={[{ value: "", label: "Unassigned" }, ...managerOptions]}
                        value={String(editManagerId || "")}
                        onValueChange={(value) => setEditManagerId(value)}
                        placeholder="Select manager..."
                        searchPlaceholder="Search users..."
                        emptyMessage="No users found"
                      />
                    </div>
                  ) : (
                    <div className="text-muted-foreground">
                      {project.responsible_manager_id
                        ? (managerOptions.find((m) => m.value === project.responsible_manager_id)?.label || project.responsible_manager_id)
                        : "—"}
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Project (Employee) Type</Label>
                  <div>{formatProjectType(project.project_type || "")}{project.project_type === "manpower" && project.project_subtype ? ` • ${project.project_subtype}` : ""}</div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Description</Label>
                  {editMode ? (
                    <Textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={3}
                      placeholder="Optional project description"
                    />
                  ) : (
                    <div className="text-muted-foreground">{project.description || "—"}</div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Country</Label>
                    {editMode ? (
                      <SearchableSelect
                        options={[{ value: "", label: "—" }, ...ALL_COUNTRIES.map((c) => ({ value: c.code, label: `${c.name} (${c.code})` }))]}
                        value={String(editCountry || "")}
                        onValueChange={(value) => {
                          const selected = ALL_COUNTRIES.find((c) => c.code === value);
                          setEditCountry(value);
                          if (!editCurrency && selected?.currency) setEditCurrency(selected.currency);
                        }}
                        placeholder="Select country..."
                        searchPlaceholder="Search countries..."
                        emptyMessage="No countries found"
                      />
                    ) : (
                      <div className="text-muted-foreground">
                        {project.country ? (ALL_COUNTRIES.find((c) => c.code === project.country)?.name || project.country) : "—"}
                      </div>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Currency</Label>
                    {editMode ? (
                      <SearchableSelect
                        options={[{ value: "", label: "—" }, ...CURRENCIES.map((c) => ({ value: c.code, label: `${c.name} (${c.code})` }))]}
                        value={String(editCurrency || "")}
                        onValueChange={(value) => setEditCurrency(value)}
                        placeholder="Select currency..."
                        searchPlaceholder="Search currencies..."
                        emptyMessage="No currencies found"
                      />
                    ) : (
                      <div className="text-muted-foreground">
                        {project.currency ? (CURRENCIES.find((c) => c.code === project.currency)?.name || project.currency) : "—"}
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Start Date</Label>
                    {editMode ? (
                      <Input type="date" value={editStartDate} onChange={(e) => setEditStartDate(e.target.value)} />
                    ) : (
                      <div className="text-muted-foreground">{project.start_date || "—"}</div>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">End Date</Label>
                    {editMode ? (
                      <Input type="date" value={editEndDate} onChange={(e) => setEditEndDate(e.target.value)} />
                    ) : (
                      <div className="text-muted-foreground">{project.end_date || "—"}</div>
                    )}
                  </div>
                </div>
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
                      ? project.allowed_pay_types.map((pt: string) => <Badge key={pt} className="mr-1">{(pt || "").replace("_", " ")}</Badge>)
                      : "No specific pay types configured"}
                </div>
                {!project.supports_all_pay_types && payTypeMismatches.length > 0 && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
                    <div className="flex items-center gap-1.5 text-xs font-medium">
                      <AlertTriangle className="h-4 w-4" />
                      {payTypeMismatches.length} employee{payTypeMismatches.length !== 1 ? "s" : ""} outside allowed pay types
                    </div>
                    <div className="mt-1 text-xs text-amber-800/90 dark:text-amber-100/90">
                      {(payTypeMismatches as any[]).slice(0, 6).map((e: any) => (
                        <span key={e.id} className="inline-block mr-2">
                          {[e.first_name, e.last_name].filter(Boolean).join(" ") || e.email} ({e.pay_type || "missing"})
                        </span>
                      ))}
                      {payTypeMismatches.length > 6 ? "…" : null}
                    </div>
                  </div>
                )}
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
            <Card>
              <CardContent className="pt-5">
                <IppmsWorkboardEnhanced
                  projectId={projectId as string}
                  projectName={project.name}
                  invoiceAmount={project.contract_value ?? 0}
                />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Variable Pay Tab (IPPMS & Manpower) */}
        {hasVariablePay && (
          <TabsContent value="variable-payroll" className="mt-4">
            <VariablePayrollPage
              projectId={projectId as string}
              projectName={project.name}
            />
          </TabsContent>
        )}

        {/* EHS Tab */}
        <TabsContent value="ehs" className="mt-4">
          <ProjectEhsTab projectId={projectId as string} />
        </TabsContent>
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
