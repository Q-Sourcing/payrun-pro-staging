/**
 * RbacGuard
 * Wraps children behind a permission check.
 * If the user doesn't have the required permission, renders `fallback` (null by default).
 */
import { useRbacPermissions } from "@/hooks/use-rbac-permissions";
import { ReactNode } from "react";
import { ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface RbacGuardProps {
  permission: string;
  children: ReactNode;
  /** Custom fallback — pass false to render nothing, or a node for a custom message */
  fallback?: ReactNode | false;
}

export function RbacGuard({ permission, children, fallback }: RbacGuardProps) {
  const { can, isLoading } = useRbacPermissions();

  if (isLoading) return null;
  if (can(permission)) return <>{children}</>;

  if (fallback === false) return null;
  if (fallback !== undefined) return <>{fallback}</>;

  return (
    <Card className="border-destructive/20 bg-destructive/5">
      <CardContent className="flex items-center gap-3 py-6 text-sm text-muted-foreground">
        <ShieldAlert className="h-5 w-5 text-destructive shrink-0" />
        <span>You don't have permission to access this section.</span>
      </CardContent>
    </Card>
  );
}
