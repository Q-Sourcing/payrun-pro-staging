import React from 'react';
import { Button } from "@/components/ui/button";
import { ArrowLeft, LucideIcon } from "lucide-react";

interface AdvancedSettingsLayoutProps {
    title: string;
    description: string;
    icon: LucideIcon;
    onBack: () => void;
    children: React.ReactNode;
    subtitle?: string;
}

export const AdvancedSettingsLayout: React.FC<AdvancedSettingsLayoutProps> = ({
    title,
    description,
    icon: Icon,
    onBack,
    children,
    subtitle = "Advanced"
}) => {
    return (
        <div className="min-h-full bg-white animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="max-w-7xl mx-auto p-8 lg:p-12 space-y-8">
                {/* 1. Breadcrumbs */}
                <div className="flex items-center gap-2 text-sm text-slate-500 whitespace-nowrap">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-1 hover:text-slate-900 transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Settings
                    </button>
                    <span className="opacity-40">/</span>
                    <span>{title}</span>
                    <span className="opacity-40">/</span>
                    <span className="text-slate-900 font-bold">{subtitle}</span>
                </div>

                {/* 2. Page Header */}
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <Icon className="h-8 w-8 text-[#0d9488]" />
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{title} {subtitle}</h1>
                    </div>
                    <p className="text-slate-500 text-lg max-w-3xl">
                        {description}
                    </p>
                </div>

                {/* 3. Content Rail */}
                <div className="max-w-4xl">
                    {children}
                </div>

                {/* 4. Footer Spacing / Safety */}
                <div className="h-12" />
            </div>
        </div>
    );
};
