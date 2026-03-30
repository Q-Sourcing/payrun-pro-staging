import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandItem, CommandList,
} from "@/components/ui/command";
import {
  Send, Loader2, ChevronDown, Users, DollarSign, FolderKanban,
  BarChart3, ShieldAlert, Settings, UserCog, Shield,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useOrgDepartments } from "@/hooks/use-org-departments";
import { SYSTEM_MODULES_REGISTRY } from "@/lib/constants/permissions-registry";

// ─── Types ─────────────────────────────────────────────────────────────────────
export interface OrgRole {
  code: string;
  name: string;
  description: string | null;
}

export type ModuleAccess = "none" | "view" | "full";

const INVITE_FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-user`;

export async function callInviteUser(action: string, body?: unknown) {
  const { data: { session } } = await supabase.auth.getSession();
  const method = action === "list" ? "GET" : "POST";
  const url = `${INVITE_FN_URL}?action=${action}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${session?.access_token}`,
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return res.json();
}

// ─── Validation ────────────────────────────────────────────────────────────────
const inviteSchema = z.object({
  full_name: z.string().min(2, "Full name must be at least 2 characters").max(200).trim(),
  email: z.string().email("Invalid email address").max(255),
  role: z.string().min(1, "Role is required"),
  phone: z.string().max(30).optional().or(z.literal("")),
  department: z.string().max(100).optional().or(z.literal("")),
});

type InviteFormValues = z.infer<typeof inviteSchema>;

// ─── Modules shown in module access section ────────────────────────────────────
const INVITE_MODULES = SYSTEM_MODULES_REGISTRY.filter(
  (m) => m.viewPermissions && m.viewPermissions.length > 0
);

export const MODULE_ICONS: Record<string, React.ReactNode> = {
  Users:        <Users className="h-3.5 w-3.5" />,
  DollarSign:   <DollarSign className="h-3.5 w-3.5" />,
  FolderKanban: <FolderKanban className="h-3.5 w-3.5" />,
  BarChart3:    <BarChart3 className="h-3.5 w-3.5" />,
  ShieldAlert:  <ShieldAlert className="h-3.5 w-3.5" />,
  Settings:     <Settings className="h-3.5 w-3.5" />,
  UserCog:      <UserCog className="h-3.5 w-3.5" />,
};

// ─── Hook: fetch org roles — mirrors Roles & Permissions tab ───────────────────
export function useOrgRoles() {
  const [roles, setRoles] = useState<OrgRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("rbac_roles")
      .select("code, name, description, tier")
      .not("tier", "in", '("PLATFORM","SELF")')
      .not("code", "in", '("SELF_USER","SELF_CONTRACTOR")')
      .order("name")
      .then(({ data }) => {
        setRoles((data ?? []) as OrgRole[]);
      })
      .finally(() => setLoading(false));
  }, []);

  return { roles, loading };
}

// ─── Department Combobox (free-text with suggestions) ─────────────────────────
export function DepartmentCombobox({
  value,
  onChange,
  departments,
}: {
  value: string;
  onChange: (v: string) => void;
  departments: string[];
}) {
  const [open, setOpen] = useState(false);

  const filtered = departments.filter((d) =>
    value ? d.toLowerCase().includes(value.toLowerCase()) : true
  );

  return (
    <Popover open={open && departments.length > 0} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="e.g. Finance"
          autoComplete="off"
        />
      </PopoverTrigger>
      {departments.length > 0 && (
        <PopoverContent
          className="p-0 w-[--radix-popover-trigger-width]"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Command>
            <CommandList>
              <CommandEmpty className="py-2 px-3 text-xs text-muted-foreground">
                No matching departments — your typed value will be saved.
              </CommandEmpty>
              <CommandGroup>
                {filtered.map((d) => (
                  <CommandItem
                    key={d}
                    value={d}
                    onSelect={() => {
                      onChange(d);
                      setOpen(false);
                    }}
                  >
                    {d}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      )}
    </Popover>
  );
}

// ─── Module Access Section (shared / reusable across dialogs) ─────────────────
export function ModuleAccessSection({
  value,
  onChange,
}: {
  value: Record<string, ModuleAccess>;
  onChange: (v: Record<string, ModuleAccess>) => void;
}) {
  const [open, setOpen] = useState(false);

  const activeCount = Object.values(value).filter((v) => v !== "none").length;

  const setModule = (id: string, level: ModuleAccess) =>
    onChange({ ...value, [id]: level });

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex items-center justify-between w-full px-3 py-2 rounded-md border text-sm font-medium hover:bg-muted/40 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            Module Access
            {activeCount > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {activeCount} module{activeCount !== 1 ? "s" : ""}
              </Badge>
            )}
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            Optional — additive to role
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
            />
          </span>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 border rounded-md overflow-hidden">
          <div className="px-3 py-2 bg-muted/30 border-b">
            <p className="text-xs text-muted-foreground">
              These grants are <strong>additive</strong> — they extend beyond what the selected
              role already allows. Leave as "No Access" to rely solely on role permissions.
            </p>
          </div>
          <div className="divide-y">
            {INVITE_MODULES.map((module) => {
              const current = value[module.id] ?? "none";
              const icon = MODULE_ICONS[module.icon] ?? <Shield className="h-3.5 w-3.5" />;
              return (
                <div key={module.id} className="flex items-center gap-3 px-3 py-2.5">
                  <span className="text-muted-foreground shrink-0">{icon}</span>
                  <span className="text-xs font-medium flex-1">{module.label}</span>
                  <div className="flex rounded-md border overflow-hidden shrink-0">
                    {(["none", "view", "full"] as ModuleAccess[]).map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setModule(module.id, level)}
                        className={`px-2.5 py-1 text-[11px] font-medium transition-colors border-r last:border-r-0 ${
                          current === level
                            ? level === "none"
                              ? "bg-muted text-muted-foreground"
                              : level === "view"
                              ? "bg-blue-600 text-white"
                              : "bg-primary text-primary-foreground"
                            : "bg-background hover:bg-muted/50 text-muted-foreground"
                        }`}
                      >
                        {level === "none" ? "No Access" : level === "view" ? "View" : "Full"}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ─── InviteUserDialog ──────────────────────────────────────────────────────────
export function InviteUserDialog({
  open,
  onClose,
  onSent,
  roles,
  prefill,
}: {
  open: boolean;
  onClose: () => void;
  onSent: () => void;
  roles: OrgRole[];
  prefill?: { full_name?: string; email?: string; role?: string };
}) {
  const { toast } = useToast();
  const { departments } = useOrgDepartments();
  const [loading, setLoading] = useState(false);
  const [moduleAccess, setModuleAccess] = useState<Record<string, ModuleAccess>>({});

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { full_name: "", email: "", role: "", phone: "", department: "" },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        full_name: prefill?.full_name ?? "",
        email: prefill?.email ?? "",
        role: prefill?.role ?? roles[0]?.code ?? "",
        phone: "",
        department: "",
      });
      setModuleAccess({});
    }
  }, [open, roles, prefill]);

  async function onSubmit(values: InviteFormValues) {
    setLoading(true);
    try {
      const nonNoneAccess = Object.fromEntries(
        Object.entries(moduleAccess).filter(([, v]) => v !== "none")
      );
      const result = await callInviteUser("invite", {
        ...values,
        phone: values.phone || null,
        department: values.department || null,
        role_data: { module_access: nonNoneAccess },
      });
      if (!result.success) throw new Error(result.message);
      toast({
        title: "Invitation sent!",
        description: `An invitation email has been sent to ${values.email}.`,
      });
      onSent();
      onClose();
    } catch (err: unknown) {
      toast({
        title: "Failed to send invitation",
        description: err instanceof Error ? err.message : "Unknown error occurred.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" /> Invite User
          </DialogTitle>
          <DialogDescription>
            An invitation email will be sent. The user creates their own password via the link.
            Invitations expire after 48 hours.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="full_name" render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name <span className="text-destructive">*</span></FormLabel>
                <FormControl><Input placeholder="Jane Doe" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem>
                <FormLabel>Email Address <span className="text-destructive">*</span></FormLabel>
                <FormControl><Input type="email" placeholder="user@company.com" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="role" render={({ field }) => (
                <FormItem>
                  <FormLabel>Role <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((r) => (
                          <SelectItem key={r.code} value={r.code}>{r.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="department" render={({ field }) => (
                <FormItem>
                  <FormLabel>Department</FormLabel>
                  <FormControl>
                    <DepartmentCombobox
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      departments={departments}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="phone" render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl><Input placeholder="+1 555 000 0000" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <ModuleAccessSection value={moduleAccess} onChange={setModuleAccess} />

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || roles.length === 0} className="gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send Invitation
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
