import { useQuery } from "@tanstack/react-query";
import { listPermissions } from "@/lib/api/rbac";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Lock, Info } from "lucide-react";

export function RBACPermissionsModule() {
    const { data: permissions, isLoading } = useQuery({
        queryKey: ["rbac-permissions"],
        queryFn: listPermissions
    });

    const groupedPermissions = permissions?.reduce((acc, p) => {
        if (!acc[p.category]) acc[p.category] = [];
        acc[p.category].push(p);
        return acc;
    }, {} as Record<string, typeof permissions>);

    return (
        <div className="space-y-4 max-w-4xl">
            <div className="flex items-center gap-2 text-muted-foreground mb-4">
                <Lock className="w-4 h-4" />
                <span className="text-sm font-medium">Permission Explorer</span>
            </div>

            {isLoading ? (
                <div className="text-sm text-muted-foreground p-8 text-center">Loading permissions catalog...</div>
            ) : (
                <Accordion type="multiple" defaultValue={Object.keys(groupedPermissions || {})} className="w-full space-y-2 border-none">
                    {Object.entries(groupedPermissions || {}).map(([category, perms]) => (
                        <AccordionItem key={category} value={category} className="border rounded-md px-4 bg-muted/20">
                            <AccordionTrigger className="hover:no-underline py-3">
                                <div className="flex items-center gap-3">
                                    <span className="font-bold text-sm uppercase tracking-wider">{category}</span>
                                    <Badge variant="outline" className="text-[10px]">{perms.length}</Badge>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pb-4 pt-1">
                                <div className="grid gap-2">
                                    {perms.map((p) => (
                                        <div key={p.key} className="flex flex-col p-2.5 rounded-sm bg-background border border-border/50 hover:border-primary/30 transition-colors">
                                            <div className="flex items-center justify-between mb-1">
                                                <code className="text-xs font-bold text-primary bg-primary/5 px-1.5 py-0.5 rounded">{p.key}</code>
                                            </div>
                                            <p className="text-sm text-muted-foreground leading-relaxed">
                                                {p.description || "No detailed description available."}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            )}
        </div>
    );
}
