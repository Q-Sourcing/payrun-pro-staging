
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

import { fetchTenants } from "@/api/tenants";

// --- Types ---

type WizardStep = "details" | "platform" | "org" | "review";

interface CreateUserWizardProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

// --- Component ---

export function CreateUserWizard({ open, onOpenChange }: CreateUserWizardProps) {
    const qc = useQueryClient();
    const [step, setStep] = useState<WizardStep>("details");
    const [loading, setLoading] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        email: "",
        full_name: "",
        country: "Uganda", // Default
        role: "employee", // Initial role default
    });

    const [platformAdmin, setPlatformAdmin] = useState(false);
    const [platformRole, setPlatformRole] = useState("support_admin");

    const [selectedOrgIds, setSelectedOrgIds] = useState<string[]>([]);
    // Map orgId -> roleKey (simple single role assignment for MVP, can be expanded)
    const [orgRoles, setOrgRoles] = useState<Record<string, string>>({});

    const [sendInvite, setSendInvite] = useState(true);
    const [activateUser, setActivateUser] = useState(true);

    // Queries
    const { data: tenants } = useQuery({
        queryKey: ["tenants"],
        queryFn: fetchTenants,
    });

    // Steps Navigation
    const nextStep = () => {
        if (step === "details") setStep("platform");
        else if (step === "platform") setStep("org");
        else if (step === "org") setStep("review");
    };

    const prevStep = () => {
        if (step === "review") setStep("org");
        else if (step === "org") setStep("platform");
        else if (step === "platform") setStep("details");
    };

    // Submission
    const handleSubmit = async () => {
        setLoading(true);
        try {
            const { supabase } = await import("@/lib/supabase");

            // Construct payload for create-platform-user
            const orgs = selectedOrgIds.map(orgId => {
                const roleKey = orgRoles[orgId] || "member";
                return {
                    orgId: orgId,
                    roles: [roleKey], // API expects array of role KEYS
                    companyIds: [] // Todo in future: allow company selection
                };
            });

            const platformRoles = platformAdmin ? [platformRole] : [];
            const [firstName, ...lastNameParts] = formData.full_name.split(' ');
            const lastName = lastNameParts.join(' ') || '';

            const payload = {
                email: formData.email,
                firstName: firstName || "User",
                lastName: lastName || "User",
                orgs: orgs,
                platformRoles: platformRoles,
                sendInvite: sendInvite
            };

            const { data, error } = await supabase.functions.invoke('create-platform-user', {
                body: payload
            });

            if (error) {
                // Parse error message if possible
                let msg = error.message;
                try {
                    const body = JSON.parse(await error.context.json());
                    if (body.message) msg = body.message;
                } catch (e) {
                    // ignore
                }
                throw new Error(msg || "Failed to invite user via Edge Function");
            }

            if (!data.success) {
                throw new Error(data.message || "Unknown server error");
            }

            console.log("User invited successfully:", data.userId);

            await qc.invalidateQueries();
            onOpenChange(false);
            resetForm();
            alert("Invitation sent successfully!");

        } catch (error) {
            console.error("Wizard Error:", error);
            alert("Failed to invite user: " + (error instanceof Error ? error.message : "Unknown error"));
        } finally {
            setLoading(false);
        }
    };

    // removed getOrgUserId logic as it is no longer needed


    const resetForm = () => {
        setStep("details");
        setFormData({ email: "", full_name: "", country: "Uganda", role: "employee" });
        setPlatformAdmin(false);
        setSelectedOrgIds([]);
        setOrgRoles({});
    };

    const isDetailsValid = formData.email && formData.full_name;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Create New User</DialogTitle>
                    <DialogDescription>
                        Step {step === "details" ? "1" : step === "platform" ? "2" : step === "org" ? "3" : "4"} of 4
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    {/* STEP 1: DETAILS */}
                    {step === "details" && (
                        <div className="grid gap-4">
                            <div className="space-y-2">
                                <Label>Full Name *</Label>
                                <Input
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                    placeholder="e.g. John Doe"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Email *</Label>
                                <Input
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="user@example.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Country</Label>
                                <Select
                                    value={formData.country}
                                    onValueChange={(val) => setFormData({ ...formData, country: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Uganda">Uganda</SelectItem>
                                        <SelectItem value="Kenya">Kenya</SelectItem>
                                        <SelectItem value="Tanzania">Tanzania</SelectItem>
                                        {/* Add more as needed */}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: PLATFORM */}
                    {step === "platform" && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Platform Admin Access</Label>
                                    <div className="text-sm text-muted-foreground">
                                        Grant this user administrative access to the layout platform?
                                    </div>
                                </div>
                                <Switch checked={platformAdmin} onCheckedChange={setPlatformAdmin} />
                            </div>

                            {platformAdmin && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                    <Label>Platform Role</Label>
                                    <Select value={platformRole} onValueChange={setPlatformRole}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="super_admin">Super Admin</SelectItem>
                                            <SelectItem value="support_admin">Support Admin</SelectItem>
                                            <SelectItem value="compliance">Compliance</SelectItem>
                                            <SelectItem value="billing">Billing</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 3: ORGS */}
                    {step === "org" && (
                        <div className="space-y-4 h-[300px] flex flex-col">
                            <div className="space-y-2">
                                <Label>Add to Organization(s)</Label>
                                <p className="text-xs text-muted-foreground">Select organizations to add this user to.</p>
                            </div>

                            <ScrollArea className="flex-1 border rounded-md p-2">
                                {tenants?.map(tenant => (
                                    <div key={tenant.id} className="mb-4 border-b pb-4 last:border-0">
                                        <div className="flex items-center space-x-2 mb-2">
                                            <input
                                                type="checkbox"
                                                id={`org - ${tenant.id} `}
                                                checked={selectedOrgIds.includes(tenant.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) setSelectedOrgIds([...selectedOrgIds, tenant.id]);
                                                    else setSelectedOrgIds(selectedOrgIds.filter(id => id !== tenant.id));
                                                }}
                                                className="h-4 w-4 rounded border-gray-300"
                                            />
                                            <Label htmlFor={`org - ${tenant.id} `} className="font-semibold">{tenant.name}</Label>
                                        </div>

                                        {selectedOrgIds.includes(tenant.id) && (
                                            <div className="ml-6 space-y-3 pl-2 border-l-2">
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="space-y-1">
                                                        <Label className="text-xs">Org Role</Label>
                                                        <Select
                                                            value={orgRoles[tenant.id] || "member"}
                                                            onValueChange={(val) => setOrgRoles({ ...orgRoles, [tenant.id]: val })}
                                                        >
                                                            <SelectTrigger className="h-8 text-xs">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="admin">Admin</SelectItem>
                                                                <SelectItem value="member">Member</SelectItem>
                                                                <SelectItem value="viewer">Viewer</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </ScrollArea>
                        </div>
                    )}

                    {/* STEP 4: REVIEW */}
                    {step === "review" && (
                        <div className="space-y-4">
                            <div className="rounded-md bg-muted p-4 space-y-2">
                                <div className="grid grid-cols-3 text-sm">
                                    <span className="font-medium text-muted-foreground">User:</span>
                                    <span className="col-span-2">{formData.full_name} ({formData.email})</span>
                                </div>
                                <div className="grid grid-cols-3 text-sm">
                                    <span className="font-medium text-muted-foreground">Platform:</span>
                                    <span className="col-span-2">
                                        {platformAdmin ? <Badge>Admin ({platformRole})</Badge> : "No Access"}
                                    </span>
                                </div>
                                <div className="grid grid-cols-3 text-sm">
                                    <span className="font-medium text-muted-foreground">Orgs:</span>
                                    <div className="col-span-2 flex flex-col gap-1">
                                        {selectedOrgIds.length === 0 && <span className="text-muted-foreground italic">None</span>}
                                        {selectedOrgIds.map(oid => {
                                            // Look up name
                                            const t = tenants?.find(x => x.id === oid);
                                            const r = orgRoles[oid] || "member";
                                            return (
                                                <div key={oid} className="flex items-center gap-2">
                                                    <span className="font-medium">{t?.name || oid}</span>
                                                    <Badge variant="outline" className="text-[10px]">{r}</Badge>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-4 border-t pt-4">
                                <div className="flex items-center justify-between">
                                    <Label>Send Invitation Email</Label>
                                    <Switch checked={sendInvite} onCheckedChange={setSendInvite} />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label>Set Status to Active</Label>
                                    <Switch checked={activateUser} onCheckedChange={setActivateUser} />
                                </div>
                            </div>
                        </div>
                    )}

                </div>

                <DialogFooter className="flex justify-between sm:justify-between">
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <div className="flex gap-2">
                        {step !== "details" && (
                            <Button variant="outline" onClick={prevStep} disabled={loading}>Back</Button>
                        )}
                        {step !== "review" ? (
                            <Button onClick={nextStep} disabled={!isDetailsValid}>Next</Button>
                        ) : (
                            <Button onClick={handleSubmit} disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Create User
                            </Button>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
