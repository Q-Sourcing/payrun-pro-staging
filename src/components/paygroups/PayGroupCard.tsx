import React, { useState, useEffect, useCallback } from 'react';
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
  Package,
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
import { usePaygroupRealtimeForGroup } from '@/hooks/usePaygroupRealtime';
import { ExpatriatePayrollService } from '@/lib/services/expatriate-payroll';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ExpatriatePayGroup } from '@/lib/types/expatriate-payroll';
import { EXPATRIATE_CURRENCIES, SUPPORTED_TAX_COUNTRIES } from '@/lib/types/expatriate-payroll';

interface PayGroupCardProps {
  group: PayGroup;
  onUpdate: () => void;
  onAssignEmployee?: (group: PayGroup) => void;
}

export const PayGroupCard: React.FC<PayGroupCardProps> = ({ group, onUpdate, onAssignEmployee }) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showViewEmployeesDialog, setShowViewEmployeesDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [expatriateDetails, setExpatriateDetails] = useState<ExpatriatePayGroup | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [employeeCount, setEmployeeCount] = useState<number>(0);
  const [loadingCount, setLoadingCount] = useState<boolean>(false);
  const { toast } = useToast();

  const typeDefinition = PAYGROUP_TYPES[group.type];

  // Fetch employee count function
  const fetchEmployeeCount = useCallback(async () => {
    setLoadingCount(true);
    try {
      const isHeadOffice = group?.category === 'head_office';
      const tableName = isHeadOffice ? 'head_office_pay_group_members' : 'paygroup_employees';

      const { data, error } = await (supabase as any)
        .from(tableName)
        .select('employee_id')
        .eq('pay_group_id', group.id)
        .eq('active', true);

      if (!error && data) {
        setEmployeeCount(data.length);
      }
    } catch (error) {
      console.error('Error fetching employee count:', error);
    } finally {
      setLoadingCount(false);
    }
  }, [group.id, group.category]);

  // Fetch employee count on mount
  useEffect(() => {
    if (group?.id) {
      fetchEmployeeCount();
    }
  }, [group.id, fetchEmployeeCount]);

  // Set up realtime updates for this pay group
  usePaygroupRealtimeForGroup(group.id, {
    tableName: group?.category === 'head_office' ? 'head_office_pay_group_members' : 'paygroup_employees',
    refetch: fetchEmployeeCount,
    onEmployeeAdded: (payload) => {
      console.log(`✅ Employee added to ${group.name}:`, payload);
      fetchEmployeeCount();
    },
    onEmployeeRemoved: (payload) => {
      console.log(`❌ Employee removed from ${group.name}:`, payload);
      fetchEmployeeCount();
    },
    onEmployeeUpdated: (payload) => {
      console.log(`🔄 Employee updated in ${group.name}:`, payload);
      fetchEmployeeCount();
    }
  });

  // Get icon for pay group type
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'regular': return <Users className="h-5 w-5" />;
      case 'expatriate': return <Globe2 className="h-5 w-5" />;
      case 'piece_rate': return <Package className="h-5 w-5" />;
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

  // Load expatriate pay group details
  const loadExpatriateDetails = async () => {
    if (group.type !== 'expatriate') return;

    setLoadingDetails(true);
    try {
      const details = await ExpatriatePayrollService.getExpatriatePayGroup(group.id);
      setExpatriateDetails(details);
    } catch (error: any) {
      console.error('Error loading expatriate details:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load pay group details',
        variant: 'destructive'
      });
    } finally {
      setLoadingDetails(false);
    }
  };

  // Handle view details (Eye icon) or Edit
  const handleViewDetails = () => {
    if (group.type === 'expatriate') {
      setShowDetailsDialog(true);
      loadExpatriateDetails();
    } else {
      // For non-expatriate groups, show employees dialog
      setShowViewEmployeesDialog(true);
    }
  };

  // Handle edit
  const handleEdit = () => {
    if (group.type === 'expatriate') {
      setShowDetailsDialog(true);
      loadExpatriateDetails();
    }
    // For other types, the Edit button in dropdown should trigger edit modal
    // This is handled by parent component
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
                        className={`inline-flex items-center justify-center text-xs font-semibold rounded-full px-2 py-0.5 ${loadingCount
                          ? "bg-gray-100 text-gray-400"
                          : "bg-green-100 text-green-700"
                          }`}
                      >
                        {loadingCount ? "..." : employeeCount}
                      </motion.span>
                    </AnimatePresence>
                  </CardTitle>
                  <CardDescription className="text-xs text-gray-500 mt-1">
                    {group.type === 'regular' || (group.type as any) === 'local' ? 'regular' : group.type} • {group.currency}
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
                    <DropdownMenuItem onClick={handleEdit}>
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
                onClick={handleViewDetails}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                title={group.type === 'expatriate' ? 'View Pay Group Details' : 'View Employees'}
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
              <span className="capitalize">{group.type === 'regular' || (group.type as any) === 'local' ? 'regular' : group.type} PayGroup</span>
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

      {/* Expatriate Pay Group Details Dialog */}
      {group.type === 'expatriate' && (
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Expatriate Pay Group Details</DialogTitle>
              <DialogDescription>
                View and edit expatriate pay group settings
              </DialogDescription>
            </DialogHeader>
            {loadingDetails ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : expatriateDetails ? (
              <ExpatriatePayGroupDetailsView
                payGroup={expatriateDetails}
                onClose={() => setShowDetailsDialog(false)}
                onUpdate={() => {
                  loadExpatriateDetails();
                  onUpdate();
                }}
              />
            ) : (
              <div className="py-4 text-center text-muted-foreground">
                Failed to load pay group details
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

// Expatriate Pay Group Details View Component
const ExpatriatePayGroupDetailsView: React.FC<{
  payGroup: ExpatriatePayGroup;
  onClose: () => void;
  onUpdate: () => void;
}> = ({ payGroup, onClose, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: payGroup.name,
    country: payGroup.country,
    currency: payGroup.currency,
    exchange_rate_to_local: payGroup.exchange_rate_to_local,
    tax_country: payGroup.tax_country,
    notes: payGroup.notes || ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Update formData when payGroup changes
  useEffect(() => {
    if (!isEditing) {
      setFormData({
        name: payGroup.name,
        country: payGroup.country,
        currency: payGroup.currency,
        exchange_rate_to_local: payGroup.exchange_rate_to_local,
        tax_country: payGroup.tax_country,
        notes: payGroup.notes || ''
      });
    }
  }, [payGroup, isEditing]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await ExpatriatePayrollService.updateExpatriatePayGroup(payGroup.id, formData);
      toast({
        title: 'Success',
        description: 'Pay group updated successfully'
      });
      setIsEditing(false);
      onUpdate();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update pay group',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Pay Group Name</Label>
          {isEditing ? (
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          ) : (
            <p className="font-medium text-sm mt-1">{payGroup.name}</p>
          )}
        </div>
        <div>
          <Label>Country</Label>
          {isEditing ? (
            <Input
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
            />
          ) : (
            <p className="font-medium text-sm mt-1">{payGroup.country}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Currency</Label>
          {isEditing ? (
            <Select
              value={formData.currency}
              onValueChange={(value) => setFormData({ ...formData, currency: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPATRIATE_CURRENCIES.map((currency) => (
                  <SelectItem key={currency.code} value={currency.code}>
                    {currency.symbol} {currency.code} - {currency.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="font-medium text-sm mt-1">
              {ExpatriatePayrollService.getCurrencySymbol(payGroup.currency)} {payGroup.currency}
            </p>
          )}
        </div>
        <div>
          <Label>Exchange Rate to Local</Label>
          {isEditing ? (
            <Input
              type="number"
              step="0.0001"
              value={formData.exchange_rate_to_local}
              onChange={(e) => setFormData({ ...formData, exchange_rate_to_local: parseFloat(e.target.value) || 0 })}
            />
          ) : (
            <p className="font-medium text-sm mt-1">
              1 {payGroup.currency} = {payGroup.exchange_rate_to_local.toLocaleString()} UGX
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Tax Country</Label>
          {isEditing ? (
            <Select
              value={formData.tax_country}
              onValueChange={(value) => setFormData({ ...formData, tax_country: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_TAX_COUNTRIES.map((country) => (
                  <SelectItem key={country.code} value={country.code}>
                    {country.name} ({country.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="font-medium text-sm mt-1">{payGroup.tax_country}</p>
          )}
        </div>
      </div>

      <div>
        <Label>Notes</Label>
        {isEditing ? (
          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
          />
        ) : (
          <p className="font-medium text-sm mt-1">{payGroup.notes || 'No notes'}</p>
        )}
      </div>

      <DialogFooter>
        <div className="flex justify-between items-center w-full">
          <div className="text-sm text-muted-foreground">
            Created: {new Date(payGroup.created_at).toLocaleDateString()}
            {payGroup.updated_at !== payGroup.created_at && (
              <span className="ml-2">
                • Updated: {new Date(payGroup.updated_at).toLocaleDateString()}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={() => {
                  setIsEditing(false);
                  setFormData({
                    name: payGroup.name,
                    country: payGroup.country,
                    currency: payGroup.currency,
                    exchange_rate_to_local: payGroup.exchange_rate_to_local,
                    tax_country: payGroup.tax_country,
                    notes: payGroup.notes || ''
                  });
                }} disabled={isSaving}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
                <Button onClick={() => setIsEditing(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogFooter>
    </div>
  );
};
