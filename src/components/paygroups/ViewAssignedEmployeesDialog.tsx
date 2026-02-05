import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Users,
  UserPlus,
  X,
  Loader2,
  ArrowLeft,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { PayGroup } from '@/lib/types/paygroups';
import { supabase } from '@/integrations/supabase/client';
import { getEmployeeTypeForPayGroup } from '@/lib/utils/paygroup-utils';
import { usePaygroupRealtimeForGroup } from '@/hooks/usePaygroupRealtime';
// import { AssignEmployeeModal } from './AssignEmployeeModal';

interface ViewAssignedEmployeesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payGroup: PayGroup;
  onUpdate: () => void;
}

interface AssignedEmployee {
  id: string;
  employee_id: string;
  assigned_at: string;
  active: boolean;
  employees: {
    id: string;
    first_name: string;
    middle_name?: string;
    last_name: string;
    email: string;
    employee_type: string;
    sub_department?: string;
  };
}

export const ViewAssignedEmployeesDialog: React.FC<ViewAssignedEmployeesDialogProps> = ({
  open,
  onOpenChange,
  payGroup,
  onUpdate,
}) => {
  const [employees, setEmployees] = useState<AssignedEmployee[]>([]);
  const [availableEmployees, setAvailableEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [showAssign, setShowAssign] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [assigning, setAssigning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  // Fetch assigned employees function
  const fetchAssignedEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const isHeadOffice = payGroup?.category === 'head_office';
      const tableName = isHeadOffice ? 'head_office_pay_group_members' : 'paygroup_employees';

      // Query from the appropriate table
      const { data, error } = await (supabase as any)
        .from(tableName)
        .select(`
          id,
          employee_id,
          ${isHeadOffice ? 'active,' : 'pay_group_id, assigned_at, active,'}
          ${isHeadOffice ? '' : '' /* padding */}
          employees!inner (
            id,
            first_name,
            middle_name,
            last_name,
            email,
            employee_type,
            sub_department
          )
        `)
        .eq('pay_group_id', payGroup.id)
        .eq('active', true);

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      // Transform the data to match the expected interface
      const transformedData = (data || []).map(item => {
        const employee = Array.isArray(item.employees) ? item.employees[0] : item.employees;
        return {
          id: item.id,
          employee_id: item.employee_id,
          assigned_at: (item as any).assigned_at || (item as any).added_at || new Date().toISOString(),
          active: item.active,
          employees: employee
        };
      });

      setEmployees(transformedData);
    } catch (error: any) {
      console.error('Error fetching assigned employees:', error);
      toast({
        title: 'Error',
        description: error?.message || 'Failed to load assigned employees',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [payGroup.id, payGroup.category, toast]);

  // Load assigned employees on mount
  useEffect(() => {
    if (open && payGroup?.id) {
      fetchAssignedEmployees();
    }
  }, [open, payGroup?.id, fetchAssignedEmployees]);

  // Set up realtime updates for this pay group
  usePaygroupRealtimeForGroup(payGroup?.id || '', {
    enabled: open && !!payGroup?.id,
    refetch: fetchAssignedEmployees,
    onEmployeeAdded: (payload) => {
      console.log(`✅ Employee added to ${payGroup?.name}:`, payload);
      fetchAssignedEmployees();
    },
    onEmployeeRemoved: (payload) => {
      console.log(`❌ Employee removed from ${payGroup?.name}:`, payload);
      fetchAssignedEmployees();
    },
    onEmployeeUpdated: (payload) => {
      console.log(`🔄 Employee updated in ${payGroup?.name}:`, payload);
      fetchAssignedEmployees();
    }
  });

  // Load available employees when switching to assign mode
  useEffect(() => {
    if (showAssign && payGroup?.id) {
      loadAvailableEmployees();
    }
  }, [showAssign, payGroup]);

  const loadAvailableEmployees = async () => {
    try {
      const employeeType = getEmployeeTypeForPayGroup(payGroup.type);

      let query = supabase
        .from('employees')
        .select('id, first_name, middle_name, last_name, email, sub_department, employee_type')
        .order('first_name');

      if (employeeType) {
        query = query.eq('employee_type', employeeType);
      }

      const { data, error } = await query;
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

      // Filter and mark employees
      const assignedEmployeeIds = employees.map(emp => emp.employee_id);
      const available = (data || []).map(emp => {
        const currentPayGroup = employeePayGroupMap.get(emp.id);
        return {
          ...emp,
          assigned: assignedEmployeeIds.includes(emp.id),
          currentPayGroup: currentPayGroup
        };
      }).filter(emp => !emp.assigned);

      setAvailableEmployees(available);
    } catch (error) {
      console.error('Error loading available employees:', error);
      toast({
        title: 'Error',
        description: 'Failed to load available employees',
        variant: 'destructive',
      });
    }
  };

  const handleAssignment = async () => {
    if (!selectedEmployee) {
      toast({
        title: 'Validation Error',
        description: 'Please select an employee to assign',
        variant: 'destructive',
      });
      return;
    }

    setAssigning(true);
    try {
      // Step 1: Check for active duplicates before insert using the view
      const { data: existing, error: checkError } = await (supabase as any)
        .from('paygroup_employees_view')
        .select('employee_id, pay_group_id, active')
        .eq('employee_id', selectedEmployee)
        .eq('pay_group_id', payGroup.id)
        .eq('active', true)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking existing assignment:', checkError);
        toast({
          title: 'Error',
          description: 'Unable to verify existing assignment',
          variant: 'destructive',
        });
        return;
      }

      if (existing) {
        const employeeName = availableEmployees.find(emp => emp.id === selectedEmployee);
        const fullName = employeeName ? [employeeName.first_name, employeeName.middle_name, employeeName.last_name].filter(Boolean).join(' ') : 'Employee';
        toast({
          title: 'Already Assigned',
          description: `${fullName} is already assigned to this pay group`,
          variant: 'destructive',
        });
        return;
      }

      // Step 2: Proceed with assignment
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/assign-employee-to-paygroup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          employee_id: selectedEmployee,
          pay_group_id: payGroup.id,
        })
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('Assignment failed:', {
          status: response.status,
          statusText: response.statusText,
          result: result,
          employee_id: selectedEmployee,
          pay_group_id: payGroup.id
        });

        // Catch any DB constraint error (in case of race conditions)
        if (result?.error?.includes('unique_employee_in_paygroup') || result?.error?.includes('duplicate')) {
          const employeeName = availableEmployees.find(emp => emp.id === selectedEmployee);
          const fullName = employeeName ? [employeeName.first_name, employeeName.middle_name, employeeName.last_name].filter(Boolean).join(' ') : 'Employee';
          toast({
            title: 'Already Assigned',
            description: `${fullName} is already assigned to this pay group`,
            variant: 'destructive',
          });
          return;
        }
        throw new Error(result?.error || 'Assignment failed');
      }

      const employeeName = availableEmployees.find(emp => emp.id === selectedEmployee);
      const fullName = employeeName ? [employeeName.first_name, employeeName.middle_name, employeeName.last_name].filter(Boolean).join(' ') : 'Employee';
      toast({
        title: 'Success',
        description: `${fullName} assigned to pay group successfully`,
      });

      handleAssignmentSuccess();
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

  const handleRemove = async (employeeId: string) => {
    const confirmDelete = window.confirm('Remove this employee from the pay group?');
    if (!confirmDelete) return;

    setRemoving(employeeId);
    try {
      const isHeadOffice = payGroup?.category === 'head_office';
      const tableName = isHeadOffice ? 'head_office_pay_group_members' : 'paygroup_employees';

      // Soft delete by setting active to false
      const { error } = await (supabase as any)
        .from(tableName)
        .update({
          active: false,
          removed_at: new Date().toISOString()
        })
        .eq('employee_id', employeeId)
        .eq('pay_group_id', payGroup.id);

      if (error) throw error;

      // Optimistically update local state
      setEmployees(prev => prev.filter(emp => emp.employee_id !== employeeId));

      toast({
        title: 'Success',
        description: 'Employee removed from pay group',
      });

      // Trigger parent update for count refresh
      onUpdate();
    } catch (error) {
      console.error('Error removing employee:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove employee',
        variant: 'destructive',
      });
    } finally {
      setRemoving(null);
    }
  };

  const handleAssignmentSuccess = () => {
    fetchAssignedEmployees();
    setShowAssign(false);
    setSelectedEmployee('');
    setSearchQuery('');
    onUpdate(); // This will trigger parent component to refresh counts
  };

  const getFullName = (employee: AssignedEmployee['employees']) => {
    const parts = [employee.first_name, employee.middle_name, employee.last_name].filter(Boolean);
    return parts.join(' ');
  };

  const getEmployeeTypeColor = (type: string) => {
    switch (type) {
      case 'expatriate': return 'bg-blue-100 text-blue-800';
      case 'regular': return 'bg-green-100 text-green-800';
      case 'piece_rate': return 'bg-amber-100 text-amber-800';
      case 'intern': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <DialogTitle>
                {showAssign ? `Assign Employee to ${payGroup?.name}` : `Employees in ${payGroup?.name}`}
                {!showAssign && (
                  <AnimatePresence>
                    <motion.span
                      key={employees.length}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="inline-flex items-center justify-center text-xs font-semibold bg-green-100 text-green-700 rounded-full px-2 py-0.5 ml-2"
                    >
                      {employees.length}
                    </motion.span>
                  </AnimatePresence>
                )}
              </DialogTitle>
            </div>
            {!showAssign && (
              <Button
                onClick={() => setShowAssign(true)}
                className="p-2 rounded-full bg-primary text-white hover:bg-primary/90 transition-colors"
                title="Add Employee"
              >
                <UserPlus className="h-4 w-4" />
              </Button>
            )}
          </div>
          <DialogDescription>
            {showAssign
              ? 'Select an employee to assign to this pay group'
              : `Manage employees assigned to this ${payGroup?.type} pay group`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Back to List Button */}
          {showAssign && (
            <div className="flex justify-start">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAssign(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                title="Back to List"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Content */}
          <AnimatePresence mode="wait">
            {!showAssign ? (
              <motion.div
                key="list-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2 text-muted-foreground">Loading employees...</span>
                  </div>
                ) : employees.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No employees assigned</h3>
                    <p className="text-muted-foreground">
                      This pay group doesn't have any employees assigned yet.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {employees.map((record) => (
                      <motion.div
                        key={record.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex justify-between items-center p-4 border rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-medium text-gray-900">
                              {getFullName(record.employees)}
                            </h4>
                            <Badge
                              variant="secondary"
                              className={getEmployeeTypeColor(record.employees.employee_type)}
                            >
                              {record.employees.employee_type}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p>{record.employees.email}</p>
                            {record.employees.sub_department && (
                              <p>Sub-Department: {record.employees.sub_department}</p>
                            )}
                            <p>Assigned: {new Date(record.assigned_at).toLocaleDateString()}</p>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemove(record.employee_id)}
                          disabled={removing === record.employee_id}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          {removing === record.employee_id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="assign-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <div className="space-y-4">
                  {/* Pay Group Info */}
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-medium text-blue-900 mb-1">Assigning to: {payGroup.name}</h4>
                    <p className="text-sm text-blue-700 mb-2">
                      Showing only {payGroup.type} employees eligible for this pay group
                    </p>
                    <p className="text-xs text-blue-600">
                      💡 If an employee is already in another pay group, they will be moved to this one automatically.
                    </p>
                  </div>

                  {/* Employee Selection */}
                  <div className="space-y-3">
                    <Label htmlFor="employee-select">Select Employee *</Label>
                    <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose an employee to assign" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableEmployees.length === 0 ? (
                          <SelectItem value="no-employees" disabled>
                            No eligible employees available
                          </SelectItem>
                        ) : (
                          availableEmployees.map((employee) => (
                            <SelectItem key={employee.id} value={employee.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {[employee.first_name, employee.middle_name, employee.last_name].filter(Boolean).join(' ')}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {employee.email} • {employee.employee_type}
                                </span>
                                {employee.currentPayGroup && (
                                  <span className="text-xs text-orange-600 font-medium">
                                    Currently in: {employee.currentPayGroup.name} ({employee.currentPayGroup.type})
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-4">
                    <Button
                      onClick={handleAssignment}
                      disabled={!selectedEmployee || assigning}
                      className="flex-1"
                    >
                      {assigning ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Assigning...
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Assign Employee
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowAssign(false)}
                      disabled={assigning}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
};
