import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Loader2,
    Copy,
    CheckCircle2,
    Calendar,
    Users,
    Building2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { HeadOfficePayGroupsService } from '@/lib/services/headOfficePayGroups.service';
import type { HeadOfficePayGroup, HeadOfficePayGroupRefType } from '@/lib/types/paygroups';

interface CloneHeadOfficePayGroupDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
    sourceGroup: HeadOfficePayGroup & { employee_type: HeadOfficePayGroupRefType };
}

export const CloneHeadOfficePayGroupDialog: React.FC<CloneHeadOfficePayGroupDialogProps> = ({
    open,
    onOpenChange,
    onSuccess,
    sourceGroup,
}) => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        period_start: '',
        period_end: '',
        copyMembers: true,
        copyUnits: true
    });

    const handleClone = async () => {
        if (!formData.period_start || !formData.period_end) {
            toast({
                title: 'Missing Dates',
                description: 'Please select start and end dates for the new period.',
                variant: 'destructive'
            });
            return;
        }

        setLoading(true);
        try {
            await HeadOfficePayGroupsService.clonePayGroup(
                sourceGroup.id,
                sourceGroup.employee_type,
                { start: formData.period_start, end: formData.period_end },
                { copyMembers: formData.copyMembers, copyUnits: formData.copyUnits }
            );

            toast({
                title: 'Success',
                description: `Successfully cloned ${sourceGroup.name} to a new period.`,
            });
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Failed to clone paygroup.',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] glass-morphism rounded-3xl border-none p-0 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-emerald-50/50 -z-10" />

                <DialogHeader className="p-8 border-b bg-white/40 backdrop-blur-md">
                    <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                        <Copy className="w-6 h-6 text-blue-600" />
                        Clone Paygroup
                    </DialogTitle>
                    <DialogDescription className="mt-2">
                        Roll over <span className="font-semibold text-gray-900">{sourceGroup.name}</span> to a new payroll period.
                    </DialogDescription>
                </DialogHeader>

                <div className="p-8 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                New Period Start
                            </Label>
                            <Input
                                type="date"
                                value={formData.period_start}
                                onChange={e => setFormData(prev => ({ ...prev, period_start: e.target.value }))}
                                className="rounded-xl border-gray-200 h-12 focus:ring-blue-500 shadow-sm"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                New Period End
                            </Label>
                            <Input
                                type="date"
                                value={formData.period_end}
                                onChange={e => setFormData(prev => ({ ...prev, period_end: e.target.value }))}
                                className="rounded-xl border-gray-200 h-12 focus:ring-blue-500 shadow-sm"
                            />
                        </div>
                    </div>

                    <div className="space-y-4 bg-white/40 p-6 rounded-2xl border border-white/60 shadow-inner">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                                    <Users className="w-4 h-4" />
                                </div>
                                <div className="space-y-0.5">
                                    <Label className="text-sm font-bold cursor-pointer" htmlFor="copy-members">Copy Members</Label>
                                    <p className="text-[10px] text-muted-foreground">Carry over current employee assignments.</p>
                                </div>
                            </div>
                            <Checkbox
                                id="copy-members"
                                checked={formData.copyMembers}
                                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, copyMembers: !!checked }))}
                                className="rounded-md h-5 w-5 border-gray-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-transparent"
                            />
                        </div>

                        <div className="h-px bg-white/60" />

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600">
                                    <Building2 className="w-4 h-4" />
                                </div>
                                <div className="space-y-0.5">
                                    <Label className="text-sm font-bold cursor-pointer" htmlFor="copy-units">Copy Company Units</Label>
                                    <p className="text-[10px] text-muted-foreground">Carry over associated organization tags.</p>
                                </div>
                            </div>
                            <Checkbox
                                id="copy-units"
                                checked={formData.copyUnits}
                                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, copyUnits: !!checked }))}
                                className="rounded-md h-5 w-5 border-gray-300 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-transparent"
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-8 border-t bg-white/40 backdrop-blur-md">
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        className="rounded-2xl h-12 px-6 text-gray-500"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleClone}
                        disabled={loading}
                        className="rounded-2xl h-12 px-8 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95 flex-1 sm:flex-none"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
                        Confirm & Clone
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
