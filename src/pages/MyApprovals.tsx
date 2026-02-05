import { useEffect, useState } from "react";
import { format } from "date-fns";
import { workflowService } from "@/lib/services/workflow.service";
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
import { Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";

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

        setSubmitting(true);
        try {
            if (actionType === 'approve') {
                await workflowService.approvePayrunStep(selectedStep.id, comments);
                toast({ title: "Approved", description: "Pay run step approved successfully." });
            } else {
                await workflowService.rejectPayrunStep(selectedStep.id, comments);
                toast({ title: "Rejected", description: "Pay run step rejected." });
            }

            // Close dialog and reload
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
                                <CheckCircle2 className="h-12 w-12 mb-4 text-green-100 fill-green-600 opacity-20" />
                                <p>No {activeTab} approvals found.</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4">
                            {approvals.map((step) => (
                                <Card key={step.id}>
                                    <CardHeader className="pb-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <CardTitle className="text-lg">
                                                    {step.step_name}
                                                </CardTitle>
                                                <CardDescription>
                                                    Pay Run: {format(new Date(step.pay_run.period_start), 'MMM d, yyyy')} - {format(new Date(step.pay_run.period_end), 'MMM d, yyyy')}
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
                                        <div className="flex justify-between items-end">
                                            <div className="text-sm text-muted-foreground space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <Clock className="h-4 w-4" />
                                                    Received: {format(new Date(step.created_at), 'PPP p')}
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
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* Action Dialog */}
            <Dialog open={!!selectedStep} onOpenChange={(open) => !open && setSelectedStep(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {actionType === 'approve' ? 'Approve Request' : 'Reject Request'}
                        </DialogTitle>
                        <DialogDescription>
                            {actionType === 'approve'
                                ? "Are you sure you want to approve this step? You can optionally add comments."
                                : "Please provide a reason for rejecting this request."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Comments {actionType === 'reject' && '*'}</label>
                            <Textarea
                                value={comments}
                                onChange={(e) => setComments(e.target.value)}
                                placeholder={actionType === 'approve' ? "Optional approval notes..." : "Reason for rejection..."}
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
