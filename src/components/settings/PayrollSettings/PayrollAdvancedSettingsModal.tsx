import React from 'react';
import { Button } from "@/components/ui/button";
import {
    ArrowLeft,
    Settings,
    FileCheck,
    Lock,
    Shield,
    FileText
} from "lucide-react";
import PayrollAdvancedSettings from "@/pages/PayrollAdvancedSettings";

interface PayrollAdvancedSettingsModalProps {
    open: boolean;
    onClose: () => void;
}

export const PayrollAdvancedSettingsModal: React.FC<PayrollAdvancedSettingsModalProps> = ({ open, onClose }) => {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-white animate-in fade-in duration-200 overflow-y-auto">
            <PayrollAdvancedSettings isEmbedded={true} onBack={onClose} />
        </div>
    );
};
