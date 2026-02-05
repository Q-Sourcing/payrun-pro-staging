import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Users,
    Globe2,
    GraduationCap,
    Building2,
    CheckCircle2,
    Loader2,
    Search,
    Filter,
    ArrowRight,
    ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useOrg } from '@/lib/tenant/OrgContext';
import { HeadOfficePayGroupsService } from '@/lib/services/headOfficePayGroups.service';
import type { HeadOfficePayGroupRefType } from '@/lib/types/paygroups';

interface HeadOfficePayGroupDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

type Step = 'details' | 'units' | 'members';

export const HeadOfficePayGroupDialog: React.FC<HeadOfficePayGroupDialogProps> = ({
    open,
    onOpenChange,
    onSuccess,
}) => {
    const { organizationId } = useOrg();
    const { toast } = useToast();
    const [currentStep, setCurrentStep] = useState<Step>('details');
    const [loading, setLoading] = useState(false);

    // Form State
    const [type, setType] = useState<HeadOfficePayGroupRefType>('regular');
    const [formData, setFormData] = useState({
        name: '',
        pay_frequency: 'monthly',
        period_start: '',
        period_end: '',
        notes: ''
    });

    // Selection State
    const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
    const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);

    // Data State
    const [companyUnits, setCompanyUnits] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (open) {
            fetchInitialData();
            // Reset state
            setCurrentStep('details');
            setSelectedUnitIds([]);
            setSelectedEmployeeIds([]);
            setFormData({
                name: '',
                pay_frequency: 'monthly',
                period_start: '',
                period_end: '',
                notes: ''
            });
        }
    }, [open]);

    const fetchInitialData = async () => {
        if (!organizationId) return;
        setLoading(true);
        try {
            const [unitsRes, employeesRes] = await Promise.all([
                supabase.from('company_units').select('*').eq('active', true),
                supabase.from('employees').select('id, first_name, last_name, sub_department, employee_type').eq('status', 'active')
            ]);

            setCompanyUnits(unitsRes.data || []);
            setEmployees(employeesRes.data || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!organizationId) return;
        setLoading(true);
        try {
            // 1. Create Paygroup
            const pg = await HeadOfficePayGroupsService.createPayGroup(type, {
                ...formData,
                organization_id: organizationId,
                status: 'draft'
            } as any);

            // 2. Tag Company Units
            if (selectedUnitIds.length > 0) {
                await HeadOfficePayGroupsService.tagCompanyUnits(pg.id, type, selectedUnitIds);
            }

            // 3. Add Members
            if (selectedEmployeeIds.length > 0) {
                await HeadOfficePayGroupsService.addMembers(pg.id, type, selectedEmployeeIds);
            }

            toast({
                title: 'Success',
                description: 'Head Office paygroup created successfully.',
            });
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Failed to create paygroup.',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    const departments = Array.from(new Set(employees.map(e => e.sub_department).filter(Boolean)));
    const filteredEmployees = employees.filter(e => {
        const fullName = `${e.first_name} ${e.last_name}`.toLowerCase();
        return fullName.includes(searchQuery.toLowerCase()) ||
            e.sub_department?.toLowerCase().includes(searchQuery.toLowerCase());
    });

    const toggleDepartment = (dept: string, checked: boolean) => {
        const deptEmpIds = employees.filter(e => e.sub_department === dept).map(e => e.id);
        if (checked) {
            setSelectedEmployeeIds(prev => Array.from(new Set([...prev, ...deptEmpIds])));
        } else {
            setSelectedEmployeeIds(prev => prev.filter(id => !deptEmpIds.includes(id)));
        }
    };

    const isDeptSelected = (dept: string) => {
        const deptEmpIds = employees.filter(e => e.sub_department === dept).map(e => e.id);
        return deptEmpIds.every(id => selectedEmployeeIds.includes(id)) && deptEmpIds.length > 0;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 overflow-hidden border-none glass-morphism rounded-3xl">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-purple-50/50 -z-10" />

                <DialogHeader className="p-8 border-b bg-white/40 backdrop-blur-md">
                    <div className="flex items-center justify-between">
                        <div>
                            <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                                Create Head Office Paygroup
                            </DialogTitle>
                            <DialogDescription className="mt-1">
                                Securely set up complex payroll domains with centralized management.
                            </DialogDescription>
                        </div>
                        <div className="flex gap-2">
                            {['details', 'units', 'members'].map((s, i) => (
                                <div key={s} className="flex items-center">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${currentStep === s ? 'bg-blue-600 text-white shadow-lg ring-4 ring-blue-100' :
                                        i < ['details', 'units', 'members'].indexOf(currentStep) ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
                                        }`}>
                                        {i < ['details', 'units', 'members'].indexOf(currentStep) ? <CheckCircle2 className="w-5 h-5" /> : i + 1}
                                    </div>
                                    {i < 2 && <div className="w-8 h-px bg-gray-200 mx-2" />}
                                </div>
                            ))}
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-hidden p-8">
                    <AnimatePresence mode="wait">
                        {currentStep === 'details' && (
                            <motion.div
                                key="details"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-8"
                            >
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {[
                                        { id: 'regular', name: 'Regular Staff', icon: Users, color: 'blue' },
                                        { id: 'intern', name: 'Interns', icon: GraduationCap, color: 'purple' },
                                        { id: 'expatriate', name: 'Expatriates', icon: Globe2, color: 'indigo' }
                                    ].map((t) => (
                                        <Card
                                            key={t.id}
                                            className={`cursor-pointer transition-all duration-300 hover:shadow-xl border-2 ${type === t.id ? `border-${t.color}-500 bg-${t.color}-50/30 ring-2 ring-${t.color}-100` : 'border-transparent bg-white/60'
                                                }`}
                                            onClick={() => setType(t.id as HeadOfficePayGroupRefType)}
                                        >
                                            <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                                                <div className={`p-4 rounded-2xl bg-${t.color}-100 text-${t.color}-600`}>
                                                    <t.icon className="w-8 h-8" />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-lg">{t.name}</h3>
                                                    <p className="text-xs text-muted-foreground mt-1">Specialized calculator for {t.name.toLowerCase()}.</p>
                                                </div>
                                                {type === t.id && (
                                                    <Badge className={`bg-${t.color}-500 hover:bg-${t.color}-600 text-white rounded-full px-4`}>Selected</Badge>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white/40 p-8 rounded-3xl backdrop-blur-sm border border-white/60 shadow-inner">
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <Label className="text-sm font-semibold text-gray-700">Paygroup Name</Label>
                                            <Input
                                                placeholder="e.g. October 2023 - Regular Staff"
                                                value={formData.name}
                                                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                                className="rounded-xl border-gray-200 focus:ring-blue-500 h-12"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-sm font-semibold text-gray-700">Frequency</Label>
                                            <Select
                                                value={formData.pay_frequency}
                                                onValueChange={v => setFormData(prev => ({ ...prev, pay_frequency: v }))}
                                            >
                                                <SelectTrigger className="rounded-xl border-gray-200 h-12">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="monthly">Monthly</SelectItem>
                                                    <SelectItem value="bi_weekly">Bi-weekly</SelectItem>
                                                    <SelectItem value="daily">Daily</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-sm font-semibold text-gray-700">Period Start</Label>
                                                <Input
                                                    type="date"
                                                    value={formData.period_start}
                                                    onChange={e => setFormData(prev => ({ ...prev, period_start: e.target.value }))}
                                                    className="rounded-xl border-gray-200 h-12"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-sm font-semibold text-gray-700">Period End</Label>
                                                <Input
                                                    type="date"
                                                    value={formData.period_end}
                                                    onChange={e => setFormData(prev => ({ ...prev, period_end: e.target.value }))}
                                                    className="rounded-xl border-gray-200 h-12"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-sm font-semibold text-gray-700">Notes (Optional)</Label>
                                            <Textarea
                                                placeholder="Internal notes for this payroll run..."
                                                value={formData.notes}
                                                onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                                className="rounded-xl border-gray-200 min-h-[100px]"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {currentStep === 'units' && (
                            <motion.div
                                key="units"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="h-full flex flex-col space-y-6"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-xl font-bold">Company Unit Tagging</h3>
                                        <p className="text-sm text-muted-foreground mt-1">Associate this paygroup with specific organization units.</p>
                                    </div>
                                    <Badge variant="outline" className="px-3 py-1 bg-white">{selectedUnitIds.length} Selected</Badge>
                                </div>

                                <ScrollArea className="flex-1 bg-white/40 rounded-3xl border border-white/60 p-6 backdrop-blur-sm">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {companyUnits.map(unit => (
                                            <div
                                                key={unit.id}
                                                className={`p-4 rounded-2xl flex items-center justify-between transition-all duration-300 border-2 cursor-pointer ${selectedUnitIds.includes(unit.id) ? 'border-blue-500 bg-blue-50/50' : 'border-transparent bg-white/60 hover:border-gray-200'
                                                    }`}
                                                onClick={() => {
                                                    setSelectedUnitIds(prev =>
                                                        prev.includes(unit.id) ? prev.filter(id => id !== unit.id) : [...prev, unit.id]
                                                    );
                                                }}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-2 rounded-xl ${selectedUnitIds.includes(unit.id) ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                                                        <Building2 className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold">{unit.name}</p>
                                                        <p className="text-xs text-muted-foreground">{unit.kind || 'Unit'}</p>
                                                    </div>
                                                </div>
                                                <Checkbox
                                                    checked={selectedUnitIds.includes(unit.id)}
                                                    onCheckedChange={() => { }} // Handled by div click
                                                    className="rounded-md h-5 w-5 border-2 border-gray-300 data-[state=checked]:bg-blue-500 data-[state=checked]:border-transparent"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </motion.div>
                        )}

                        {currentStep === 'members' && (
                            <motion.div
                                key="members"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="h-full flex flex-col space-y-6"
                            >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                        <h3 className="text-xl font-bold">Inline Member Selection</h3>
                                        <p className="text-sm text-muted-foreground mt-1">Select employees to include in this Head Office payroll run.</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <Input
                                                placeholder="Search employees..."
                                                value={searchQuery}
                                                onChange={e => setSearchQuery(e.target.value)}
                                                className="pl-10 rounded-full border-gray-200 bg-white w-64 h-10"
                                            />
                                        </div>
                                        <Button
                                            variant="outline"
                                            className="rounded-full h-10 gap-2 border-dashed"
                                            onClick={() => {
                                                if (selectedEmployeeIds.length === employees.length) setSelectedEmployeeIds([]);
                                                else setSelectedEmployeeIds(employees.map(e => e.id));
                                            }}
                                        >
                                            {selectedEmployeeIds.length === employees.length ? 'Deselect All' : 'Select All'}
                                        </Button>
                                    </div>
                                </div>

                                <div className="flex-1 bg-white/40 rounded-3xl border border-white/60 overflow-hidden flex flex-col backdrop-blur-sm shadow-inner">
                                    <div className="p-4 border-b bg-gray-50/50 flex items-center justify-between text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        <div className="flex items-center gap-4">
                                            <span className="w-8 ml-2">#</span>
                                            <span>Employee Details</span>
                                        </div>
                                        <div className="flex items-center gap-32">
                                            <span className="w-32">Sub-Department</span>
                                            <span className="w-24 text-right mr-4">Select</span>
                                        </div>
                                    </div>
                                    <ScrollArea className="flex-1 p-2">
                                        <div className="space-y-4">
                                            {departments.map(dept => {
                                                const deptEmployees = filteredEmployees.filter(e => e.sub_department === dept);
                                                if (deptEmployees.length === 0) return null;

                                                return (
                                                    <div key={dept} className="space-y-1">
                                                        <div className="flex items-center justify-between px-4 py-2 bg-gray-100/30 rounded-xl">
                                                            <div className="flex items-center gap-2">
                                                                <Filter className="w-3 h-3 text-blue-500" />
                                                                <span className="text-xs font-bold text-blue-700">{dept}</span>
                                                                <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{deptEmployees.length}</Badge>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] text-gray-500 font-medium">Select All Dept</span>
                                                                <Checkbox
                                                                    checked={isDeptSelected(dept)}
                                                                    onCheckedChange={(checked) => toggleDepartment(dept, !!checked)}
                                                                    className="rounded-md border-gray-300"
                                                                />
                                                            </div>
                                                        </div>
                                                        {deptEmployees.map((emp, idx) => (
                                                            <div
                                                                key={emp.id}
                                                                className={`p-3 rounded-xl flex items-center justify-between transition-all duration-200 cursor-pointer group ${selectedEmployeeIds.includes(emp.id) ? 'bg-blue-50/50 shadow-sm' : 'hover:bg-white/60'
                                                                    }`}
                                                                onClick={() => {
                                                                    setSelectedEmployeeIds(prev =>
                                                                        prev.includes(emp.id) ? prev.filter(id => id !== emp.id) : [...prev, emp.id]
                                                                    );
                                                                }}
                                                            >
                                                                <div className="flex items-center gap-4">
                                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold ${selectedEmployeeIds.includes(emp.id) ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                                                                        }`}>
                                                                        {idx + 1}
                                                                    </div>
                                                                    <div>
                                                                        <p className="font-semibold text-sm">{emp.first_name} {emp.last_name}</p>
                                                                        <p className="text-[10px] text-muted-foreground">{emp.employee_type}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-32">
                                                                    <span className="w-32 text-xs text-muted-foreground">{emp.sub_department}</span>
                                                                    <Checkbox
                                                                        checked={selectedEmployeeIds.includes(emp.id)}
                                                                        onCheckedChange={() => { }} // Handled by div click
                                                                        className="rounded-md h-5 w-5 data-[state=checked]:bg-blue-500 data-[state=checked]:border-transparent mr-4"
                                                                    />
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </ScrollArea>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <DialogFooter className="p-8 border-t bg-white/40 backdrop-blur-md flex items-center justify-between sm:justify-between">
                    <div className="flex items-center gap-2">
                        {currentStep !== 'details' && (
                            <Button
                                variant="outline"
                                className="rounded-2xl px-6 h-12 border-gray-200 hover:bg-white"
                                onClick={() => {
                                    if (currentStep === 'units') setCurrentStep('details');
                                    if (currentStep === 'members') setCurrentStep('units');
                                }}
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            className="rounded-2xl px-6 h-12 text-gray-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block mr-2">
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Selected</p>
                            <p className="text-sm font-bold text-gray-700">{selectedUnitIds.length} Units • {selectedEmployeeIds.length} Members</p>
                        </div>
                        {currentStep !== 'members' ? (
                            <Button
                                className="rounded-2xl px-8 h-12 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95"
                                onClick={() => {
                                    if (currentStep === 'details') {
                                        if (!formData.name) {
                                            toast({ title: 'Missing Info', description: 'Please enter a name for the paygroup.', variant: 'destructive' });
                                            return;
                                        }
                                        setCurrentStep('units');
                                    }
                                    else if (currentStep === 'units') setCurrentStep('members');
                                }}
                            >
                                Continue
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        ) : (
                            <Button
                                className="rounded-2xl px-8 h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 shadow-lg shadow-blue-200 transition-all active:scale-95"
                                disabled={loading}
                                onClick={handleCreate}
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
                                Finalize & Create
                            </Button>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
