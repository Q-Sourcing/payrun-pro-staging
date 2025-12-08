import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AddProjectDialog from "@/components/projects/AddProjectDialog";
import { Plus, FolderKanban, Calendar, CheckCircle2, XCircle, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Project {
    id: string;
    name: string;
    code: string;
    description: string | null;
    status: string;
    start_date: string | null;
    end_date: string | null;
    project_type: string | null;
    project_subtype: string | null;
    created_at: string;
}

const Projects = () => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddDialog, setShowAddDialog] = useState(false);
    const { toast } = useToast();
    const navigate = useNavigate();

    const fetchProjects = async () => {
        try {
            const { data, error } = await supabase
                .from("projects")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) throw error;
            setProjects(data || []);
        } catch (error) {
            console.error("Error fetching projects:", error);
            toast({
                title: "Error",
                description: "Failed to load projects",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProjects();
    }, []);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "active":
                return <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />Active</Badge>;
            case "inactive":
                return <Badge variant="secondary"><XCircle className="w-3 h-3 mr-1" />Inactive</Badge>;
            case "completed":
                return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Completed</Badge>;
            default:
                return <Badge>{status}</Badge>;
        }
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleDateString();
    };

    const getProjectTypeBadge = (type: string | null, subtype: string | null) => {
        if (!type) return null;

        const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
        const subtypeLabel = subtype ? ` - ${subtype.replace('_', '-').split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('-')}` : '';

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

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
                    <p className="mt-4 text-muted-foreground">Loading projects...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
                    <p className="text-muted-foreground">
                        Manage projects for organizing employees and pay groups
                    </p>
                </div>
                <Button onClick={() => setShowAddDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Project
                </Button>
            </div>

            {projects.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <FolderKanban className="w-12 h-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
                        <p className="text-muted-foreground mb-4">Get started by creating your first project</p>
                        <Button onClick={() => setShowAddDialog(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Create Project
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {projects.map((project) => (
                        <Card key={project.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(`/projects/${project.id}`)}>
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <CardTitle className="text-lg">{project.name}</CardTitle>
                                        <CardDescription className="font-mono text-xs mt-1">
                                            {project.code}
                                        </CardDescription>
                                    </div>
                                    {getStatusBadge(project.status)}
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {project.description && (
                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                        {project.description}
                                    </p>
                                )}

                                <div className="space-y-2 text-sm">
                                    {project.project_type && (
                                        <div className="flex items-center gap-2">
                                            {getProjectTypeBadge(project.project_type, project.project_subtype)}
                                        </div>
                                    )}

                                    {(project.start_date || project.end_date) && (
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Calendar className="w-4 h-4" />
                                            <span>
                                                {formatDate(project.start_date)} - {formatDate(project.end_date)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
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
