import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AddProjectDialog from "@/components/projects/AddProjectDialog";
import {
    Plus, FolderKanban, Calendar, CheckCircle2, XCircle, Clock,
    MapPin, Building2, LayoutGrid, List, Users, DollarSign, Search, X as XIcon
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useOrg } from '@/lib/auth/OrgProvider';

interface ProjectWithCount {
    id: string;
    name: string;
    code: string;
    description: string | null;
    status: string;
    start_date: string | null;
    end_date: string | null;
    project_type: string | null;
    project_subtype: string | null;
    client_name: string | null;
    location: string | null;
    contract_value: number | null;
    currency: string | null;
    created_at: string;
    employeeCount: number;
}

// ── Module-level helpers ──────────────────────────────────────────────────────

const getStatusBadge = (status: string) => {
    switch (status) {
        case "active":
            return <Badge className="bg-green-500 shrink-0"><CheckCircle2 className="w-3 h-3 mr-1" />Active</Badge>;
        case "inactive":
            return <Badge variant="secondary" className="shrink-0"><XCircle className="w-3 h-3 mr-1" />Inactive</Badge>;
        case "completed":
            return <Badge variant="outline" className="shrink-0"><Clock className="w-3 h-3 mr-1" />Completed</Badge>;
        default:
            return <Badge className="shrink-0">{status}</Badge>;
    }
};

const getProjectTypeBadge = (type: string | null, subtype: string | null) => {
    if (!type) return null;
    const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
    const subtypeLabel = subtype
        ? ` - ${subtype.replace("_", "-").split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join("-")}`
        : "";
    switch (type) {
        case "manpower":
            return <Badge className="bg-blue-500">{typeLabel}{subtypeLabel}</Badge>;
        case "ippms":
            return <Badge className="bg-purple-500">{typeLabel.toUpperCase()}</Badge>;
        case "expatriate":
            return <Badge className="bg-orange-500">{typeLabel}</Badge>;
        default:
            return <Badge>{typeLabel}</Badge>;
    }
};

const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
};

// ── StatCard ──────────────────────────────────────────────────────────────────

const STAT_ACCENT: Record<string, string> = {
    gray:   "bg-gray-400",
    green:  "bg-green-500",
    blue:   "bg-blue-500",
    purple: "bg-purple-500",
    orange: "bg-orange-500",
};

interface StatCardProps {
    label: string;
    value: number;
    color?: string;
    active?: boolean;
    onClick?: () => void;
}

const StatCard = ({ label, value, color = "gray", active, onClick }: StatCardProps) => (
    <Card
        className={`cursor-pointer transition-all hover:shadow-md overflow-hidden ${active ? "ring-2 ring-offset-1 ring-primary" : ""}`}
        onClick={onClick}
    >
        <div className={`h-1 ${STAT_ACCENT[color] ?? "bg-gray-400"}`} />
        <CardContent className="pt-4 pb-3 px-4">
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
        </CardContent>
    </Card>
);

// ── Type accent maps ──────────────────────────────────────────────────────────

const TYPE_BORDER: Record<string, string> = {
    manpower:   "border-l-4 border-l-blue-500",
    ippms:      "border-l-4 border-l-purple-500",
    expatriate: "border-l-4 border-l-orange-500",
};

const TYPE_DOT: Record<string, string> = {
    manpower:   "bg-blue-500",
    ippms:      "bg-purple-500",
    expatriate: "bg-orange-500",
};

// ── ProjectGridCard ───────────────────────────────────────────────────────────

interface ProjectCardProps {
    project: ProjectWithCount;
    onNavigate: () => void;
}

