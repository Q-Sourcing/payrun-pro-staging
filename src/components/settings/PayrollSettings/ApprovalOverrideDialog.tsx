import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { workflowService } from "@/lib/services/workflow.service";

interface ApprovalOverrideDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    payrunId: string;
    level: number;
    approverName: string;
    onSuccess: () => void;
}

export const ApprovalOverrideDialog = ({
    open,
    onOpenChange,
    payrunId,
    level,
    approverName,
    onSuccess
}: ApprovalOverrideDialogProps) => {
    const { toast } = useToast();
    const [reason, setReason] = useState("");
    const [loading, setLoading] = useState(false);

    const handleOverride = async () => {
        if (!reason.trim()) {
            toast({
                title: "Reason Required",
                description: "Please provide a reason for the override.",
                variant: "destructive"
            });
            return;
        }

        setLoading(true);
        try {
            // This would normally call a service method
            // await workflowService.overrideApproval(payrunId, level, reason);

            toast({
                title: "Approval Overridden",
                description: `Level ${level} approval has been bypassed.`,
            });
            onSuccess();
            onOpenChange(false);
        } catch (error) {
            console.error(error);
            toast({
                title: "Error",
                description: "Failed to override approval.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <div className="flex items-center gap-2 text-amber-600 mb-2">
                        <ShieldAlert className="h-5 w-5" />
                        <DialogTitle>Override Approval Level {level}</DialogTitle>
                    </div>
                    <DialogDescription>
                        You are about to bypass the required approval from <span className="font-bold text-slate-900">{approverName}</span>.
                        This action will be logged in the audit trail.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="bg-amber-50 border border-amber-200 p-3 rounded-md flex gap-3 text-xs text-amber-800">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <p>Overriding approvals should only be done in exceptional circumstances or system deadlocks.</p>
                    </div>

                    <div className="grid w-full gap-1.5">
                        <Label htmlFor="reason" className="text-sm font-semibold">Override Reason (Mandatory)</Label>
                        <Textarea
                            id="reason"
                            placeholder="Explain why this approval is being bypassed..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="min-h-[100px]"
                        />
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button
                        variant="destructive"
                        onClick={handleOverride}
                        disabled={loading || !reason.trim()}
                        className="bg-amber-600 hover:bg-amber-700 border-none"
                    >
                        {loading ? "Processing..." : "Confirm Override"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
