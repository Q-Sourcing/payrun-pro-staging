import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CompanyUnitsService, CompanyUnit } from '@/lib/services/company-units.service';
import { EmployeeCategoriesService, EmployeeCategory } from '@/lib/services/employee-categories.service';
import { CompaniesService, Company } from '@/lib/services/companies.service';
import { useOrg } from '@/lib/tenant/OrgContext';
import { useToast } from '@/hooks/use-toast';
import { Plus, Building, Trash2, Edit2, AlertCircle, X, Search, MoreVertical } from 'lucide-react';

export const CompanyUnitsTab = () => {
    const [units, setUnits] = useState<CompanyUnit[]>([]);
    const [unitCategories, setUnitCategories] = useState<Record<string, string[]>>({}); // Map unitId -> categoryIds[]
    const [categories, setCategories] = useState<EmployeeCategory[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { organizationId } = useOrg();
    const { toast } = useToast();

    useEffect(() => {
        loadData();
    }, [organizationId]);

    const loadData = async () => {
        if (!organizationId) return;
        try {
            setLoading(true);
            const [unitsData, categoriesData, companiesData] = await Promise.all([
                CompanyUnitsService.getAllCompanyUnits(),
                EmployeeCategoriesService.getCategoriesByOrg(organizationId),
                CompaniesService.getAllCompanies()
            ]);
            setUnits(unitsData);
            setCategories(categoriesData);
            setCompanies(companiesData);

            // Load categories for each unit (N:M)
            // Ideally we'd do this in one query, but for now we iterate or fetch all mappings.
            // Let's assume we can fetch all mappings or lazy load.
            // For this UI, let's fetch for all units visible.
            const categoriesMap: Record<string, string[]> = {};

            // Optimization: We could add a service method to get ALL unit-category links.
            // For now, let's just loop (careful with N+1, but staging default is usually low N).
            // Actually, let's update CompanyUnitsService to fetch this efficiently in a future step.
            // For now, we will use the legacy `category_id` as "primary" + fetch extra if needed
            // OR just fetch for each.

            await Promise.all(unitsData.map(async (u) => {
                try {
                    const cats = await CompanyUnitsService.getCategoriesForUnit(u.id);
                    categoriesMap[u.id] = cats;
                } catch (e) {
                    console.error('Failed to load categories for unit', u.id);
                }
            }));
            setUnitCategories(categoriesMap);
        } catch (error) {
            console.error('Error loading data:', error);
            toast({
                title: 'Error',
                description: 'Failed to load organization data',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateCategories = async (unitId: string, newCategoryIds: string[]) => {
        try {
            await CompanyUnitsService.updateCompanyUnit(unitId, { categoryIds: newCategoryIds });
            toast({
                title: 'Success',
                description: 'Company unit categories updated successfully',
            });
            // Update local state
            setUnitCategories(prev => ({ ...prev, [unitId]: newCategoryIds }));
        } catch (error) {
            console.error('Error updating categories:', error);
            toast({
                title: 'Error',
                description: 'Failed to update company unit categories',
                variant: 'destructive',
            });
        }
    };

    const getCompanyName = (companyId: string) => {
        return companies.find(c => c.id === companyId)?.name || 'Unknown Company';
    };

    const getCategoryLabel = (categoryId: string | null) => {
        if (!categoryId) return null;
        return categories.find(c => c.id === categoryId)?.label;
    };

    const filteredUnits = units.filter(unit =>
        unit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getCompanyName(unit.company_id).toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Company Units</h1>
                    <p className="text-slate-500">Manage structure mapping and category assignments.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" className="bg-white hover:bg-slate-50">
                        Import Units
                    </Button>
                </div>
            </div>

            <Card className="overflow-hidden border-slate-200">
                <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-base font-semibold">Management View</CardTitle>
                        <CardDescription>Assign employee categories to company units across all companies.</CardDescription>
                    </div>
                    <div className="relative w-72">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                            type="search"
                            placeholder="Search units or companies..."
                            className="pl-9 bg-slate-50 border-slate-200"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow className="hover:bg-slate-50">
                                <TableHead className="pl-6">Unit Name</TableHead>
                                <TableHead>Parent Company</TableHead>
                                <TableHead className="w-[280px]">Employee Category</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right pr-6">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-20">
                                        <div className="flex items-center justify-center space-x-2">
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                                            <span className="text-slate-500 font-medium">Loading units...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : filteredUnits.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-20">
                                        <div className="flex flex-col items-center justify-center space-y-3">
                                            <Building className="h-12 w-12 text-slate-200" />
                                            <p className="text-slate-500 italic max-w-sm">No company units found. Try adjusting your search or add a new unit from Company Settings.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredUnits.map((unit) => (
                                    <TableRow key={unit.id} className="hover:bg-slate-50/50 transition-colors">
                                        <TableCell className="pl-6 font-medium text-slate-900">{unit.name}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center text-slate-600 text-sm">
                                                <Building className="h-3.5 w-3.5 mr-2 opacity-60" />
                                                {getCompanyName(unit.company_id)}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {(unitCategories[unit.id] && unitCategories[unit.id].length > 0) ? (
                                                    unitCategories[unit.id].map(catId => {
                                                        const cat = categories.find(c => c.id === catId);
                                                        return cat ? (
                                                            <Badge key={catId} variant="secondary" className="text-xs font-normal flex items-center gap-1">
                                                                {cat.label}
                                                                <button
                                                                    className="ml-1 hover:text-red-600 focus:outline-none rounded-full p-0.5 hover:bg-red-50"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        const current = unitCategories[unit.id] || [];
                                                                        const newCats = current.filter(id => id !== catId);
                                                                        handleUpdateCategories(unit.id, newCats);
                                                                    }}
                                                                >
                                                                    <X className="h-3 w-3" />
                                                                </button>
                                                            </Badge>
                                                        ) : null;
                                                    })
                                                ) : (
                                                    <span className="flex items-center text-amber-600 italic text-sm">
                                                        <AlertCircle className="h-3.5 w-3.5 mr-2" />
                                                        Unclassified
                                                    </span>
                                                )}

                                                {/* Edit Button (Simple Trigger for now) */}
                                                <Select
                                                    value=""
                                                    onValueChange={(val) => {
                                                        const current = unitCategories[unit.id] || [];
                                                        if (current.includes(val)) return; // Already exists
                                                        handleUpdateCategories(unit.id, [...current, val]);
                                                    }}
                                                >
                                                    <SelectTrigger className="h-6 w-6 p-0 border-dashed rounded-full ml-1 opacity-50 hover:opacity-100">
                                                        <Plus className="h-4 w-4" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {categories.map(cat => (
                                                            <SelectItem
                                                                key={cat.id}
                                                                value={cat.id}
                                                                disabled={(unitCategories[unit.id] || []).includes(cat.id)}
                                                            >
                                                                {cat.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                {/* Separate "Clear" or "Manage" mechanism required for full N:M removal. 
                                                     For MVP, let's rely on a proper dialog for complex edits, 
                                                     this quick-add is just for demo/speed. 
                                                     Correct approach: Button to open "Manage Categories" dialog.
                                                  */}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={unit.active ? 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-50' : 'bg-slate-50 text-slate-400 border-slate-100'}>
                                                {unit.active ? 'Active' : 'Disabled'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-900">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};
