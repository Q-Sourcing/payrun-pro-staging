import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Users, 
  Globe2, 
  Briefcase, 
  GraduationCap, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Eye,
  Calendar,
  DollarSign,
  MapPin,
  TrendingUp,
  UserPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { PayGroup, PAYGROUP_TYPES, getCurrencySymbol, formatCurrency } from '@/lib/types/paygroups';
import { PayGroupsService } from '@/lib/services/paygroups.service';
import { ViewAssignedEmployeesDialog } from './ViewAssignedEmployeesDialog';
import { supabase } from '@/integrations/supabase/client';
import { getPayGroupTypeColor, getPayGroupTypeIconClass } from '@/lib/utils/paygroup-utils';

interface PayGroupCardProps {
  group: PayGroup;
  onUpdate: () => void;
  onAssignEmployee?: (group: PayGroup) => void;
}

export const PayGroupCard: React.FC<PayGroupCardProps> = ({ group, onUpdate, onAssignEmployee }) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showViewEmployeesDialog, setShowViewEmployeesDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [employeeCount, setEmployeeCount] = useState<number>(0);
  const [loadingCount, setLoadingCount] = useState<boolean>(false);
  const { toast } = useToast();

  const typeDefinition = PAYGROUP_TYPES[group.type];

  // Fetch employee count and set up realtime updates
  useEffect(() => {
    if (group?.id) {
      fetchEmployeeCount();
    }

    // Subscribe to realtime updates for this pay group
    const subscription = supabase
      .channel(`paygroup_employees_${group.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'paygroup_employees',
          filter: `pay_group_id=eq.${group.id}`,
        },
        () => {
          fetchEmployeeCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [group.id]);

  const fetchEmployeeCount = async () => {
    setLoadingCount(true);
    try {
      const { count, error } = await supabase
        .from('paygroup_employees')
        .select('id', { count: 'exact', head: true })
        .eq('pay_group_id', group.id)
        .eq('active', true);

      if (!error && count !== null) {
        setEmployeeCount(count);
      }
    } catch (error) {
      console.error('Error fetching employee count:', error);
    } finally {
      setLoadingCount(false);
    }
  };

  // Get icon for pay group type
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'regular': return <Users className="h-5 w-5" />;
      case 'expatriate': return <Globe2 className="h-5 w-5" />;
      case 'contractor': return <Briefcase className="h-5 w-5" />;
      case 'intern': return <GraduationCap className="h-5 w-5" />;
      default: return <Users className="h-5 w-5" />;
    }
  };

  // Handle delete pay group
  const handleDelete = async () => {
    setDeleting(true);
    try {
      await PayGroupsService.deletePayGroup(group.id, group.type);
      toast({
        title: 'Success',
        description: `${typeDefinition.name} "${group.name}" has been deleted.`,
      });
      onUpdate();
    } catch (error) {
      console.error('Error deleting pay group:', error);
      toast({
        title: 'Error',
        description: `Failed to delete pay group: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    return status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <>
      <motion.div
        whileHover={{ y: -2, scale: 1.02 }}
        transition={{ duration: 0.2 }}
      >
        <Card className="h-full hover:shadow-md transition-all duration-200 rounded-xl">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${getPayGroupTypeIconClass(group.type)}`}>
                  {getTypeIcon(group.type)}
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base font-semibold line-clamp-1 flex items-center gap-2">
                    {group.name}
                    <AnimatePresence>
                      <motion.span
                        key={employeeCount}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className={`inline-flex items-center justify-center text-xs font-semibold rounded-full px-2 py-0.5 ${
                          loadingCount
                            ? "bg-gray-100 text-gray-400"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {loadingCount ? "..." : employeeCount}
                      </motion.span>
                    </AnimatePresence>
                  </CardTitle>
                  <CardDescription className="text-xs text-gray-500 mt-1">
                    {group.type} • {group.currency}
                  </CardDescription>
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                <Badge className={getStatusColor(group.status)}>
                  {group.status}
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => setShowDeleteDialog(true)}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            {/* Essential Info */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Country</span>
                <span className="font-medium">{group.country}</span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Frequency</span>
                <span className="font-medium capitalize">
                  {(group as any).pay_frequency?.replace('-', ' ') || 'N/A'}
                </span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Tax Rate</span>
                <span className="font-medium">
                  {(group as any).default_tax_percentage || 0}%
                </span>
              </div>
            </div>

            {/* Icon Actions */}
            <div className="flex justify-between items-center pt-3 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowViewEmployeesDialog(true)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                title="View Employees"
              >
                <Eye className="h-5 w-5 text-gray-600" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onAssignEmployee?.(group)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                title="Add Employee"
              >
                <UserPlus className="h-5 w-5 text-blue-600" />
              </Button>
            </div>

            {/* Footer */}
            <div className="text-xs text-gray-400 flex justify-between items-center">
              <span>{formatDate(group.created_at)}</span>
              <span className="capitalize">{group.type} PayGroup</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Pay Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the pay group "{group.name}"? This action cannot be undone.
              {group.employee_count > 0 && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800">
                  <strong>Warning:</strong> This pay group has {group.employee_count} employee(s). 
                  Deleting it may affect their payroll records.
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Employees Dialog */}
      <ViewAssignedEmployeesDialog
        open={showViewEmployeesDialog}
        onOpenChange={setShowViewEmployeesDialog}
        payGroup={group}
        onUpdate={() => {
          fetchEmployeeCount();
          onUpdate();
        }}
      />
    </>
  );
};
