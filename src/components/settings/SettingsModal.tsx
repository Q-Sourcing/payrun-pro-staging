import { SettingsContent } from "./SettingsContent";
import { ArrowLeft, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface SettingsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAdvancedModeChange?: (isAdvanced: boolean, mode: 'payroll' | 'org' | null) => void;
}

export const SettingsModal = ({ open, onOpenChange, onAdvancedModeChange }: SettingsModalProps) => {
    if (!open) return null;

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    className="fixed inset-0 z-50 bg-background flex flex-col"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 12 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                >
                    {/* Top Bar */}
                    <header className="flex-shrink-0 h-14 border-b border-border bg-background flex items-center justify-between px-5">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => onOpenChange(false)}
                                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                <span>Back</span>
                            </button>
                            <div className="h-5 w-px bg-border" />
                            <div>
                                <h1 className="text-lg font-semibold text-foreground">Settings</h1>
                            </div>
                        </div>
                        <button
                            onClick={() => onOpenChange(false)}
                            className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            aria-label="Close settings"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </header>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 lg:p-8">
                        <div className="max-w-6xl mx-auto">
                            <SettingsContent onAdvancedModeChange={onAdvancedModeChange} />
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
