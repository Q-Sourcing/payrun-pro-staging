import React, { useState, useEffect } from 'react';
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
    department?: string;
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

  // Load assigned employees and set up realtime updates
  useEffect(() => {
    if (open && payGroup?.id) {
      fetchAssignedEmployees();
    }

    // Subscribe to realtime updates for this pay group
    const subscription = supabase
      .channel(`view_employees_${payGroup?.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'paygroup_employees',
          filter: `pay_group_id=eq.${payGroup?.id}`,
        },
        () => {
          fetchAssignedEmployees();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [open, payGroup?.id]);

  // Load available employees when switching to assign mode
  useEffect(() => {
    if (showAssign && payGroup?.id) {
      loadAvailableEmployees();
    }
  }, [showAssign, payGroup]);

  const fetchAssignedEmployees = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('paygroup_employees')
        .select(`
          id,
          employee_id,
          assigned_at,
          active,
          employees (
            id,
            first_name,
            middle_name,
            last_name,
            email,
            employee_type,
            department
          )
        `)
        .eq('pay_group_id', payGroup.id)
        .eq('active', true)
        .order('assigned_at', { ascending: false });

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching assigned employees:', error);
      toast({
        title: 'Error',
        description: 'Failed to load assigned employees',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableEmployees = async () => {
    try {
      const employeeType = getEmployeeTypeForPayGroup(payGroup.type);
      
      let query = supabase
        .from('employees')
        .select('id, first_name, middle_name, last_name, email, department, employee_type')
        .order('first_name');

      if (employeeType) {
        query = query.eq('employee_type', employeeType);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Get all active pay group assignments to check for conflicts
      const { data: allAssignments, error: assignmentError } = await supabase
        .from('paygroup_employees')
        .select(`
          employee_id,
          pay_group_id,
          active,
          pay_groups (
            id,
            name,
            type
          ),
          expatriate_pay_groups (
            id,
            name,
            type
          )
        `)
        .eq('active', true);

      if (assignmentError) throw assignmentError;

      // Create a map of employee_id to their current pay group
      const employeePayGroupMap = new Map();
      allAssignments?.forEach(assignment => {
        const payGroupData = assignment.pay_groups || assignment.expatriate_pay_groups;
        if (payGroupData) {
          employeePayGroupMap.set(assignment.employee_id, {
            id: assignment.pay_group_id,
            name: payGroupData.name,
            type: payGroupData.type
          });
        }
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
      // Step 1: Check for active duplicates before insert
      const { data: existing, error: checkError } = await supabase
        .from('paygroup_employees')
        .select('id, active')
        .eq('employee_id', selectedEmployee)
        .eq('pay_group_id', payGroup.id)
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

      if (existing && existing.active) {
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
      // Soft delete by setting active to false
      const { error } = await supabase
        .from('paygroup_employees')
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
      case 'local': return 'bg-green-100 text-green-800';
      case 'contractor': return 'bg-orange-100 text-orange-800';
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
                            {record.employees.department && (
                              <p>Department: {record.employees.department}</p>
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
                          <SelectItem value="" disabled>
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
