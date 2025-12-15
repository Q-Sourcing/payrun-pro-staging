import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Clock, User, ArrowRight } from "lucide-react";
import { PayrunApprovalStep } from "@/lib/types/workflow";
import { PayrunsService } from "@/lib/services/payruns.service";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ApprovalTimelineProps {
    payrunId: string;
    refreshTrigger?: number; // To force refresh
}

export const ApprovalTimeline = ({ payrunId, refreshTrigger }: ApprovalTimelineProps) => {
    const [steps, setSteps] = useState<PayrunApprovalStep[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSteps();
    }, [payrunId, refreshTrigger]);

    const loadSteps = async () => {
        try {
            const data = await PayrunsService.getApprovalSteps(payrunId);
            setSteps(data);
        } catch (error) {
            console.error("Failed to load approval steps", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="text-sm text-muted-foreground p-4">Loading approval history...</div>;

    if (steps.length === 0) return null;

    return (
        <div className="border rounded-md p-4 bg-muted/10">
            <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Approval Timeline</h3>
            <div className="relative space-y-6 pl-2">
                {/* Vertical Line */}
                <div className="absolute left-[19px] top-2 bottom-4 w-0.5 bg-border -z-10" />

                {steps.map((step, index) => {
                    let Icon = Clock;
                    let colorClass = "text-muted-foreground bg-muted";
                    let borderColor = "border-muted";

                    if (step.status === 'approved') {
                        Icon = CheckCircle2;
                        colorClass = "text-green-600 bg-green-100";
                        borderColor = "border-green-200";
                    } else if (step.status === 'rejected') {
                        Icon = XCircle;
                        colorClass = "text-red-600 bg-red-100";
                        borderColor = "border-red-200";
                    } else if (step.status === 'pending') {
                        // If it's the current pending one (first pending)
                        const isCurrent = steps.findIndex(s => s.status === 'pending') === index;
                        if (isCurrent) {
                            colorClass = "text-blue-600 bg-blue-100";
                            borderColor = "border-blue-200";
                        }
                    }

                    return (
                        <div key={step.id} className="flex gap-4 items-start relative bg-background p-3 rounded-lg border shadow-sm">
                            <div className={`rounded-full p-2 border ${borderColor} ${colorClass} shrink-0`}>
                                <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 space-y-1">
                                <div className="flex justify-between items-start">
                                    <div className="font-medium text-sm">
                                        Level {step.level}
                                        {step.approver && (
                                            <span className="text-muted-foreground ml-2 font-normal">
                                                • {step.approver.first_name} {step.approver.last_name}
                                            </span>
                                        )}
                                    </div>
                                    <Badge variant={step.status === 'approved' ? 'default' : step.status === 'rejected' ? 'destructive' : 'outline'}>
                                        {step.status}
                                    </Badge>
                                </div>

                                {step.actioned_at && (
                                    <div className="text-xs text-muted-foreground">
                                        {format(new Date(step.actioned_at), "MMM d, yyyy 'at' h:mm a")}
                                        {step.actioned_by_user && (
                                            <span> by {step.actioned_by_user.first_name} {step.actioned_by_user.last_name}</span>
                                        )}
                                    </div>
                                )}

                                {step.delegated_by && (
                                    <div className="text-xs text-orange-600 flex items-center gap-1 bg-orange-50 p-1 rounded w-fit">
                                        <ArrowRight className="h-3 w-3" />
                                        Delegated by {step.delegated_by_user?.first_name}
                                    </div>
                                )}

                                {step.comments && (
                                    <div className="text-sm bg-muted/50 p-2 rounded italic text-muted-foreground mt-2">
                                        "{step.comments}"
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
