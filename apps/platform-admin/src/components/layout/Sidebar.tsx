import {
  ActivitySquare,
  Building2,
  Clock3,
  LayoutDashboard,
  LifeBuoy,
  ListChecks,
  Logs,
  Settings,
  ShieldQuestion,
  Users,
} from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";

import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

type NavItem = {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavItem[];
};

const nav: NavItem[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Tenants", to: "/tenants", icon: Building2 },
  { label: "Users", to: "/users", icon: Users },
  {
    label: "Settings",
    to: "/settings/global",
    icon: Settings,
    children: [
      { label: "Global", to: "/settings/global", icon: ListChecks },
      { label: "Modules", to: "/settings/modules", icon: ActivitySquare },
    ],
  },
  { label: "Audit Logs", to: "/logs", icon: Logs },
  {
    label: "Support",
    to: "/support/impersonation",
    icon: LifeBuoy,
    children: [
      { label: "Impersonation", to: "/support/impersonation", icon: ShieldQuestion },
      { label: "Diagnostics", to: "/support/diagnostics", icon: ActivitySquare },
      { label: "Jobs", to: "/support/jobs", icon: Clock3 },
    ],
  },
];

export function Sidebar() {
  const routerState = useRouterState();

  const activePath = routerState.location.pathname;

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-card">
      <div className="px-4 py-4">
        <div className="text-xs font-semibold uppercase text-muted-foreground">
          PayRun Pro
        </div>
        <div className="text-base font-semibold">Platform Admin</div>
        <div className="mt-2 inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
          STAGING
        </div>
      </div>
      <Separator />
      <ScrollArea className="flex-1">
        <nav className="space-y-1 p-2">
          {nav.map((item) => (
            <div key={item.to} className="space-y-1">
              <NavLink item={item} activePath={activePath} />
              {item.children && (
                <div className="ml-6 space-y-1 border-l border-border pl-3">
                  {item.children.map((child) => (
                    <NavLink key={child.to} item={child} activePath={activePath} size="sm" />
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </ScrollArea>
    </aside>
  );
}

function NavLink({
  item,
  activePath,
  size = "md",
}: {
  item: NavItem;
  activePath: string;
  size?: "md" | "sm";
}) {
  const Icon = item.icon;
  const isActive = activePath === item.to || activePath.startsWith(`${item.to}/`);
  return (
    <Link
      to={item.to}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
        isActive && "bg-accent text-accent-foreground font-semibold",
        size === "sm" && "text-xs py-1.5",
      )}
    >
      <Icon className={cn("h-4 w-4", size === "sm" && "h-3.5 w-3.5")} />
      <span>{item.label}</span>
    </Link>
  );
}


