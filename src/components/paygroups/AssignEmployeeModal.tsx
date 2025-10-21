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
  Loader2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { PayGroup } from '@/lib/types/paygroups';
import { supabase } from '@/integrations/supabase/client';

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
  department?: string;
  employee_type?: string;
}

export const AssignEmployeeModal: React.FC<AssignEmployeeModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
  presetGroup,
}) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
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
        emp.department?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredEmployees(filtered);
    } else {
      setFilteredEmployees(employees);
    }
  }, [employees, searchQuery]);

  const loadEmployees = async () => {
    setLoading(true);
    try {
      // Filter employees by the same type as the pay group
      const payGroupType = presetGroup?.type;
      let query = supabase
        .from('employees')
        .select('id, first_name, middle_name, last_name, email, department, employee_type')
        .order('first_name');

      // Only show employees that match the pay group type
      if (payGroupType) {
        // Map pay group types to employee types
        const employeeTypeMap: Record<string, string> = {
          'regular': 'local',
          'expatriate': 'expatriate', 
          'contractor': 'contractor',
          'intern': 'intern'
        };
        
        const employeeType = employeeTypeMap[payGroupType];
        if (employeeType) {
          query = query.eq('employee_type', employeeType);
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      setEmployees(data || []);
      setFilteredEmployees(data || []);
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
    if (!selectedEmployee) {
      toast({
        title: 'Validation Error',
        description: 'Please select an employee to assign',
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
      // Step 1: Check for duplicates before insert
      const { data: existing, error: checkError } = await supabase
        .from('paygroup_employees')
        .select('id')
        .eq('employee_id', selectedEmployee)
        .eq('pay_group_id', targetGroupId)
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
        const employeeName = employees.find(emp => emp.id === selectedEmployee)?.first_name || 'Employee';
        toast({
          title: 'Already Assigned',
          description: `${employeeName} is already assigned to this pay group`,
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
          pay_group_id: targetGroupId,
          notes: notes || undefined
        })
      });

      const result = await response.json();

      if (!response.ok) {
        // Catch any DB constraint error (in case of race conditions)
        if (result?.error?.includes('unique_employee_in_paygroup') || result?.error?.includes('duplicate')) {
          const employeeName = employees.find(emp => emp.id === selectedEmployee)?.first_name || 'Employee';
          toast({
            title: 'Already Assigned',
            description: `${employeeName} is already assigned to this pay group`,
            variant: 'destructive',
          });
          return;
        }
        throw new Error(result?.error || 'Assignment failed');
      }

      const employeeName = employees.find(emp => emp.id === selectedEmployee)?.first_name || 'Employee';
      toast({
        title: 'Success',
        description: `${employeeName} assigned to pay group successfully`,
      });

      onSuccess();
      onOpenChange(false);
      
      // Reset form
      setSelectedEmployee('');
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
      case 'contractor': return <Briefcase className="h-4 w-4" />;
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
                  {/* This would be populated with actual pay groups */}
                  <SelectItem value="">
                    Select a pay group
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Employee Search */}
          <div className="space-y-2">
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

          {/* Employee Selection */}
          <div className="space-y-2">
            <Label>Select Employee *</Label>
            {presetGroup && (
              <p className="text-sm text-muted-foreground">
                Showing only {presetGroup.type} employees eligible for this pay group
              </p>
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
                    {filteredEmployees.map((employee) => (
                      <motion.div
                        key={employee.id}
                        className={`p-3 rounded-md cursor-pointer transition-colors ${
                          selectedEmployee === employee.id
                            ? 'bg-blue-50 border border-blue-200'
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={() => setSelectedEmployee(employee.id)}
                        whileHover={{ scale: 1.01 }}
                        transition={{ duration: 0.1 }}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">
                              {employee.first_name} {employee.last_name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {employee.email}
                            </div>
                            {employee.department && (
                              <div className="text-xs text-muted-foreground">
                                {employee.department}
                              </div>
                            )}
                          </div>
                          {employee.employee_type && (
                            <Badge variant="secondary" className="text-xs">
                              {employee.employee_type}
                            </Badge>
                          )}
                        </div>
                      </motion.div>
                    ))}
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
            disabled={!selectedEmployee || (!presetGroup && !selectedGroup) || assigning}
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
