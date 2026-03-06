import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PROJECT_TYPE_PAY_TYPES, formatPayType } from "@/lib/types/projects";
import { useOrg } from "@/lib/tenant/OrgContext";
import { ALL_COUNTRIES, CURRENCIES } from "@/lib/constants/countries";
 

type OrgRoleRow = { id: string; key: string };
type OrgUserRoleRow = { org_user_id: string; role_id: string };
type OrgUserRow = { id: string; user_id: string; status: string };
type UserProfileRow = { id: string; email: string | null; first_name: string | null; last_name: string | null };
type ManagerOption = {
    value: string;
    label: string;
    isIppmsDefault?: boolean;
    isManpowerDefault?: boolean;
    isExpatriateDefault?: boolean;
    roleKeys?: string[];
    activeProjectsForType?: Partial<Record<"manpower" | "ippms" | "expatriate", number>>;
    activeEmployeesForType?: Partial<Record<"manpower" | "ippms" | "expatriate", number>>;
    activeProjectsTotal?: number;
    atCapacityByType?: Partial<Record<"manpower" | "ippms" | "expatriate", boolean>>;
    lastAssignedAt?: string | null;
};

interface AddProjectDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onProjectAdded: () => void;
}

const extractMissingColumnFromPostgrestError = (error: unknown): string | null => {
    if (!error || typeof error !== "object") return null;
    const message = "message" in error ? String((error as { message?: unknown }).message || "") : "";
    if (!message) return null;

    // Example: "Could not find the 'country' column of 'projects' in the schema cache"
    const match = message.match(/Could not find the '([^']+)' column/i);
    return match?.[1] || null;
};

const MANAGER_CAPACITY_BY_TYPE: Record<"manpower" | "ippms" | "expatriate", number> = {
    manpower: 12,
    ippms: 8,
    expatriate: 6,
};

const isEligibleForProjectType = (
    manager: ManagerOption,
    projectType: "manpower" | "ippms" | "expatriate",
) => {
    const roles = new Set((manager.roleKeys || []).map((r) => r.toUpperCase()));
    // If role mapping is unavailable in this tenant, don't hide managers completely.
    if (roles.size === 0) return true;

    if (projectType === "ippms") {
        return roles.has("ORG_PROJECT_MANAGER")
            || roles.has("PROJECT_MANAGER")
            || roles.has("ORG_ADMIN")
            || roles.has("ADMIN")
            || roles.has("ORG_OWNER")
            || roles.has("OWNER");
    }
    if (projectType === "manpower") {
        return roles.has("ORG_ADMIN")
            || roles.has("ADMIN")
            || roles.has("ORG_OWNER")
            || roles.has("OWNER");
    }
    return roles.has("ORG_OWNER")
        || roles.has("OWNER")
        || roles.has("ORG_ADMIN")
        || roles.has("ADMIN");
};

const compareByAssignmentPriority = (
    a: ManagerOption,
    b: ManagerOption,
    projectType: "manpower" | "ippms" | "expatriate",
) => {
    const aTypeProjects = a.activeProjectsForType?.[projectType] || 0;
    const bTypeProjects = b.activeProjectsForType?.[projectType] || 0;
    if (aTypeProjects !== bTypeProjects) return aTypeProjects - bTypeProjects;

    const aTypeEmployees = a.activeEmployeesForType?.[projectType] || 0;
    const bTypeEmployees = b.activeEmployeesForType?.[projectType] || 0;
    if (aTypeEmployees !== bTypeEmployees) return aTypeEmployees - bTypeEmployees;

    const aTotal = a.activeProjectsTotal || 0;
    const bTotal = b.activeProjectsTotal || 0;
    if (aTotal !== bTotal) return aTotal - bTotal;

    // Longest ago wins: null (never assigned) is best, else older timestamp first.
    if (!a.lastAssignedAt && !b.lastAssignedAt) return a.label.localeCompare(b.label);
    if (!a.lastAssignedAt) return -1;
    if (!b.lastAssignedAt) return 1;
    if (a.lastAssignedAt !== b.lastAssignedAt) return a.lastAssignedAt.localeCompare(b.lastAssignedAt);
    return a.label.localeCompare(b.label);
};

