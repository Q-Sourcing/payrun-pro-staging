import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  UserPlus, 
  ArrowLeft, 
  Search, 
  Trash2, 
  Mail, 
  Building2,
  Users,
  X
} from 'lucide-react';
import { useEmployeesByPayGroup, useAssignEmployee, useRemoveEmployeeFromPayGroup } from '@/hooks/use-paygroup-employees';
import { useDebouncedSearch } from '@/hooks/use-debounced-search';
import { getEmployeeTypeForPayGroup } from '@/lib/utils/paygroup-utils';
import type { PayGroup } from '@/lib/types/paygroups';

interface OptimizedViewAssignedEmployeesDialogProps {
  payGroup: PayGroup;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function OptimizedViewAssignedEmployeesDialog({
  payGroup,
  isOpen,
  onClose,
  onUpdate
}: OptimizedViewAssignedEmployeesDialogProps) {
  const [showAssign, setShowAssign] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Use optimized hooks with caching
  const { 
    data: assignedEmployees, 
    isLoading: loadingAssigned,
    error: assignedError 
  } = useEmployeesByPayGroup(payGroup.id, { active_only: true });

  const assignEmployeeMutation = useAssignEmployee();
  const removeEmployeeMutation = useRemoveEmployeeFromPayGroup();

  // Debounced search for assigned employees
  const { results: filteredEmployees, loading: searchLoading } = useDebouncedSearch(
    async (term: string) => {
      if (!assignedEmployees) return [];
      return assignedEmployees.filter(emp =>
        `${emp.employee.first_name} ${emp.employee.last_name}`.toLowerCase().includes(term.toLowerCase()) ||
        emp.employee.email.toLowerCase().includes(term.toLowerCase())
      );
    },
    300,
    1
  );

  const handleRemoveEmployee = async (employeeId: string) => {
    try {
      await removeEmployeeMutation.mutateAsync({
        employeeId,
        payGroupId: payGroup.id
      });
      onUpdate?.();
    } catch (error) {
      console.error('Error removing employee:', error);
    }
  };

  const handleAssignEmployee = async (employeeId: string) => {
    try {
      await assignEmployeeMutation.mutateAsync({
        employeeId,
        payGroupId: payGroup.id
      });
      setShowAssign(false);
      onUpdate?.();
    } catch (error) {
      console.error('Error assigning employee:', error);
    }
  };

  const displayEmployees = searchTerm.length >= 1 ? filteredEmployees : assignedEmployees || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {showAssign && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAssign(false)}
                  className="p-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {showAssign ? 'Assign Employee' : 'Employees in'} {payGroup.name}
                  {!showAssign && (
                    <Badge variant="secondary" className="ml-2">
                      {assignedEmployees?.length || 0} employees
                    </Badge>
                  )}
                </DialogTitle>
                <p className="text-sm text-gray-500 mt-1">
                  {showAssign 
                    ? `Add employees to ${payGroup.name} pay group`
                    : `Manage employees assigned to ${payGroup.name}`
                  }
                </p>
              </div>
            </div>
            
            {!showAssign && (
              <Button
                onClick={() => setShowAssign(true)}
                size="sm"
                className="rounded-full p-2"
              >
                <UserPlus className="h-4 w-4" />
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {showAssign ? (
              <motion.div
                key="assign-view"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="h-full flex flex-col"
              >
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 mb-4">
                  <h4 className="font-medium text-blue-900 mb-1">Assigning to: {payGroup.name}</h4>
                  <p className="text-sm text-blue-700 mb-2">
                    Showing only {payGroup.type} employees eligible for this pay group
                  </p>
                  <p className="text-xs text-blue-600">
                    💡 If an employee is already in another pay group, they will be moved to this one automatically.
                  </p>
                </div>

                {/* Search for available employees */}
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search employees to assign..."
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Available employees list */}
                <div className="flex-1 overflow-y-auto">
                  <div className="space-y-2">
                    {/* This would be populated with available employees */}
                    <div className="text-center py-8 text-gray-500">
                      <UserPlus className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>Available employees will be listed here</p>
                      <p className="text-sm">Search functionality coming soon...</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="list-view"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="h-full flex flex-col"
              >
                {/* Search */}
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search assigned employees..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                    {searchTerm && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSearchTerm('')}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 h-6 w-6"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Employees List */}
                <div className="flex-1 overflow-y-auto">
                  {loadingAssigned ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                        <p className="text-sm text-gray-600">Loading employees...</p>
                      </div>
                    </div>
                  ) : assignedError ? (
                    <div className="text-center py-8">
                      <p className="text-red-600 mb-2">Failed to load employees</p>
                      <p className="text-sm text-gray-500">{assignedError.message}</p>
                    </div>
                  ) : displayEmployees.length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {searchTerm ? 'No employees found' : 'No employees assigned yet'}
                      </h3>
                      <p className="text-gray-500 mb-4">
                        {searchTerm 
                          ? 'Try adjusting your search terms'
                          : 'Get started by assigning employees to this pay group'
                        }
                      </p>
                      {!searchTerm && (
                        <Button onClick={() => setShowAssign(true)}>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Assign First Employee
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {displayEmployees.map((assignment) => {
                        const employee = assignment.employee;
                        const initials = `${employee.first_name[0]}${employee.last_name[0]}`.toUpperCase();
                        
                        return (
                          <motion.div
                            key={assignment.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center justify-between p-4 bg-white border rounded-lg hover:shadow-sm transition-shadow"
                          >
                            <div className="flex items-center space-x-3">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback className="bg-blue-100 text-blue-600">
                                  {initials}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <h4 className="font-medium text-gray-900">
                                  {employee.first_name} {employee.middle_name} {employee.last_name}
                                </h4>
                                <div className="flex items-center space-x-4 text-sm text-gray-500">
                                  <div className="flex items-center space-x-1">
                                    <Mail className="h-3 w-3" />
                                    <span>{employee.email}</span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <Building2 className="h-3 w-3" />
                                    <span>{employee.department || 'No department'}</span>
                                  </div>
                                </div>
                                <div className="mt-1">
                                  <Badge variant="outline" className="text-xs">
                                    {employee.employee_type}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <div className="text-right text-sm text-gray-500">
                                <p>Assigned {new Date(assignment.assigned_at).toLocaleDateString()}</p>
                                {assignment.assigned_by && (
                                  <p className="text-xs">by {assignment.assigned_by}</p>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveEmployee(employee.id)}
                                disabled={removeEmployeeMutation.isPending}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
