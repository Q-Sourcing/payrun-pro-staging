import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Users,
    Shield,
    Target,
    Eye,
    CheckCircle2,
    History,
    Lock
} from "lucide-react";
import { RBACRolesModule } from "./rbac/RBACRolesModule";
import { RBACPermissionsModule } from "./rbac/RBACPermissionsModule";
import { RBACGrantsModule } from "./rbac/RBACGrantsModule";
import { RBACDataScopeModule } from "./rbac/RBACDataScopeModule";
import { RBACApprovalsModule } from "./rbac/RBACApprovalsModule";
import { RBACAuditLogModule } from "./rbac/RBACAuditLogModule";

type ModuleId = "roles" | "permissions" | "grants" | "scope" | "approvals" | "audit";

export function AccessControlManager() {
    const [activeModule, setActiveModule] = useState<ModuleId>("grants");

    const modules = [
        { id: "roles", label: "Roles", icon: Users, description: "Manage system and organization roles" },
        { id: "permissions", label: "Permissions", icon: Lock, description: "Explore available system permissions" },
        { id: "grants", label: "Grants", icon: Shield, description: "Manage explicit ALLOW/DENY overrides" },
        { id: "scope", label: "Data Scope", icon: Eye, description: "Visualize effective access per user" },
        { id: "approvals", label: "Approvals", icon: CheckCircle2, description: "Review sensitive access requests" },
        { id: "audit", label: "Audit Log", icon: History, description: "Trace all access control changes" },
    ];

    const renderModule = () => {
        switch (activeModule) {
            case "roles": return <RBACRolesModule />;
            case "permissions": return <RBACPermissionsModule />;
            case "grants": return <RBACGrantsModule />;
            case "scope": return <RBACDataScopeModule />;
            case "approvals": return <RBACApprovalsModule />;
            case "audit": return <RBACAuditLogModule />;
            default: return <RBACGrantsModule />;
        }
    };

    return (
        <div className="flex flex-col h-full bg-background overflow-hidden border rounded-lg">
            {/* Header */}
            <div className="px-6 py-4 border-b bg-muted/30">
                <h2 className="text-xl font-bold tracking-tight">Access Control Manager</h2>
                <p className="text-sm text-muted-foreground">
                    Manage roles, permissions, and fine-grained access overrides for your organization.
                </p>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <div className="w-64 border-r bg-muted/10">
                    <nav className="p-2 space-y-1">
                        {modules.map((m) => {
                            const Icon = m.icon;
                            const isActive = activeModule === m.id;
                            return (
                                <button
                                    key={m.id}
                                    onClick={() => setActiveModule(m.id as ModuleId)}
                                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${isActive
                                            ? "bg-primary text-primary-foreground shadow-sm"
                                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                        }`}
                                >
                                    <Icon className={`w-4 h-4 ${isActive ? "" : "text-muted-foreground"}`} />
                                    {m.label}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-6 bg-background">
                    {renderModule()}
                </div>
            </div>
        </div>
    );
}
