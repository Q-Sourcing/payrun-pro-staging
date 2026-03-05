/**
 * ProjectFirstGate
 * Shows a blocking banner when no active IPPMS/Manpower project exists,
 * preventing staff registration until one is created.
 */
import { AlertTriangle, FolderKanban } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useActiveProjects } from "@/hooks/useActiveProjects";

interface ProjectFirstGateProps {
  /** If provided, only check for projects of these types */
  requiredTypes?: ("manpower" | "ippms" | "expatriate")[];
  children: React.ReactNode;
}

export function ProjectFirstGate({ requiredTypes = ["manpower", "ippms"], children }: ProjectFirstGateProps) {
  const navigate = useNavigate();
  const { projects, loading } = useActiveProjects(requiredTypes);

  if (loading) return <>{children}</>;

  if (projects.length === 0) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive" className="border-destructive/50 bg-destructive/5">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle className="font-semibold">Project Required Before Staff Registration</AlertTitle>
          <AlertDescription className="mt-1 space-y-3">
            <p>
              Staff cannot be registered until at least one active{" "}
              <strong>IPPMS</strong> or <strong>Manpower</strong> project exists in the system.
              This ensures every staff member is linked to a valid project context.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="border-destructive/40 text-destructive hover:bg-destructive/10"
              onClick={() => navigate("/projects")}
            >
              <FolderKanban className="h-4 w-4 mr-2" />
              Create a Project First
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
}
