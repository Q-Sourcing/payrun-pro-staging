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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  UserPlus,
  Search,
  Users,
  Globe2,
  Briefcase,
  GraduationCap,
  Loader2,
  Package
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { PayGroup } from '@/lib/types/paygroups';
import { supabase } from '@/integrations/supabase/client';
import { getEmployeeTypeForPayGroup } from '@/lib/utils/paygroup-utils';
import { HeadOfficePayGroupsService } from '@/lib/services/headOfficePayGroups.service';
import { Checkbox } from '@/components/ui/checkbox';

interface AssignEmployeeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  presetGroup?: PayGroup;
}

interface Employee {
  id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
  sub_department?: string;
  employee_type?: string;
  currentPayGroup?: {
    id: string;
    name: string;
    type: string;
  };
}

export const AssignEmployeeModal: React.FC<AssignEmployeeModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
  presetGroup,
}) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [selectedGroup, setSelectedGroup] = useState<string>(presetGroup?.id || '');
  const [notes, setNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const { toast } = useToast();

  // Load employees
  useEffect(() => {
    if (open) {
      loadEmployees();
    }
  }, [open]);

  // Filter employees based on search
  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = employees.filter(emp =>
        `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.sub_department?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredEmployees(filtered);
    } else {
      setFilteredEmployees(employees);
    }
  }, [employees, searchQuery]);

  const loadEmployees = async () => {
    setLoading(true);
    try {
      // Filter employees by category/sub_type to match the pay group
      let query = (supabase as any)
        .from('employees')
        .select('id, first_name, middle_name, last_name, email, sub_department, category, employee_type, pay_frequency')
        .order('first_name');

      // Filter by category and employee_type if preset group has them
      if (presetGroup?.category && presetGroup?.employee_type) {
        query = query.eq('category', presetGroup.category);
        query = query.eq('employee_type', presetGroup.employee_type);

        // For manpower, also filter by pay_frequency
        if (presetGroup.employee_type === 'manpower' && presetGroup.pay_frequency) {
          query = query.eq('pay_frequency', presetGroup.pay_frequency);
        }

        // Filter by project_id if pay group has one (for projects category)
        if (presetGroup.category === 'projects' && (presetGroup as any).project_id) {
          query = query.eq('project_id', (presetGroup as any).project_id);
        }
      } else if (presetGroup?.type) {
        // Fallback to old type-based filtering for backward compatibility
        const employeeType = getEmployeeTypeForPayGroup(presetGroup.type);
        if (employeeType) {
          query = query.eq('employee_type', employeeType);
        }
      }

      const { data, error } = await (query as any);

      if (error) throw error;

      // Get all active pay group assignments to check for conflicts using the optimized view
      const { data: allAssignments, error: assignmentError } = await (supabase as any)
        .from('paygroup_employees_view')
        .select(`
          employee_id,
          pay_group_id,
          active,
          pay_group_name,
          pay_group_type
        `)
        .eq('active', true);

      if (assignmentError) throw assignmentError;

      // Create a map of employee_id to their current pay group
      const employeePayGroupMap = new Map();
      allAssignments?.forEach(assignment => {
        employeePayGroupMap.set(assignment.employee_id, {
          id: assignment.pay_group_id,
          name: assignment.pay_group_name,
          type: assignment.pay_group_type
        });
      });

      // Add current pay group info to employees
      const employeesWithPayGroupInfo = (data || []).map(emp => ({
        ...emp,
        currentPayGroup: employeePayGroupMap.get(emp.id)
      }));

      setEmployees(employeesWithPayGroupInfo);
      setFilteredEmployees(employeesWithPayGroupInfo);
    } catch (error) {
      console.error('Error loading employees:', error);
      toast({
        title: 'Error',
        description: 'Failed to load employees',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (selectedEmployees.size === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please select at least one employee to assign',
        variant: 'destructive',
      });
      return;
    }

    // Use preset group if available, otherwise use selected group
    const targetGroupId = presetGroup?.id || selectedGroup;
    if (!targetGroupId) {
      toast({
        title: 'Validation Error',
        description: 'Please select a pay group',
        variant: 'destructive',
      });
      return;
    }

    setAssigning(true);
    try {
      // Step 1: Check for active duplicates before insert using the view
      // Only verify if assigning a single employee for now to avoid complexity in UI feedback for bulk
      let existing: any = null;
      if (selectedEmployees.size === 1) {
        const singleEmpId = Array.from(selectedEmployees)[0];
        const { data: checkData, error: checkError } = await (supabase as any)
          .from('paygroup_employees_view')
          .select('employee_id, pay_group_id, active')
          .eq('employee_id', singleEmpId)
          .eq('pay_group_id', targetGroupId)
          .eq('active', true)
          .maybeSingle();

        if (checkError) {
          console.error('Error checking existing assignment:', checkError);
        }
        existing = checkData;
      }

      if (existing) {
        const singleEmpId = Array.from(selectedEmployees)[0];
        const employeeName = employees.find(emp => emp.id === singleEmpId)?.first_name || 'Employee';
        toast({
          title: 'Already Assigned',
          description: `${employeeName} is already assigned to this pay group`,
          variant: 'destructive',
        });
        return;
      }

      // If it's a Head Office pay group, use the new bulk service
      if (presetGroup?.category === 'head_office') {
        // Derive the correct HeadOfficePayGroupRefType from employee_type
        // This handles legacy 'local' and normalizes 'interns' to 'intern'
        let payGroupType: 'regular' | 'intern' | 'expatriate';
        if (presetGroup.employee_type === 'regular' || presetGroup.employee_type === 'local') {
          payGroupType = 'regular';
        } else if (presetGroup.employee_type === 'interns') {
          payGroupType = 'intern';
        } else if (presetGroup.employee_type === 'expatriate') {
          payGroupType = 'expatriate';
        } else {
          throw new Error(`Unsupported employee type for Head Office: ${presetGroup.employee_type}`);
        }

        await HeadOfficePayGroupsService.addMembers(
          targetGroupId,
          payGroupType, // Use derived type instead of presetGroup.type
          Array.from(selectedEmployees)
        );

        toast({
          title: 'Success',
          description: `${selectedEmployees.size} employees assigned successfully`,
        });

        onSuccess();
        onOpenChange(false);
        setSelectedEmployees(new Set());
        setSelectedGroup(presetGroup?.id || '');
        setNotes('');
        setSearchQuery('');
        return;
      }

      // Step 2: Proceed with assignment
      // Step 2: Proceed with singular assignment (Legacy / Projects) - Iterate for bulk support
      // Note: Ideally the edge function should also support bulk, but for now we loop client-side or use the first one if legacy only supports one.
      // To support bulk in legacy without backend changes, we'll loop.
      const employeeIds = Array.from(selectedEmployees);
      let successCount = 0;
      let failCount = 0;

      for (const empId of employeeIds) {
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/assign-employee-to-paygroup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
          },
          body: JSON.stringify({
            employee_id: empId,
            pay_group_id: targetGroupId,
            notes: notes || undefined
          })
        });

        if (response.ok) {
          successCount++;
        } else {
          failCount++;
          console.error(`Failed to assign ${empId}`);
        }
      }

      if (failCount > 0 && successCount === 0) {
        throw new Error(`${failCount} assignments failed.`);
      }

      // Result handling is done via counts now


      toast({
        title: successCount === employeeIds.length ? 'Success' : 'Partial Success',
        description: `${successCount} employees assigned successfully.${failCount > 0 ? ` ${failCount} failed.` : ''}`,
      });

      onSuccess();
      onOpenChange(false);

      // Reset form
      setSelectedEmployees(new Set());
      setSelectedGroup(presetGroup?.id || '');
      setNotes('');
      setSearchQuery('');
    } catch (error: any) {
      console.error('Error assigning employee:', error);
      toast({
        title: 'Assignment Failed',
        description: error.message || 'Failed to assign employee to pay group',
        variant: 'destructive',
      });
    } finally {
      setAssigning(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'regular': return <Users className="h-4 w-4" />;
      case 'expatriate': return <Globe2 className="h-4 w-4" />;
      case 'piece_rate': return <Package className="h-4 w-4" />;
      case 'intern': return <GraduationCap className="h-4 w-4" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Assign Employee to Pay Group
          </DialogTitle>
          <DialogDescription>
            Select an employee and assign them to a pay group. The assignment will be validated based on your organization's rules.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Preset Group Display */}
          {presetGroup && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Selected Pay Group</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  {getTypeIcon(presetGroup.type)}
                  <div>
                    <div className="font-medium">{presetGroup.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {presetGroup.paygroup_id} • {presetGroup.country}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pay Group Selection - Only show if no preset group */}
          {!presetGroup && (
            <div className="space-y-2">
              <Label htmlFor="paygroup">Pay Group *</Label>
              <Select
                value={selectedGroup}
                onValueChange={setSelectedGroup}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select pay group" />
                </SelectTrigger>
                <SelectContent>
                  {/* Pay groups would be populated here */}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Employee Search & Actions */}
          <div className="flex items-end gap-2">
            <div className="space-y-2 flex-1">
              <Label htmlFor="search">Search Employees</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name, email, or department..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                const allIds = filteredEmployees.map(e => e.id);
                const newSet = new Set(selectedEmployees);
                allIds.forEach(id => newSet.add(id));
                setSelectedEmployees(newSet);
              }}
            >
              Select All
            </Button>
            <Button
              variant="outline"
              onClick={() => setSelectedEmployees(new Set())}
              disabled={selectedEmployees.size === 0}
            >
              Clear
            </Button>
          </div>

          {/* Employee Selection */}
          <div className="space-y-2">
            <Label>Select Employee *</Label>
            {presetGroup && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  Showing employees matching: {presetGroup.category && presetGroup.employee_type
                    ? `${presetGroup.category} > ${presetGroup.employee_type}${presetGroup.pay_frequency ? ` > ${presetGroup.pay_frequency}` : ''}`
                    : presetGroup.type}
                </p>
                <p className="text-xs text-blue-600">
                  💡 If an employee is already in another pay group, they will be moved to this one automatically.
                </p>
              </div>
            )}
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto border rounded-md">
                {filteredEmployees.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    No employees found
                  </div>
                ) : (
                  <div className="space-y-1 p-2">
                    {filteredEmployees.map((employee) => {
                      const isSelected = selectedEmployees.has(employee.id);
                      return (
                        <motion.div
                          key={employee.id}
                          className={`p-3 rounded-md cursor-pointer transition-colors ${isSelected
                            ? 'bg-blue-50 border border-blue-200'
                            : 'hover:bg-gray-50'
                            }`}
                          onClick={() => {
                            const newSet = new Set(selectedEmployees);
                            if (newSet.has(employee.id)) {
                              newSet.delete(employee.id);
                            } else {
                              newSet.add(employee.id);
                            }
                            setSelectedEmployees(newSet);
                          }}
                          whileHover={{ scale: 1.01 }}
                          transition={{ duration: 0.1 }}
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox checked={isSelected} />
                            <div className="flex-1 flex items-center justify-between">
                              <div>
                                <div className="font-medium">
                                  {employee.first_name} {employee.last_name}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {employee.email}
                                </div>
                                {employee.sub_department && (
                                  <div className="text-xs text-muted-foreground">
                                    {employee.sub_department}
                                  </div>
                                )}
                                {employee.currentPayGroup && (
                                  <div className="text-xs text-orange-600 font-medium mt-1">
                                    Currently in: {employee.currentPayGroup.name} ({employee.currentPayGroup.type})
                                  </div>
                                )}
                              </div>
                              {employee.employee_type && (
                                <Badge variant="secondary" className="text-xs">
                                  {employee.employee_type}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about this assignment..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={assigning}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={selectedEmployees.size === 0 || (!presetGroup && !selectedGroup) || assigning}
          >
            {assigning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Assigning...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Assign {selectedEmployees.size > 0 ? `${selectedEmployees.size} Employees` : 'Employee'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
