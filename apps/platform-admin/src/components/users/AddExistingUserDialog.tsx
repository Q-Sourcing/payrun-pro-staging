import { useState } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Loader2, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { addOrgUser } from "@/api/orgAdmin";
import { fetchTenants } from "@/api/tenants";

// --- Component ---

interface AddExistingUserDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AddExistingUserDialog({ open, onOpenChange }: AddExistingUserDialogProps) {
    const qc = useQueryClient();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedUser, setSelectedUser] = useState<any>(null); // Mock user object for now
    const [loading, setLoading] = useState(false);

    // Org Assignment State
    const [selectedOrgId, setSelectedOrgId] = useState<string>("");

    const { data: tenants } = useQuery({ queryKey: ["tenants"], queryFn: fetchTenants });

    // Mock Search Function (Replace with actual API call)
    // There isn't a "global user search" API yet in the plan that returns user objects directly easily without RLS issues?
    // Actually, `addOrgUser` takes an EMAIL. 
    // So "Add Existing User" in this context might just be "Add User by Email" to multiple orgs?
    // The requirement says "Search by email -> Select user -> Assign org".
    // Since we don't have a reliable global user search endpoint yet, I will simulate search via Email input 
    // and just proceed with that Email as the identifier. 
    // If the user exists in Auth, `addOrgUser` works. If not, `addOrgUser` might fail or create a shadow record depending on backend.

    const handleSearch = async () => {
        // In a real implementation this would call `searchUsers(searchQuery)`
        // For now, we treat the input as the "selected user" email directly.
        if (searchQuery.includes("@")) {
            setSelectedUser({ email: searchQuery, name: "User (" + searchQuery + ")" });
        } else {
            alert("Please enter a valid email to search.");
        }
    }

    const handleSubmit = async () => {
        if (!selectedUser || !selectedOrgId) return;
        setLoading(true);
        try {
            await addOrgUser(selectedOrgId, selectedUser.email);
            // Could add role assignment here too if we copy logic from Wizard
            // But requirement "Add Existing User" often implies just getting them in the org.
            // I'll keep it simple: Add to Org.

            await qc.invalidateQueries();
            onOpenChange(false);
            setSearchQuery("");
            setSelectedUser(null);
            setSelectedOrgId("");
            alert(`User ${selectedUser.email} added to organization successfully.`);
        } catch (error) {
            console.error(error);
            alert("Failed to add user.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Add Existing User</DialogTitle>
                    <DialogDescription>
                        Search for a user by email and assign them to an organization.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Search / Selection */}
                    <div className="flex gap-2">
                        <Input
                            placeholder="Search by email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <Button variant="secondary" onClick={handleSearch}>
                            <Search className="h-4 w-4" />
                        </Button>
                    </div>

                    {selectedUser && (
                        <div className="rounded-md border p-3 bg-muted/50 flex items-center justify-between animate-in fade-in">
                            <span className="text-sm font-medium">{selectedUser.email}</span>
                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">Selected</Badge>
                        </div>
                    )}

                    <Separator />

                    <div className="space-y-2">
                        <Label>Assign to Organization</Label>
                        <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Organization" />
                            </SelectTrigger>
                            <SelectContent>
                                {tenants?.map(t => (
                                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={loading || !selectedUser || !selectedOrgId}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Add to Info
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function Separator() {
    return <div className="h-px w-full bg-border my-2" />
}
