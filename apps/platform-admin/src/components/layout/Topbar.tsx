import { ShieldCheck, LogOut } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";

export function Topbar() {
  const { user, logout } = useAuth();

  return (
    <header className="flex items-center justify-between border-b bg-background px-6 py-3">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <div>
          <div className="text-sm font-semibold">Platform Admin Console</div>
          <div className="text-xs text-muted-foreground">Super-admin only</div>
        </div>
        <Badge variant="secondary" className="ml-2">
          STAGING
        </Badge>
        <Separator orientation="vertical" className="mx-3 h-6" />
        <Link to="/support/diagnostics" className="text-xs text-primary hover:underline">
          Diagnostics
        </Link>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="text-sm font-medium">{user?.email ?? "Not signed in"}</div>
          <div className="text-xs text-muted-foreground">
            {user?.role ?? "platform-admin"}
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => void logout()}>
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </header>
  );
}