const ProjectGridCard = ({ project, onNavigate }: ProjectCardProps) => {
    const borderClass = TYPE_BORDER[project.project_type ?? ""] ?? "border-l-4 border-l-gray-200";
    return (
        <Card
            className={`hover:shadow-lg transition-shadow cursor-pointer ${borderClass}`}
            onClick={onNavigate}
        >
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        <CardTitle className="text-base leading-snug truncate">{project.name}</CardTitle>
                        <CardDescription className="font-mono text-xs mt-1">{project.code}</CardDescription>
                    </div>
                    {getStatusBadge(project.status)}
                </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm pt-0">
                {project.project_type && (
                    <div>{getProjectTypeBadge(project.project_type, project.project_subtype)}</div>
                )}
                {(project.start_date || project.end_date) && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-4 h-4 shrink-0" />
                        <span>{formatDate(project.start_date)} – {formatDate(project.end_date)}</span>
                    </div>
                )}
                {project.client_name && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Building2 className="w-4 h-4 shrink-0" />
                        <span className="truncate">{project.client_name}</span>
                    </div>
                )}
                {project.location && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="w-4 h-4 shrink-0" />
                        <span className="truncate">{project.location}</span>
                    </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t mt-1">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Users className="w-4 h-4" />
                        <span>{project.employeeCount} {project.employeeCount === 1 ? "employee" : "employees"}</span>
                    </div>
                    {project.contract_value != null && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                            <DollarSign className="w-4 h-4" />
                            <span>
                                {new Intl.NumberFormat("en-US", {
                                    style: "currency",
                                    currency: project.currency || "USD",
                                    maximumFractionDigits: 0,
                                    notation: "compact",
                                } as Intl.NumberFormatOptions).format(project.contract_value)}
                            </span>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

// ── ProjectListRow ────────────────────────────────────────────────────────────

const ProjectListRow = ({ project, onNavigate }: ProjectCardProps) => (
    <tr
        className="border-b last:border-none hover:bg-muted/40 transition-colors cursor-pointer"
        onClick={onNavigate}
    >
        <td className="px-4 py-3">
            <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full shrink-0 ${TYPE_DOT[project.project_type ?? ""] ?? "bg-gray-300"}`} />
                <div>
                    <div className="font-medium">{project.name}</div>
                    <div className="text-xs font-mono text-muted-foreground">{project.code}</div>
                </div>
            </div>
        </td>
        <td className="px-4 py-3">{getProjectTypeBadge(project.project_type, project.project_subtype)}</td>
        <td className="px-4 py-3">{getStatusBadge(project.status)}</td>
        <td className="px-4 py-3 text-sm text-muted-foreground">{project.client_name || "—"}</td>
        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
            {formatDate(project.start_date)} – {formatDate(project.end_date)}
        </td>
        <td className="px-4 py-3 text-center text-sm">{project.employeeCount}</td>
        <td className="px-4 py-3 text-right">
            <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); onNavigate(); }}>
                View →
            </Button>
        </td>
    </tr>
);

// ── Main component ────────────────────────────────────────────────────────────

const Projects = () => {
    const { organizationId, companyId } = useOrg();
    const [projects, setProjects] = useState<ProjectWithCount[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "completed">("all");
    const [typeFilter, setTypeFilter] = useState<"all" | "manpower" | "ippms" | "expatriate">("all");
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const { toast } = useToast();
    const navigate = useNavigate();

    const fetchProjects = async () => {
        if (!organizationId) {
            setLoading(false);
            return;
        }
        try {
            const { data: projectData, error: projError } = await supabase
                .from("projects")
                .select("*")
                .eq("organization_id", organizationId)
                .order("created_at", { ascending: false });

            if (projError) throw projError;
            const rawProjects = projectData || [];

            const projectIds = rawProjects.map(p => p.id);
            const countMap: Record<string, number> = {};

            if (projectIds.length > 0) {
                const { data: empRows } = await supabase
                    .from("employees")
                    .select("project_id")
                    .in("project_id", projectIds);

                (empRows || []).forEach(row => {
                    if (row.project_id) {
                        countMap[row.project_id] = (countMap[row.project_id] || 0) + 1;
                    }
                });
            }

            setProjects(rawProjects.map(p => ({ ...p, employeeCount: countMap[p.id] || 0 })));
        } catch (error) {
            console.error("Error fetching projects:", error);
            toast({ title: "Error", description: "Failed to load projects", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProjects();
    }, [organizationId, companyId]);

    const stats = useMemo(() => ({
        total:      projects.length,
        active:     projects.filter(p => p.status === "active").length,
        manpower:   projects.filter(p => p.project_type === "manpower").length,
        ippms:      projects.filter(p => p.project_type === "ippms").length,
        expatriate: projects.filter(p => p.project_type === "expatriate").length,
    }), [projects]);

    const filteredProjects = useMemo(() => {
        let result = projects;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(p =>
                p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)
            );
        }
        if (statusFilter !== "all") result = result.filter(p => p.status === statusFilter);
        if (typeFilter !== "all") result = result.filter(p => p.project_type === typeFilter);
        return result;
    }, [projects, searchQuery, statusFilter, typeFilter]);

    const hasActiveFilters = searchQuery.trim() !== "" || statusFilter !== "all" || typeFilter !== "all";

    const clearFilters = () => { setSearchQuery(""); setStatusFilter("all"); setTypeFilter("all"); };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
                    <p className="text-muted-foreground">Manage projects for organizing employees and pay groups</p>
                </div>
                <Button onClick={() => setShowAddDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Project
                </Button>
            </div>

            {/* Stats bar */}
            {!loading && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <StatCard
                        label="Total Projects"
                        value={stats.total}
                        color="gray"
                        active={!hasActiveFilters}
                        onClick={clearFilters}
                    />
                    <StatCard
                        label="Active"
                        value={stats.active}
                        color="green"
                        active={statusFilter === "active"}
                        onClick={() => setStatusFilter(statusFilter === "active" ? "all" : "active")}
                    />
                    <StatCard
                        label="Manpower"
                        value={stats.manpower}
                        color="blue"
                        active={typeFilter === "manpower"}
                        onClick={() => setTypeFilter(typeFilter === "manpower" ? "all" : "manpower")}
                    />
                    <StatCard
                        label="IPPMS"
                        value={stats.ippms}
                        color="purple"
                        active={typeFilter === "ippms"}
                        onClick={() => setTypeFilter(typeFilter === "ippms" ? "all" : "ippms")}
                    />
                    <StatCard
                        label="Expatriate"
                        value={stats.expatriate}
                        color="orange"
                        active={typeFilter === "expatriate"}
                        onClick={() => setTypeFilter(typeFilter === "expatriate" ? "all" : "expatriate")}
                    />
                </div>
            )}

            {/* Toolbar */}
            {!loading && projects.length > 0 && (
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by name or code..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={v => setStatusFilter(v as typeof statusFilter)}>
                        <SelectTrigger className="w-[145px]">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={typeFilter} onValueChange={v => setTypeFilter(v as typeof typeFilter)}>
                        <SelectTrigger className="w-[145px]">
                            <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="manpower">Manpower</SelectItem>
                            <SelectItem value="ippms">IPPMS</SelectItem>
                            <SelectItem value="expatriate">Expatriate</SelectItem>
                        </SelectContent>
                    </Select>
                    {hasActiveFilters && (
                        <Button variant="ghost" size="sm" onClick={clearFilters}>
                            <XIcon className="w-4 h-4 mr-1" />Clear
                        </Button>
                    )}
                    <div className="ml-auto flex items-center border rounded-md overflow-hidden">
                        <Button
                            variant={viewMode === "grid" ? "default" : "ghost"}
                            size="sm"
                            className="rounded-none px-3"
                            onClick={() => setViewMode("grid")}
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </Button>
                        <Button
                            variant={viewMode === "list" ? "default" : "ghost"}
                            size="sm"
                            className="rounded-none px-3 border-l"
                            onClick={() => setViewMode("list")}
                        >
                            <List className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Loading skeletons */}
            {loading && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-52 rounded-lg" />)}
                </div>
            )}

            {/* No projects at all */}
            {!loading && projects.length === 0 && (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <FolderKanban className="w-12 h-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
                        <p className="text-muted-foreground mb-4">Get started by creating your first project</p>
                        <Button onClick={() => setShowAddDialog(true)}>
                            <Plus className="w-4 h-4 mr-2" />Create Project
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Filtered empty state */}
            {!loading && projects.length > 0 && filteredProjects.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <Search className="w-10 h-10 mb-3 opacity-40" />
                    <p className="text-base font-medium">No projects match your filters</p>
                    <Button variant="link" onClick={clearFilters}>Clear filters</Button>
                </div>
            )}

            {/* Grid view */}
            {!loading && filteredProjects.length > 0 && viewMode === "grid" && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredProjects.map(project => (
                        <ProjectGridCard
                            key={project.id}
                            project={project}
                            onNavigate={() => navigate(`/projects/${project.id}`)}
                        />
                    ))}
                </div>
            )}

            {/* List view */}
            {!loading && filteredProjects.length > 0 && viewMode === "list" && (
                <Card>
                    <CardContent className="p-0">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b text-muted-foreground text-xs uppercase tracking-wide">
                                    <th className="px-4 py-3 text-left">Project</th>
                                    <th className="px-4 py-3 text-left">Type</th>
                                    <th className="px-4 py-3 text-left">Status</th>
                                    <th className="px-4 py-3 text-left">Client</th>
                                    <th className="px-4 py-3 text-left">Dates</th>
                                    <th className="px-4 py-3 text-center">Employees</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProjects.map(project => (
                                    <ProjectListRow
                                        key={project.id}
                                        project={project}
                                        onNavigate={() => navigate(`/projects/${project.id}`)}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>
            )}

            <AddProjectDialog
                open={showAddDialog}
                onOpenChange={setShowAddDialog}
                onProjectAdded={fetchProjects}
            />
        </div>
    );
};

export default Projects;
