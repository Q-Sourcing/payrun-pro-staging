import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Globe, DollarSign } from 'lucide-react';
import { ExpatriatePayrollService } from '@/lib/services/expatriate-payroll';
import type { ExpatriatePayGroup, ExpatriatePayGroupFormData } from '@/lib/types/expatriate-payroll';
import { EXPATRIATE_CURRENCIES, SUPPORTED_TAX_COUNTRIES } from '@/lib/types/expatriate-payroll';

export const ExpatriatePayGroupsSection: React.FC = () => {
  const [expatriatePayGroups, setExpatriatePayGroups] = useState<ExpatriatePayGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPayGroup, setEditingPayGroup] = useState<ExpatriatePayGroup | null>(null);
  const [formData, setFormData] = useState<ExpatriatePayGroupFormData>({
    name: '',
    country: '',
    currency: 'USD',
    exchange_rate_to_local: 0,
    default_daily_rate: 0,
    tax_country: 'UG',
    notes: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    loadExpatriatePayGroups();
  }, []);

  const loadExpatriatePayGroups = async () => {
    try {
      setIsLoading(true);
      const payGroups = await ExpatriatePayrollService.getExpatriatePayGroups();
      setExpatriatePayGroups(payGroups);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load expatriate pay groups',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPayGroup) {
        await ExpatriatePayrollService.updateExpatriatePayGroup(editingPayGroup.id, formData);
        toast({
          title: 'Success',
          description: 'Expatriate pay group updated successfully'
        });
      } else {
        await ExpatriatePayrollService.createExpatriatePayGroup(formData);
        toast({
          title: 'Success',
          description: 'Expatriate pay group created successfully'
        });
      }
      
      setIsDialogOpen(false);
      setEditingPayGroup(null);
      resetForm();
      loadExpatriatePayGroups();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save expatriate pay group',
        variant: 'destructive'
      });
    }
  };

  const handleEdit = (payGroup: ExpatriatePayGroup) => {
    setEditingPayGroup(payGroup);
    setFormData({
      name: payGroup.name,
      country: payGroup.country,
      currency: payGroup.currency,
      exchange_rate_to_local: payGroup.exchange_rate_to_local,
      default_daily_rate: payGroup.default_daily_rate,
      tax_country: payGroup.tax_country,
      notes: payGroup.notes || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await ExpatriatePayrollService.deleteExpatriatePayGroup(id);
      toast({
        title: 'Success',
        description: 'Expatriate pay group deleted successfully'
      });
      loadExpatriatePayGroups();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete expatriate pay group',
        variant: 'destructive'
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      country: '',
      currency: 'USD',
      exchange_rate_to_local: 0,
      default_daily_rate: 0,
      tax_country: 'UG',
      notes: ''
    });
  };

  const openCreateDialog = () => {
    setEditingPayGroup(null);
    resetForm();
    setIsDialogOpen(true);
  };

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-blue-600" />
          <CardTitle className="text-blue-900">Expatriate PayGroups</CardTitle>
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            🇺🇸 USD → Local
          </Badge>
        </div>
        <CardDescription>
          Manage expatriate payroll groups for employees paid in foreign currencies with daily rates
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center mb-4">
          <div className="text-sm text-muted-foreground">
            {expatriatePayGroups.length} expatriate pay group{expatriatePayGroups.length !== 1 ? 's' : ''}
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Add Expatriate PayGroup
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingPayGroup ? 'Edit Expatriate PayGroup' : 'Create Expatriate PayGroup'}
                </DialogTitle>
                <DialogDescription>
                  Configure expatriate payroll settings for foreign currency daily rate employees
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">PayGroup Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., US Expatriates - Uganda"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="country">Country *</Label>
                    <Input
                      id="country"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      placeholder="e.g., Uganda"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="currency">Currency *</Label>
                    <Select
                      value={formData.currency}
                      onValueChange={(value) => setFormData({ ...formData, currency: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        {EXPATRIATE_CURRENCIES.map((currency) => (
                          <SelectItem key={currency.code} value={currency.code}>
                            {currency.symbol} {currency.code} - {currency.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="exchange_rate">Exchange Rate to Local *</Label>
                    <Input
                      id="exchange_rate"
                      type="number"
                      step="0.0001"
                      value={formData.exchange_rate_to_local}
                      onChange={(e) => setFormData({ ...formData, exchange_rate_to_local: parseFloat(e.target.value) })}
                      placeholder="e.g., 3800"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="daily_rate">Default Daily Rate *</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="daily_rate"
                        type="number"
                        step="0.01"
                        value={formData.default_daily_rate}
                        onChange={(e) => setFormData({ ...formData, default_daily_rate: parseFloat(e.target.value) })}
                        placeholder="e.g., 150"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="tax_country">Tax Country *</Label>
                    <Select
                      value={formData.tax_country}
                      onValueChange={(value) => setFormData({ ...formData, tax_country: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select tax country" />
                      </SelectTrigger>
                      <SelectContent>
                        {SUPPORTED_TAX_COUNTRIES.map((country) => (
                          <SelectItem key={country.code} value={country.code}>
                            {country.name} ({country.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes about this expatriate pay group..."
                    rows={3}
                  />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                    {editingPayGroup ? 'Update' : 'Create'} PayGroup
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : expatriatePayGroups.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No expatriate pay groups found</p>
            <p className="text-sm">Create your first expatriate pay group to get started</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Daily Rate</TableHead>
                <TableHead>Exchange Rate</TableHead>
                <TableHead>Tax Country</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expatriatePayGroups.map((payGroup) => (
                <TableRow key={payGroup.id}>
                  <TableCell className="font-medium">{payGroup.name}</TableCell>
                  <TableCell>{payGroup.country}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700">
                      {ExpatriatePayrollService.getCurrencySymbol(payGroup.currency)} {payGroup.currency}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {ExpatriatePayrollService.formatCurrency(payGroup.default_daily_rate, payGroup.currency)}
                  </TableCell>
                  <TableCell>
                    {payGroup.exchange_rate_to_local.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {payGroup.tax_country}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(payGroup)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Expatriate PayGroup</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{payGroup.name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(payGroup.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
