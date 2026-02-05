import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SettingsContent } from "./SettingsContent";
import { X } from "lucide-react";

interface SettingsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAdvancedModeChange?: (isAdvanced: boolean, mode: 'payroll' | 'org' | null) => void;
}

export const SettingsModal = ({ open, onOpenChange, onAdvancedModeChange }: SettingsModalProps) => {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[1200px] w-[95vw] md:w-[75vw] max-h-[90vh] overflow-y-auto p-0 gap-0">
                <DialogHeader className="p-6 pb-0 flex flex-row items-center justify-between sticky top-0 bg-background z-10">
                    <div>
                        <DialogTitle className="text-3xl font-bold">Settings</DialogTitle>
                        <p className="text-muted-foreground mt-1">Manage your Q-Payroll preferences and configuration</p>
                    </div>
                    <button
                        onClick={() => onOpenChange(false)}
                        className="rounded-full p-2 hover:bg-slate-100 transition-colors"
                        aria-label="Close"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </DialogHeader>

                <div className="p-6">
                    <SettingsContent onAdvancedModeChange={onAdvancedModeChange} />
                </div>
            </DialogContent>
        </Dialog>
    );
};
