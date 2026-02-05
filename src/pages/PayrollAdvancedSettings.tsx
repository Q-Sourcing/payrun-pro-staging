import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Settings, Lock, Shield, FileCheck } from "lucide-react";
import { ApprovalWorkflows } from "@/components/settings/PayrollSettings/ApprovalWorkflows";

export default function PayrollAdvancedSettings({
    isEmbedded = false,
    onBack
}: {
    isEmbedded?: boolean;
    onBack?: () => void;
}) {
    const navigate = useNavigate();
    const handleBack = () => {
        if (onBack) {
            onBack();
        } else {
            navigate(-1);
        }
    };
    const [activeTab, setActiveTab] = useState("approvals");

    if (isEmbedded) {
        return (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
                <div className="bg-[#f1f5f9] p-1.5 rounded-xl inline-flex">
                    <TabsList className="bg-transparent h-auto p-0 gap-1 flex-wrap sm:flex-nowrap">
                        <TabsTrigger
                            value="approvals"
                            className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm py-2.5 px-5 rounded-lg flex items-center gap-2 transition-all"
                        >
                            <Lock className="h-4 w-4" />
                            Approvals
                        </TabsTrigger>
                        <TabsTrigger
                            value="security"
                            className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm py-2.5 px-5 rounded-lg flex items-center gap-2 transition-all"
                        >
                            <Shield className="h-4 w-4" />
                            Security
                        </TabsTrigger>
                        <TabsTrigger
                            value="audit"
                            className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm py-2.5 px-5 rounded-lg flex items-center gap-2 transition-all"
                        >
                            <FileCheck className="h-4 w-4" />
                            Audit Logs
                        </TabsTrigger>
                    </TabsList>
                </div>

                <div className="mt-0">
                    <TabsContent value="approvals" className="mt-0 focus-visible:outline-none">
                        <ApprovalWorkflows />
                    </TabsContent>

                    <TabsContent value="security" className="mt-0">
                        <div className="py-24 text-center text-slate-500 border-2 border-dashed rounded-2xl bg-slate-50/50">
                            <Shield className="h-12 w-12 mx-auto mb-4 opacity-20" />
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Security Settings</h3>
                            <p>Advanced security controls are coming soon.</p>
                        </div>
                    </TabsContent>

                    <TabsContent value="audit" className="mt-0">
                        <div className="py-24 text-center text-slate-500 border-2 border-dashed rounded-2xl bg-slate-50/50">
                            <FileCheck className="h-12 w-12 mx-auto mb-4 opacity-20" />
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Payroll Audit Logs</h3>
                            <p>Comprehensive audit trails are coming soon.</p>
                        </div>
                    </TabsContent>
                </div>
            </Tabs>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            <div className="max-w-7xl mx-auto p-8 lg:p-12 space-y-8">
                {/* 1. Breadcrumbs */}
                <div className="flex items-center gap-2 text-sm text-slate-500">
                    <button
                        onClick={handleBack}
                        className="flex items-center gap-1 hover:text-slate-900 transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Settings
                    </button>
                    <span className="opacity-40">/</span>
                    <span>Payroll Settings</span>
                    <span className="opacity-40">/</span>
                    <span className="text-slate-900 font-bold">Advanced</span>
                </div>

                {/* 2. Page Header */}
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <Settings className="h-8 w-8 text-[#0d9488]" />
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Payroll Advanced Settings</h1>
                    </div>
                    <p className="text-slate-500 text-lg max-w-3xl">
                        Configure advanced payroll features including approvals, locks, overrides, and compliance settings.
                    </p>
                </div>

                {/* 3. Tabs & Content Container (The Stack) */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
                    <div className="bg-[#f1f5f9] p-1.5 rounded-xl inline-flex">
                        <TabsList className="bg-transparent h-auto p-0 gap-1 flex-wrap sm:flex-nowrap">
                            <TabsTrigger
                                value="approvals"
                                className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm py-2.5 px-5 rounded-lg flex items-center gap-2 transition-all"
                            >
                                <Lock className="h-4 w-4" />
                                Approvals
                            </TabsTrigger>
                            <TabsTrigger
                                value="security"
                                className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm py-2.5 px-5 rounded-lg flex items-center gap-2 transition-all"
                            >
                                <Shield className="h-4 w-4" />
                                Security
                            </TabsTrigger>
                            <TabsTrigger
                                value="audit"
                                className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm py-2.5 px-5 rounded-lg flex items-center gap-2 transition-all"
                            >
                                <FileCheck className="h-4 w-4" />
                                Audit Logs
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <div className="max-w-4xl">
                        <TabsContent value="approvals" className="mt-0 focus-visible:outline-none">
                            <ApprovalWorkflows />
                        </TabsContent>

                        <TabsContent value="security" className="mt-0">
                            <div className="py-24 text-center text-slate-500 border-2 border-dashed rounded-2xl bg-slate-50/50">
                                <Shield className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                <h3 className="text-xl font-bold text-slate-900 mb-2">Security Settings</h3>
                                <p>Advanced security controls are coming soon.</p>
                            </div>
                        </TabsContent>

                        <TabsContent value="audit" className="mt-0">
                            <div className="py-24 text-center text-slate-500 border-2 border-dashed rounded-2xl bg-slate-50/50">
                                <FileCheck className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                <h3 className="text-xl font-bold text-slate-900 mb-2">Payroll Audit Logs</h3>
                                <p>Comprehensive audit trails are coming soon.</p>
                            </div>
                        </TabsContent>
                    </div>
                </Tabs>

                <div className="pt-8 border-t flex justify-end">
                    <button
                        onClick={handleBack}
                        className="text-slate-500 hover:text-slate-900 text-sm font-medium"
                    >
                        Back to Settings
                    </button>
                </div>
            </div>
        </div>
    );
}
