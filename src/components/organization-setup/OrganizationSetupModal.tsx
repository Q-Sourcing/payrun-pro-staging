import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
    Building2,
    MapPin,
    Users,
    Settings as SettingsIcon,
    ArrowLeft,
    ChevronDown,
    ChevronRight,
    Briefcase,
    Layers,
    Globe,
    Plus,
    Info,
    ShieldCheck
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmployeeCategoriesTab } from './EmployeeCategoriesTab';
import { CompanyUnitsTab } from './CompanyUnitsTab';

interface OrganizationSetupModalProps {
    open: boolean;
    onClose: () => void;
}

export const OrganizationSetupModal: React.FC<OrganizationSetupModalProps> = ({ open, onClose }) => {
    const [activeTab, setActiveTab] = useState('company_units');
    const [expandedGroups, setExpandedGroups] = useState<string[]>(['org_structure']);

    if (!open) return null;

    const toggleGroup = (group: string) => {
        setExpandedGroups(prev =>
            prev.includes(group) ? prev.filter(g => g !== group) : [...prev, group]
        );
    };

    const navItems = [
        { id: 'details', label: 'Organization Details', icon: InfoIcon },
        { id: 'policy', label: 'Organization Policy', icon: ShieldCheckIcon },
        {
            id: 'org_structure',
            label: 'Organization Structure',
            icon: Layers,
            isGroup: true,
            children: [
                { id: 'configuration', label: 'Configuration' },
                { id: 'company', label: 'Company' },
                { id: 'company_units', label: 'Company Units' },
                { id: 'division', label: 'Division' },
                { id: 'manage_structure', label: 'Manage Structure' }
            ]
        },
        { id: 'categories', label: 'Employee Categories', icon: Users },
        { id: 'locations', label: 'Locations', icon: MapPin },
        { id: 'departments', label: 'Departments', icon: Briefcase },
        { id: 'designations', label: 'Designations', icon: Users },
    ];

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-white animate-in fade-in duration-200 overflow-y-auto">
            <div className="flex-1 p-12">
                <div className="max-w-7xl mx-auto">
                    {/* Breadcrumbs (Secondary) */}
                    <div className="mb-6 flex items-center gap-2 text-sm text-slate-500 whitespace-nowrap overflow-x-auto pb-2 sm:pb-0">
                        <button
                            onClick={onClose}
                            className="flex items-center gap-1 hover:text-slate-900 transition-colors"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to Settings
                        </button>
                        <span className="opacity-40">/</span>
                        <span>Organization Settings</span>
                        <span className="opacity-40">/</span>
                        <span className="text-slate-900 font-bold">Setup</span>
                    </div>

                    <div className="mb-8">
                        <div className="flex items-center gap-3 mb-2">
                            <Building2 className="h-8 w-8 text-[#0d9488]" />
                            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Organization Setup</h1>
                        </div>
                        <p className="text-slate-500 text-lg max-w-3xl">
                            Configure your organization structure, units, and employee categories for precise payroll management.
                        </p>
                    </div>

                    {/* Tabs Interface */}
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                        <div className="bg-[#f1f5f9] p-1.5 rounded-xl inline-flex w-full sm:w-auto">
                            <TabsList className="bg-transparent h-auto p-0 gap-1 flex-wrap sm:flex-nowrap justify-start">
                                <TabsTrigger
                                    value="company_units"
                                    className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm py-2.5 px-5 rounded-lg flex items-center gap-2 transition-all"
                                >
                                    <Layers className="h-4 w-4" />
                                    Company Units
                                </TabsTrigger>
                                <TabsTrigger
                                    value="categories"
                                    className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm py-2.5 px-5 rounded-lg flex items-center gap-2 transition-all"
                                >
                                    <Users className="h-4 w-4" />
                                    Employee Categories
                                </TabsTrigger>
                                <TabsTrigger
                                    value="locations"
                                    className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm py-2.5 px-5 rounded-lg flex items-center gap-2 transition-all"
                                >
                                    <MapPin className="h-4 w-4" />
                                    Locations
                                </TabsTrigger>
                                <TabsTrigger
                                    value="departments"
                                    className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm py-2.5 px-5 rounded-lg flex items-center gap-2 transition-all"
                                >
                                    <Briefcase className="h-4 w-4" />
                                    Departments
                                </TabsTrigger>
                                <TabsTrigger
                                    value="designations"
                                    className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm py-2.5 px-5 rounded-lg flex items-center gap-2 transition-all"
                                >
                                    <Users className="h-4 w-4" />
                                    Designations
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        {/* Tab Content */}
                        <div className="mt-8">
                            <TabsContent value="categories" className="mt-0 focus-visible:outline-none">
                                <EmployeeCategoriesTab />
                            </TabsContent>

                            <TabsContent value="company_units" className="mt-0 focus-visible:outline-none">
                                <CompanyUnitsTab />
                            </TabsContent>

                            {/* Coming Soon Fallback for other tabs */}
                            {['locations', 'departments', 'designations', 'details', 'policy'].includes(activeTab) && (
                                <TabsContent value={activeTab} className="mt-0">
                                    <div className="flex flex-col items-center justify-center p-16 bg-white rounded-xl shadow-sm border-2 border-dashed">
                                        <SettingsIcon className="h-12 w-12 text-slate-300 mb-4 animate-spin-slow" />
                                        <h3 className="text-xl font-bold text-slate-900 mb-2">Coming Soon</h3>
                                        <p className="text-slate-500 text-center max-w-sm">
                                            The <span className="font-semibold text-slate-700 capitalize">{activeTab.replace('_', ' ')}</span> module is currently under development to improve your organization management experience.
                                        </p>
                                    </div>
                                </TabsContent>
                            )}
                        </div>
                    </Tabs>
                </div>
            </div>
        </div>
    );
};

const InfoIcon = (props: any) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-info"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
);

const ShieldCheckIcon = (props: any) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-shield-check"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" /><path d="m9 12 2 2 4-4" /></svg>
);
