import React, { useState } from 'react';
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
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { PayGroup, PAYGROUP_TYPES, getCurrencySymbol, formatCurrency } from '@/lib/types/paygroups';
import { PayGroupsService } from '@/lib/services/paygroups.service';
import { ViewAssignedEmployeesDialog } from './ViewAssignedEmployeesDialog';

interface PayGroupCardProps {
  group: PayGroup;
  onUpdate: () => void;
  onAssignEmployee?: (group: PayGroup) => void;
}

export const PayGroupCard: React.FC<PayGroupCardProps> = ({ group, onUpdate, onAssignEmployee }) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showViewEmployeesDialog, setShowViewEmployeesDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  const typeDefinition = PAYGROUP_TYPES[group.type];

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
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
      >
        <Card className="h-full hover:shadow-md transition-shadow duration-200 rounded-2xl">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-2xl bg-${typeDefinition.color}-100`}>
                  {getTypeIcon(group.type)}
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold line-clamp-1">
                    {group.name}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-1 mt-1">
                    <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                      {group.paygroup_id}
                    </span>
                  </CardDescription>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge className={getStatusColor(group.status)}>
                  {group.status}
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
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

          <CardContent className="space-y-4">
            {/* Basic Info */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  Country
                </span>
                <span className="font-medium">{group.country}</span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <DollarSign className="h-3 w-3" />
                  Currency
                </span>
                <Badge variant="outline" className="font-mono">
                  {group.currency}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Users className="h-3 w-3" />
                  Employees
                </span>
                <span className="font-medium">{group.employee_count}</span>
              </div>
            </div>

            {/* Type-specific Info */}
            {group.type === 'regular' && (
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    Frequency
                  </span>
                  <span className="font-medium capitalize">
                    {(group as any).pay_frequency?.replace('-', ' ') || 'N/A'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <TrendingUp className="h-3 w-3" />
                    Tax Rate
                  </span>
                  <span className="font-medium">
                    {(group as any).default_tax_percentage || 0}%
                  </span>
                </div>
              </div>
            )}

            {group.type === 'expatriate' && (
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <DollarSign className="h-3 w-3" />
                    Daily Rate
                  </span>
                  <span className="font-medium">
                    {formatCurrency((group as any).default_daily_rate || 0, group.currency)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Globe2 className="h-3 w-3" />
                    Exchange Rate
                  </span>
                  <span className="font-medium">
                    1 {group.currency} = {(group as any).exchange_rate_to_local?.toLocaleString() || 0} UGX
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    Tax Country
                  </span>
                  <span className="font-medium">
                    {(group as any).tax_country || 'N/A'}
                  </span>
                </div>
              </div>
            )}

            {group.type === 'contractor' && (
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    Duration
                  </span>
                  <span className="font-medium">
                    {(group as any).contract_duration || 0} months
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <DollarSign className="h-3 w-3" />
                    Hourly Rate
                  </span>
                  <span className="font-medium">
                    {formatCurrency((group as any).default_hourly_rate || 0, group.currency)}
                  </span>
                </div>
              </div>
            )}

            {group.type === 'intern' && (
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    Duration
                  </span>
                  <span className="font-medium">
                    {(group as any).internship_duration || 0} months
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <DollarSign className="h-3 w-3" />
                    Stipend
                  </span>
                  <span className="font-medium">
                    {formatCurrency((group as any).stipend_amount || 0, group.currency)}
                  </span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 border-t space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setShowViewEmployeesDialog(true)}
              >
                <Users className="h-4 w-4 mr-2" />
                View Employees ({group.employee_count})
              </Button>
              <Button
                variant="default"
                size="sm"
                className="w-full"
                onClick={() => onAssignEmployee?.(group)}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add Employee
              </Button>
            </div>

            {/* Footer */}
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Created {formatDate(group.created_at)}</span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  {typeDefinition.name}
                </span>
              </div>
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
        onUpdate={onUpdate}
      />
    </>
  );
};
