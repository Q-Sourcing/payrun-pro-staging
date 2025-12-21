import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Shield, Search, MoreVertical, Trash2 } from "lucide-react";
import { EmployeeCategoriesService, EmployeeCategory } from '@/lib/services/employee-categories.service';
import { useOrg } from '@/lib/tenant/OrgContext';
import { useToast } from '@/hooks/use-toast';

export const EmployeeCategoriesTab = () => {
    const [categories, setCategories] = useState<EmployeeCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { organizationId } = useOrg();
    const { toast } = useToast();

    useEffect(() => {
        loadCategories();
    }, [organizationId]);

    const loadCategories = async () => {
        if (!organizationId) return;
        try {
            setLoading(true);
            const data = await EmployeeCategoriesService.getCategoriesByOrg(organizationId);
            setCategories(data);
        } catch (error) {
            console.error('Error loading categories:', error);
            toast({
                title: 'Error',
                description: 'Failed to load employee categories',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const filteredCategories = categories.filter(cat =>
        cat.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cat.key.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Employee Categories</h1>
                    <p className="text-slate-500">Manage dynamic categories for employee classification.</p>
                </div>
                <Button className="bg-primary hover:bg-primary/90">
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Category
                </Button>
            </div>

            <Card>
                <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-base font-semibold">Categories List</CardTitle>
                        <CardDescription>All active categories for your organization.</CardDescription>
                    </div>
                    <div className="relative w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                            type="search"
                            placeholder="Search categories..."
                            className="pl-9 bg-slate-50"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead className="w-[100px]">ID</TableHead>
                                <TableHead>Label</TableHead>
                                <TableHead>Key (System)</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-12">
                                        <div className="flex items-center justify-center space-x-2">
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                                            <span className="text-slate-500">Loading categories...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : filteredCategories.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-12">
                                        <div className="flex flex-col items-center justify-center space-y-2">
                                            <Shield className="h-10 w-10 text-slate-200" />
                                            <p className="text-slate-500 italic">No categories found matching your search.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredCategories.map((cat) => (
                                    <TableRow key={cat.id} className="hover:bg-slate-50/50">
                                        <TableCell className="font-mono text-[10px] text-slate-400">
                                            {cat.id.substring(0, 8)}...
                                        </TableCell>
                                        <TableCell className="font-semibold text-slate-700">
                                            {cat.label}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="font-mono text-[11px] bg-slate-100 border-slate-200 text-slate-600">
                                                {cat.key}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="max-w-xs truncate text-slate-500 text-sm">
                                            {cat.description || 'N/A'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={cat.active ? 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100' : 'bg-slate-100 text-slate-700 hover:bg-slate-100'}>
                                                {cat.active ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-primary hover:bg-primary/5">
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-red-500 hover:bg-red-50">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
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
