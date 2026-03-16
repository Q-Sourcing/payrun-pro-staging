import { useEffect, useState } from "react";
import { format } from "date-fns";
import { workflowService } from "@/lib/services/workflow.service";
import { PayrunsService } from "@/lib/services/payruns.service";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, CheckCircle2, Clock, Users, DollarSign } from "lucide-react";

export default function MyApprovals() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [approvals, setApprovals] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState("pending");

    // Action states
    const [selectedStep, setSelectedStep] = useState<any>(null);
    const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
    const [comments, setComments] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const loadApprovals = async () => {
        setLoading(true);
        try {
            const data = await workflowService.getMyApprovals(activeTab as any);
            setApprovals(data);
        } catch (error) {
            console.error(error);
            toast({
                title: "Error",
                description: "Failed to load approvals",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadApprovals();
    }, [activeTab]);

    const handleAction = (step: any, type: 'approve' | 'reject') => {
        setSelectedStep(step);
        setActionType(type);
        setComments("");
    };

    const submitAction = async () => {
        if (!selectedStep || !actionType) return;

        // Use payrun_id (not step id) — the RPCs operate at the payrun level
        const payrunId = selectedStep.payrun_id || selectedStep.pay_run?.id;
        if (!payrunId) {
            toast({ title: "Error", description: "Cannot find payrun ID", variant: "destructive" });
            return;
        }

        setSubmitting(true);
        try {
            if (actionType === 'approve') {
                await PayrunsService.approveStep(payrunId, comments);
                toast({ title: "Approved", description: "Pay run step approved successfully." });
            } else {
                if (!comments.trim()) {
                    toast({ title: "Required", description: "Please provide a rejection reason.", variant: "destructive" });
                    setSubmitting(false);
                    return;
                }
                await PayrunsService.rejectStep(payrunId, comments);
                toast({ title: "Rejected", description: "Pay run step rejected." });
            }

            setSelectedStep(null);
            setActionType(null);
            loadApprovals();
        } catch (error: any) {
            console.error(error);
            toast({
                title: "Error",
                description: error.message || "Failed to process action",
                variant: "destructive"
            });
        } finally {
            setSubmitting(false);
        }
    };

    const formatCurrency = (amount: number | null | undefined) => {
        if (!amount) return "—";
        return new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(amount);
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">My Approvals</h1>
                <p className="text-muted-foreground">Manage your pending payroll approval tasks.</p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList>
                    <TabsTrigger value="pending">Pending</TabsTrigger>
                    <TabsTrigger value="approved">Approved</TabsTrigger>
                    <TabsTrigger value="rejected">Rejected</TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="mt-6">
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : approvals.length === 0 ? (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                                <CheckCircle2 className="h-12 w-12 mb-4 opacity-20" />
                                <p>No {activeTab} approvals found.</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4">
                            {approvals.map((step) => {
                                const payrun = step.pay_run;
                                const periodStart = payrun?.pay_period_start
                                    ? format(new Date(payrun.pay_period_start), 'MMM d, yyyy')
                                    : '—';
                                const periodEnd = payrun?.pay_period_end
                                    ? format(new Date(payrun.pay_period_end), 'MMM d, yyyy')
                                    : '—';

                                return (
                                    <Card key={step.id}>
                                        <CardHeader className="pb-3">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <CardTitle className="text-lg">
                                                        Pay Period: {periodStart} – {periodEnd}
                                                    </CardTitle>
                                                    <CardDescription>
                                                        Step Level {step.level} · Submitted {step.created_at ? format(new Date(step.created_at), 'PPP') : '—'}
                                                    </CardDescription>
                                                </div>
                                                <Badge variant={
                                                    step.status === 'pending' ? 'outline' :
                                                        step.status === 'rejected' ? 'destructive' : 'default'
                                                }>
                                                    {step.status}
                                                </Badge>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                                                {payrun?.total_gross != null && (
                                                    <div className="flex items-center gap-2 text-muted-foreground">
                                                        <DollarSign className="h-4 w-4" />
                                                        <span>Total Gross: <strong className="text-foreground">{formatCurrency(payrun.total_gross)}</strong></span>
                                                    </div>
                                                )}
                                                {payrun?.pay_group_name && (
                                                    <div className="flex items-center gap-2 text-muted-foreground">
                                                        <Users className="h-4 w-4" />
                                                        <span>Pay Group: <strong className="text-foreground">{payrun.pay_group_name}</strong></span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex justify-between items-end">
                                                <div className="text-sm text-muted-foreground space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <Clock className="h-4 w-4" />
                                                        Received: {step.created_at ? format(new Date(step.created_at), 'PPP p') : '—'}
                                                    </div>
                                                    {step.comments && (
                                                        <div className="mt-2 p-2 bg-muted rounded text-xs">
                                                            <strong>Comments:</strong> {step.comments}
                                                        </div>
                                                    )}
                                                </div>

                                                {activeTab === 'pending' && (
                                                    <div className="flex gap-2">
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            onClick={() => handleAction(step, 'reject')}
                                                        >
                                                            Reject
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleAction(step, 'approve')}
                                                        >
                                                            Approve
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* Action Dialog */}
            <Dialog open={!!selectedStep} onOpenChange={(open) => !open && setSelectedStep(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {actionType === 'approve' ? 'Approve Pay Run' : 'Reject Pay Run'}
                        </DialogTitle>
                        <DialogDescription>
                            {actionType === 'approve'
                                ? "Are you sure you want to approve this step? You can optionally add comments."
                                : "Please provide a reason for rejecting this request."}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedStep && (
                        <div className="py-2 px-1 bg-muted/50 rounded-md text-sm space-y-1">
                            <p><strong>Period:</strong> {
                                selectedStep.pay_run?.pay_period_start
                                    ? `${format(new Date(selectedStep.pay_run.pay_period_start), 'MMM d, yyyy')} – ${format(new Date(selectedStep.pay_run.pay_period_end), 'MMM d, yyyy')}`
                                    : '—'
                            }</p>
                            {selectedStep.pay_run?.total_gross && (
                                <p><strong>Total Gross:</strong> {new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(selectedStep.pay_run.total_gross)}</p>
                            )}
                            <p><strong>Approval Level:</strong> {selectedStep.level}</p>
                        </div>
                    )}

                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                Comments {actionType === 'reject' && <span className="text-destructive">*</span>}
                            </label>
                            <Textarea
                                value={comments}
                                onChange={(e) => setComments(e.target.value)}
                                placeholder={actionType === 'approve' ? "Optional approval notes..." : "Reason for rejection (required)..."}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedStep(null)} disabled={submitting}>
                            Cancel
                        </Button>
                        <Button
                            variant={actionType === 'reject' ? "destructive" : "default"}
                            onClick={submitAction}
                            disabled={submitting || (actionType === 'reject' && !comments.trim())}
                        >
                            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {actionType === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