const getRankedEligibleManagers = (
    projectType: "manpower" | "ippms" | "expatriate" | "",
    options: ManagerOption[],
) => {
    if (!projectType) return options;
    return options
        .filter((m) => isEligibleForProjectType(m, projectType))
        .filter((m) => !(m.atCapacityByType?.[projectType] ?? false))
        .sort((a, b) => compareByAssignmentPriority(a, b, projectType));
};

const getDefaultManagerIdForProjectType = (
    projectType: "manpower" | "ippms" | "expatriate" | "",
    options: ManagerOption[],
): string => {
    const ranked = getRankedEligibleManagers(projectType, options);
    return ranked[0]?.value || "";
};

const AddProjectDialog = ({ open, onOpenChange, onProjectAdded }: AddProjectDialogProps) => {
    const { organizationId } = useOrg();
    const [formData, setFormData] = useState({
        name: "",
        code: "",
        description: "",
        status: "active",
        start_date: "",
        end_date: "",
        project_type: "" as "manpower" | "ippms" | "expatriate" | "",
        project_subtype: "" as "daily" | "bi_weekly" | "monthly" | "",
        supports_all_pay_types: false,
        allowed_pay_types: [] as string[],
        responsible_manager_id: "",
        client_name: "",
        location: "",
        contract_value: "",
        country: "",
        currency: "",
    });
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();
    const [managerOptions, setManagerOptions] = useState<ManagerOption[]>([]);
    const [lastAutoAssignedManagerId, setLastAutoAssignedManagerId] = useState<string>("");

    const defaultManagerIdByType = useMemo(() => ({
        ippms: getDefaultManagerIdForProjectType("ippms", managerOptions),
        manpower: getDefaultManagerIdForProjectType("manpower", managerOptions),
        expatriate: getDefaultManagerIdForProjectType("expatriate", managerOptions),
    }), [managerOptions]);
    const filteredManagerOptions = useMemo(() => {
        return getRankedEligibleManagers(formData.project_type, managerOptions);
    }, [formData.project_type, managerOptions]);

    useEffect(() => {
        const type = formData.project_type;
        if (!type) return;
        const defaultManagerId = defaultManagerIdByType[type];
        if (!defaultManagerId) return;

        if (!formData.responsible_manager_id || formData.responsible_manager_id === lastAutoAssignedManagerId) {
            setFormData((prev) => ({ ...prev, responsible_manager_id: defaultManagerId }));
            setLastAutoAssignedManagerId(defaultManagerId);
        }
    }, [formData.project_type, formData.responsible_manager_id, defaultManagerIdByType, lastAutoAssignedManagerId]);

    useEffect(() => {
        const loadManagers = async () => {
            if (!open) return;
            const orgId = organizationId || localStorage.getItem("active_organization_id");
            if (!orgId) {
                setManagerOptions([]);
                return;
            }
            try {
                // Try multiple role-key conventions used across environments.
                const keys = [
                    "ORG_PROJECT_MANAGER",
                    "PROJECT_MANAGER",
                    "ORG_ADMIN",
                    "ADMIN",
                    "ORG_OWNER",
                    "OWNER",
                ];
                const { data: roleRows, error: roleErr } = await supabase
                    .from("org_roles")
                    .select("id, key")
                    .eq("org_id", orgId)
                    .in("key", keys);
                if (roleErr) throw roleErr;
                const typedRoleRows = (roleRows as OrgRoleRow[]) || [];

                const { data: orgUsers, error: ouErr } = await supabase
                    .from("org_users")
                    .select("id, user_id, status")
                    .eq("org_id", orgId);
                if (ouErr) throw ouErr;

                const eligibleOrgUserIds = Array.from(
                    new Set(
                        ((orgUsers as OrgUserRow[]) || [])
                            .filter((ou) => {
                                const status = String(ou.status || "").toLowerCase();
                                // Different environments use active/invited/pending; treat all non-disabled users as eligible.
                                return status !== "disabled" && status !== "inactive";
                            })
                            .map((ou) => ou.user_id)
                    )
                );

                const { data: profileByOrg, error: profileByOrgErr } = await supabase
                    .from("user_profiles")
                    .select("id, email, first_name, last_name, organization_id")
                    .eq("organization_id", orgId);
                if (profileByOrgErr) throw profileByOrgErr;

                const profileIdsFromOrgUsers = eligibleOrgUserIds.length > 0 ? eligibleOrgUserIds : [];
                const { data: profilesFromOrgUsers, error: pErr } = await supabase
                    .from("user_profiles")
                    .select("id, email, first_name, last_name")
                    .in("id", profileIdsFromOrgUsers.length > 0 ? profileIdsFromOrgUsers : ["00000000-0000-0000-0000-000000000000"]);
                if (pErr) throw pErr;

                const typedOrgUsers = (orgUsers as OrgUserRow[]) || [];
                const typedProfilesFromOrgUsers = (profilesFromOrgUsers as UserProfileRow[]) || [];
                const typedProfilesByOrg = ((profileByOrg as Array<UserProfileRow & { organization_id?: string | null }>) || [])
                    .map((p) => ({ id: p.id, email: p.email, first_name: p.first_name, last_name: p.last_name }));
                const profileMap = new Map<string, UserProfileRow>();
                [...typedProfilesByOrg, ...typedProfilesFromOrgUsers].forEach((p) => profileMap.set(p.id, p));
                const typedProfiles = Array.from(profileMap.values());
                const roleIds = typedRoleRows.map((r) => r.id);
                let typedOur: OrgUserRoleRow[] = [];

                if (roleIds.length > 0) {
                    const { data: our, error: ourErr } = await supabase
                        .from("org_user_roles")
                        .select("org_user_id, role_id")
                        .in("role_id", roleIds);
                    if (ourErr) throw ourErr;
                    typedOur = (our as OrgUserRoleRow[]) || [];
                }

                const roleIdToKey = new Map(typedRoleRows.map((r) => [r.id, r.key]));
                const orgUserIdToUserId = new Map(typedOrgUsers.map((ou) => [ou.id, ou.user_id]));
                const userRoleKeys = new Map<string, Set<string>>();
                typedOur.forEach((row) => {
                    const roleKey = roleIdToKey.get(row.role_id);
                    const userId = orgUserIdToUserId.get(row.org_user_id);
                    if (!roleKey || !userId) return;
                    const set = userRoleKeys.get(userId) || new Set<string>();
                    set.add(roleKey);
                    userRoleKeys.set(userId, set);
                });

                const candidateUserIds = Array.from(new Set([
                    ...eligibleOrgUserIds,
                    ...typedProfiles.map((p) => p.id),
                ]));
                const managerIds = candidateUserIds;
                const { data: managedProjectsData, error: managedProjectsErr } = await supabase
                    .from("projects")
                    .select("id, responsible_manager_id, project_type, status, created_at")
                    .in("responsible_manager_id", managerIds);
                if (managedProjectsErr) throw managedProjectsErr;

                const managedProjectsRaw = (managedProjectsData || []) as Array<{
                    id: string;
                    responsible_manager_id: string | null;
                    project_type: "manpower" | "ippms" | "expatriate" | null;
                    status: string | null;
                    created_at: string | null;
                }>;
                const managedProjects = managedProjectsRaw.filter((project) => {
                    const normalized = String(project.status || "").toLowerCase();
                    // Normalize status from mixed historical values ("active", "Active", etc.).
                    // Treat unknown/null as active so we don't undercount workload.
                    return !["inactive", "completed", "archived", "disabled", "cancelled", "closed"].includes(normalized);
                });

                const projectIds = managedProjects.map((p) => p.id);
                const { data: activeEmployeesData, error: activeEmployeesErr } = projectIds.length > 0
                    ? await supabase
                        .from("employees")
                        .select("project_id, status")
                        .in("project_id", projectIds)
                    : { data: [], error: null };
                if (activeEmployeesErr) throw activeEmployeesErr;

                const projectById = new Map(managedProjects.map((p) => [p.id, p]));
                const activeProjectsByManagerType = new Map<string, Record<"manpower" | "ippms" | "expatriate", number>>();
                const activeProjectsTotalByManager = new Map<string, number>();
                const lastAssignedAtByManager = new Map<string, string | null>();

                managedProjects.forEach((project) => {
                    const managerId = project.responsible_manager_id;
                    const type = project.project_type;
                    if (!managerId || !type || !["manpower", "ippms", "expatriate"].includes(type)) return;

                    const row = activeProjectsByManagerType.get(managerId) || { manpower: 0, ippms: 0, expatriate: 0 };
                    row[type as "manpower" | "ippms" | "expatriate"] += 1;
                    activeProjectsByManagerType.set(managerId, row);
                    activeProjectsTotalByManager.set(managerId, (activeProjectsTotalByManager.get(managerId) || 0) + 1);

                    const currentLast = lastAssignedAtByManager.get(managerId);
                    const createdAt = project.created_at || null;
                    if (!currentLast || (createdAt && createdAt > currentLast)) {
                        lastAssignedAtByManager.set(managerId, createdAt);
                    }
                });

                const activeEmployeesByManagerType = new Map<string, Record<"manpower" | "ippms" | "expatriate", number>>();
                ((activeEmployeesData || []) as Array<{ project_id: string | null; status: string | null }>)
                    .filter((emp) => {
                        const normalized = String(emp.status || "").toLowerCase();
                        return !["inactive", "disabled", "terminated", "left"].includes(normalized);
                    })
                    .forEach((emp) => {
                    const project = emp.project_id ? projectById.get(emp.project_id) : undefined;
                    const managerId = project?.responsible_manager_id;
                    const type = project?.project_type;
                    if (!managerId || !type || !["manpower", "ippms", "expatriate"].includes(type)) return;

                    const row = activeEmployeesByManagerType.get(managerId) || { manpower: 0, ippms: 0, expatriate: 0 };
                    row[type as "manpower" | "ippms" | "expatriate"] += 1;
                    activeEmployeesByManagerType.set(managerId, row);
                    });

                const profileById = new Map(typedProfiles.map((p) => [p.id, p]));
                const options = candidateUserIds
                    .map((userId) => {
                        const p = profileById.get(userId);
                        const name = p ? [p.first_name, p.last_name].filter(Boolean).join(" ").trim() : "";
                        const label = name
                            ? `${name} (${p?.email || ""})`
                            : (p?.email || `User ${userId.slice(0, 8)}...`);
                        const roleSet = userRoleKeys.get(userId) || new Set<string>();
                        const isIppmsDefault = roleSet.has("ORG_PROJECT_MANAGER") || roleSet.has("PROJECT_MANAGER");
                        const isManpowerDefault =
                            roleSet.has("ORG_ADMIN") || roleSet.has("ADMIN") || roleSet.has("ORG_OWNER") || roleSet.has("OWNER");
                        const isExpatriateDefault =
                            roleSet.has("ORG_OWNER") || roleSet.has("OWNER") || roleSet.has("ORG_ADMIN") || roleSet.has("ADMIN");
                        const activeProjectsForType = activeProjectsByManagerType.get(userId) || { manpower: 0, ippms: 0, expatriate: 0 };
                        const activeEmployeesForType = activeEmployeesByManagerType.get(userId) || { manpower: 0, ippms: 0, expatriate: 0 };
                        return {
                            value: userId,
                            label,
                            roleKeys: Array.from(roleSet),
                            isIppmsDefault,
                            isManpowerDefault,
                            isExpatriateDefault,
                            activeProjectsForType,
                            activeEmployeesForType,
                            activeProjectsTotal: activeProjectsTotalByManager.get(userId) || 0,
                            atCapacityByType: {
                                manpower: (activeProjectsForType.manpower || 0) >= MANAGER_CAPACITY_BY_TYPE.manpower,
                                ippms: (activeProjectsForType.ippms || 0) >= MANAGER_CAPACITY_BY_TYPE.ippms,
                                expatriate: (activeProjectsForType.expatriate || 0) >= MANAGER_CAPACITY_BY_TYPE.expatriate,
                            },
                            lastAssignedAt: lastAssignedAtByManager.get(userId) || null,
                        };
                    })
                    .sort((a, b) => a.label.localeCompare(b.label));

                setManagerOptions(options);
            } catch (e) {
                console.error("Failed to load project managers:", e);
                setManagerOptions([]);
            }
        };
        void loadManagers();
    }, [open, organizationId]);

    // Auto-generate project code from name
    const generateCode = (name: string) => {
        // Take first 3 letters of each word, uppercase, join with dash
        const words = name.trim().split(/\s+/).filter(w => w.length > 0);
        const code = words
            .map(word => word.substring(0, 3).toUpperCase())
            .join('-');
        return code;
    };

    const handleNameChange = (name: string) => {
        setFormData({
            ...formData,
            name,
            code: generateCode(name)
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.code || !formData.project_type) {
            toast({
                title: "Error",
                description: "Please fill in all required fields (Name, Code, Project Employee Type)",
                variant: "destructive",
            });
            return;
        }

        // Validate pay types
        if (!formData.supports_all_pay_types && formData.allowed_pay_types.length === 0) {
            toast({
                title: "Error",
                description: "Please select at least one pay type or enable 'Supports all pay types'",
                variant: "destructive",
            });
            return;
        }

        setLoading(true);
        try {
            const basePayload: Record<string, unknown> = {
                name: formData.name,
                code: formData.code.toUpperCase(),
                description: formData.description || null,
                status: formData.status,
                start_date: formData.start_date || null,
                end_date: formData.end_date || null,
                project_type: formData.project_type,
                project_subtype: formData.project_type === "manpower" ? formData.project_subtype || null : null,
                supports_all_pay_types: formData.supports_all_pay_types,
                allowed_pay_types: formData.supports_all_pay_types ? null : formData.allowed_pay_types,
                responsible_manager_id: formData.responsible_manager_id || null,
                client_name: formData.client_name || null,
                location: formData.location || null,
                contract_value: formData.contract_value ? parseFloat(formData.contract_value) : null,
                country: formData.country || null,
                currency: formData.currency || null,
            };

            let payload = { ...basePayload };
            let removedColumnForRetry = false;
            let created = false;
            let createdProjectId = "";

            // Handle schema-cache drift gracefully: remove unknown columns and retry once per missing field.
            for (let attempt = 0; attempt < 6; attempt += 1) {
                const { data, error } = await (supabase as any)
                    .from("projects")
                    .insert([payload])
                    .select("id")
                    .single();
                if (!error) {
                    created = true;
                    createdProjectId = data?.id || "";
                    break;
                }

                const code = (error && typeof error === "object" && "code" in error)
                    ? (error as { code?: string }).code
                    : undefined;

                if (code !== "PGRST204") throw error;

                const missingColumn = extractMissingColumnFromPostgrestError(error);
                if (!missingColumn || !(missingColumn in payload)) throw error;

                const { [missingColumn]: _omitted, ...nextPayload } = payload;
                payload = nextPayload;
                removedColumnForRetry = true;
            }

            if (!created) {
                throw new Error("Failed to create project after schema fallback retries.");
            }

            if (removedColumnForRetry) {
                toast({
                    title: "Project created with partial fields",
                    description: "Some newer project fields are not yet available in this environment and were skipped.",
                });
            } else {
                toast({
                    title: "Success",
                    description: "Project created successfully",
                });
            }

            setFormData({
                name: "",
                code: "",
                description: "",
                status: "active",
                start_date: "",
                end_date: "",
                project_type: "",
                project_subtype: "",
                supports_all_pay_types: false,
                allowed_pay_types: [],
                responsible_manager_id: "",
                client_name: "",
                location: "",
                contract_value: "",
                country: "",
                currency: "",
            });
            onProjectAdded();
            onOpenChange(false);
        } catch (error: unknown) {
            console.error("Error creating project:", error);

            const code = (error && typeof error === "object" && "code" in error)
                ? (error as { code?: string }).code
                : undefined;

            if (code === "23505") {
                toast({
                    title: "Error",
                    description: "A project with this name or code already exists",
                    variant: "destructive",
                });
            } else if (code === "PGRST204") {
                const missingColumn = extractMissingColumnFromPostgrestError(error);
                toast({
                    title: "Schema mismatch",
                    description: missingColumn
                        ? `The database is missing the '${missingColumn}' projects column. Run latest migrations, or keep using the fallback create flow.`
                        : "The projects schema is out of date in this environment.",
                    variant: "destructive",
                });
            } else {
                toast({
                    title: "Error",
                    description: "Failed to create project",
                    variant: "destructive",
                });
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] modern-dialog max-h-[90vh] overflow-y-auto">
                <DialogHeader className="modern-dialog-header">
                    <DialogTitle className="modern-dialog-title">Create Project</DialogTitle>
                    <DialogDescription className="modern-dialog-description">
                        Add a new project to organize employees and pay groups
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Project Name *</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => handleNameChange(e.target.value)}
                            placeholder="e.g., Kampala Road Construction"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="code">Project Code *</Label>
                        <Input
                            id="code"
                            value={formData.code}
                            readOnly
                            placeholder="Auto-generated from name"
                            className="bg-slate-50"
                        />
                        <p className="text-xs text-muted-foreground">Auto-generated from project name</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="status">Status *</Label>
                        <Select
                            value={formData.status}
                            onValueChange={(value) => setFormData({ ...formData, status: value })}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="project_type">Project (Employee) Type *</Label>
                        <Select
                            value={formData.project_type}
                            onValueChange={(value) => {
                                const typedValue = value as "manpower" | "ippms" | "expatriate";
                                const shouldAutoAssign = !formData.responsible_manager_id || formData.responsible_manager_id === lastAutoAssignedManagerId;
                                const nextDefaultManager = shouldAutoAssign
                                    ? getDefaultManagerIdForProjectType(typedValue, managerOptions)
                                    : "";
                                if (nextDefaultManager) {
                                    setLastAutoAssignedManagerId(nextDefaultManager);
                                }
                                setFormData({
                                    ...formData,
                                    project_type: typedValue,
                                    project_subtype: typedValue !== "manpower" ? "" : formData.project_subtype,
                                    allowed_pay_types: [], // Reset pay types when project type changes
                                    // Auto-assign manager by project type unless user manually chose a different one
                                    responsible_manager_id: nextDefaultManager || formData.responsible_manager_id
                                });
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select project employee type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="manpower">Manpower</SelectItem>
                                <SelectItem value="ippms">IPPMS</SelectItem>
                                <SelectItem value="expatriate">Expatriate</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">The employee type for this project (determines available pay types)</p>
                    </div>

                    <div className="space-y-2">
                        <Label>Responsible Manager</Label>
                        <SearchableSelect
                            options={filteredManagerOptions.map((m) => {
                                const baseLabel =
                                    formData.project_type === "ippms" && m.isIppmsDefault
                                        ? `${m.label} (default for IPPMS)`
                                        : formData.project_type === "manpower" && m.isManpowerDefault
                                            ? `${m.label} (default for Manpower)`
                                            : formData.project_type === "expatriate" && m.isExpatriateDefault
                                                ? `${m.label} (default for Expatriate)`
                                                : m.label;
                                const statsSuffix = formData.project_type
                                    ? ` • ${m.activeProjectsForType?.[formData.project_type] || 0} active ${formData.project_type} projects`
                                    : "";
                                return {
                                    value: m.value,
                                    label: `${baseLabel}${statsSuffix}`,
                                };
                            })}
                            value={String(formData.responsible_manager_id || "")}
                            onValueChange={(value) => {
                                setLastAutoAssignedManagerId("");
                                setFormData({ ...formData, responsible_manager_id: value });
                            }}
                            placeholder={filteredManagerOptions.length ? "Search or select manager..." : "No eligible managers found"}
                            searchPlaceholder="Search users..."
                            emptyMessage="No users found"
                            disabled={filteredManagerOptions.length === 0}
                        />
                        {formData.project_type && defaultManagerIdByType[formData.project_type] && !formData.responsible_manager_id && (
                            <p className="text-xs text-muted-foreground">
                                A default manager will be auto-selected for {formData.project_type.toUpperCase()} projects.
                            </p>
                        )}
                    </div>

                    {formData.project_type === "manpower" && (
                        <div className="space-y-2">
                            <Label htmlFor="project_subtype">Manpower Type *</Label>
                            <Select
                                value={formData.project_subtype}
                                onValueChange={(value) => setFormData({ ...formData, project_subtype: value as "daily" | "bi_weekly" | "monthly" })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select manpower type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="daily">Daily</SelectItem>
                                    <SelectItem value="bi_weekly">Bi-Weekly</SelectItem>
                                    <SelectItem value="monthly">Monthly</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {formData.project_type && (
                        <div className="space-y-3 border rounded-lg p-4 bg-slate-50">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="supports_all_pay_types"
                                    checked={formData.supports_all_pay_types}
                                    onCheckedChange={(checked) => setFormData({
                                        ...formData,
                                        supports_all_pay_types: checked as boolean,
                                        allowed_pay_types: checked ? [] : formData.allowed_pay_types
                                    })}
                                />
                                <Label htmlFor="supports_all_pay_types" className="font-medium cursor-pointer">
                                    This project supports all pay types for {formData.project_type}
                                </Label>
                            </div>

                            {!formData.supports_all_pay_types && (
                                <div className="space-y-2 pt-2">
                                    <Label className="text-sm">Allowed Pay Types *</Label>
                                    <div className="space-y-2">
                                        {PROJECT_TYPE_PAY_TYPES[formData.project_type as keyof typeof PROJECT_TYPE_PAY_TYPES].map((payType) => (
                                            <div key={payType} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`pay_type_${payType}`}
                                                    checked={formData.allowed_pay_types.includes(payType)}
                                                    onCheckedChange={(checked) => {
                                                        if (checked) {
                                                            setFormData({
                                                                ...formData,
                                                                allowed_pay_types: [...formData.allowed_pay_types, payType]
                                                            });
                                                        } else {
                                                            setFormData({
                                                                ...formData,
                                                                allowed_pay_types: formData.allowed_pay_types.filter(pt => pt !== payType)
                                                            });
                                                        }
                                                    }}
                                                />
                                                <Label htmlFor={`pay_type_${payType}`} className="cursor-pointer">
                                                    {formatPayType(payType)}
                                                </Label>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-xs text-muted-foreground">Select which pay types are allowed for this project</p>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="start_date">Start Date</Label>
                            <Input
                                id="start_date"
                                type="date"
                                value={formData.start_date}
                                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="end_date">End Date</Label>
                            <Input
                                id="end_date"
                                type="date"
                                value={formData.end_date}
                                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Optional description for this project"
                            rows={3}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="client_name">Client Name</Label>
                        <Input
                            id="client_name"
                            value={formData.client_name}
                            onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                            placeholder="e.g., Ministry of Works"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="location">Location</Label>
                            <Input
                                id="location"
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                placeholder="e.g., Kampala"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="contract_value">Contract Value</Label>
                            <Input
                                id="contract_value"
                                type="number"
                                value={formData.contract_value}
                                onChange={(e) => setFormData({ ...formData, contract_value: e.target.value })}
                                placeholder="e.g., 500000"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Country</Label>
                            <Select
                                value={formData.country}
                                onValueChange={(value) => {
                                    const selected = ALL_COUNTRIES.find((c) => c.code === value);
                                    setFormData((prev) => ({
                                        ...prev,
                                        country: value,
                                        // Default currency from country if not already set
                                        currency: prev.currency || selected?.currency || "",
                                    }));
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select country" />
                                </SelectTrigger>
                                <SelectContent>
                                    {ALL_COUNTRIES.map((c) => (
                                        <SelectItem key={c.code} value={c.code}>
                                            {c.name} ({c.code})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">Used as defaults when assigning employees</p>
                        </div>
                        <div className="space-y-2">
                            <Label>Currency</Label>
                            <Select value={formData.currency} onValueChange={(value) => setFormData({ ...formData, currency: value })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select currency" />
                                </SelectTrigger>
                                <SelectContent>
                                    {CURRENCIES.map((c) => (
                                        <SelectItem key={c.code} value={c.code}>
                                            {c.name} ({c.code})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>



                    <div className="flex gap-3 pt-4">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading} className="flex-1">
                            {loading ? "Creating..." : "Create Project"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default AddProjectDialog;
