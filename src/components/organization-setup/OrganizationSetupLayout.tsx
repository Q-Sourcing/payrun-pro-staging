import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Layers,
    Users,
    MapPin,
    Briefcase,
    Settings as SettingsIcon
} from "lucide-react";
import { EmployeeCategoriesTab } from './EmployeeCategoriesTab';
import { CompanyUnitsTab } from './CompanyUnitsTab';

interface OrganizationSetupLayoutProps {
    onBack: () => void;
}

export const OrganizationSetupLayout: React.FC<OrganizationSetupLayoutProps> = ({ onBack }) => {
    const [activeTab, setActiveTab] = useState('company_units');

    return (
        <div className="space-y-8">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
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

                <div className="mt-0">
                    <TabsContent value="categories" className="mt-0 focus-visible:outline-none">
                        <EmployeeCategoriesTab />
                    </TabsContent>

                    <TabsContent value="company_units" className="mt-0 focus-visible:outline-none">
                        <CompanyUnitsTab />
                    </TabsContent>

                    {['locations', 'departments', 'designations', 'details', 'policy'].includes(activeTab) && (
                        <div className="py-24 text-center text-slate-500 border-2 border-dashed rounded-2xl bg-slate-50/50">
                            <SettingsIcon className="h-12 w-12 mx-auto mb-4 opacity-20 animate-spin-slow" />
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Coming Soon</h3>
                            <p className="max-w-sm mx-auto">
                                The <span className="font-semibold text-slate-700 capitalize">{activeTab.replace('_', ' ')}</span> module is currently under development.
                            </p>
                        </div>
                    )}
                </div>
            </Tabs>
        </div>
    );
};
