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
        <div className="fixed inset-0 z-50 flex flex-col bg-background animate-in fade-in duration-200">
            {/* Top Header */}
            <div className="bg-[#1e293b] text-white h-16 flex items-center px-4 justify-between">
                <div className="flex items-center space-x-4">
                    <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-slate-700">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="flex items-center space-x-2 text-sm font-medium">
                        <span className="opacity-70">Manage Accounts</span>
                        <span className="opacity-70">/</span>
                        <span className="opacity-70">Users</span>
                        <span className="opacity-70">/</span>
                        <span className="font-semibold border-b-2 border-primary-500 pb-1">Organization Setup</span>
                    </div>
                </div>
                <div className="flex items-center space-x-4">
                    <Button size="icon" variant="ghost" className="text-white">
                        <Plus className="h-5 w-5" />
                    </Button>
                    <div className="w-8 h-8 rounded-full bg-slate-500 overflow-hidden border border-slate-600">
                        <img src="https://ui-avatars.com/api/?name=User&background=64748b&color=fff" alt="User" />
                    </div>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <div className="w-64 border-r bg-slate-50 overflow-y-auto">
                    <nav className="p-4 space-y-1">
                        {navItems.map(item => (
                            <div key={item.id}>
                                {item.isGroup ? (
                                    <div className="space-y-1">
                                        <button
                                            onClick={() => toggleGroup(item.id)}
                                            className="w-full flex items-center justify-between py-2 px-3 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-md transition-colors"
                                        >
                                            <div className="flex items-center">
                                                <item.icon className="h-4 w-4 mr-3" />
                                                {item.label}
                                            </div>
                                            {expandedGroups.includes(item.id) ? (
                                                <ChevronDown className="h-4 w-4" />
                                            ) : (
                                                <ChevronRight className="h-4 w-4" />
                                            )}
                                        </button>
                                        {expandedGroups.includes(item.id) && item.children && (
                                            <div className="ml-4 space-y-1 mt-1 border-l pl-3">
                                                {item.children.map(child => (
                                                    <button
                                                        key={child.id}
                                                        onClick={() => setActiveTab(child.id)}
                                                        className={`w-full text-left py-2 px-3 text-sm font-medium rounded-md transition-colors ${activeTab === child.id
                                                                ? 'bg-primary/10 text-primary font-semibold'
                                                                : 'text-slate-500 hover:bg-slate-200'
                                                            }`}
                                                    >
                                                        {child.label}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setActiveTab(item.id)}
                                        className={`w-full flex items-center py-2 px-3 text-sm font-medium rounded-md transition-colors ${activeTab === item.id
                                                ? 'bg-primary/10 text-primary font-semibold'
                                                : 'text-slate-600 hover:bg-slate-200'
                                            }`}
                                    >
                                        <item.icon className="h-4 w-4 mr-3" />
                                        {item.label}
                                    </button>
                                )}
                            </div>
                        ))}
                    </nav>
                </div>

                {/* Content Area */}
                <main className="flex-1 overflow-y-auto bg-slate-100 p-8">
                    <div className="max-w-6xl mx-auto h-full flex flex-col">
                        {activeTab === 'categories' && <EmployeeCategoriesTab />}
                        {activeTab === 'company_units' && <CompanyUnitsTab />}
                        {(activeTab !== 'categories' && activeTab !== 'company_units') && (
                            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-lg shadow-sm border h-full">
                                <SettingsIcon className="h-12 w-12 text-slate-300 mb-4 animate-spin-slow" />
                                <h3 className="text-lg font-medium text-slate-900 mb-1">Coming Soon</h3>
                                <p className="text-slate-500 text-center max-w-sm">
                                    The <span className="font-semibold text-slate-700">{activeTab.replace('_', ' ')}</span> module is currently under development to improve your organization management experience.
                                </p>
                            </div>
                        )}
                    </div>
                </main>
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
