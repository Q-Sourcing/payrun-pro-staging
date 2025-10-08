import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { PayslipGenerator } from '@/lib/services/payslip-generator';
import { PayslipPDFExport } from '@/lib/services/payslip-pdf-export';
import { DEFAULT_PAYSLIP_TEMPLATES } from '@/lib/constants/payslip-templates';
import { PayslipData, PayslipTemplateConfig, PayslipExportSettings } from '@/lib/types/payslip';
import { useToast } from '@/hooks/use-toast';
import { 
  FileText, 
  Download, 
  User, 
  Calendar,
  DollarSign,
  Building,
  Palette,
  Eye,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface IndividualPayslipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payRunId: string;
  employeeId?: string;
  employeeName?: string;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  gross_pay: number;
  net_pay: number;
}

export const IndividualPayslipDialog: React.FC<IndividualPayslipDialogProps> = ({
  open,
  onOpenChange,
  payRunId,
  employeeId: initialEmployeeId,
  employeeName: initialEmployeeName
}) => {
  const [selectedEmployee, setSelectedEmployee] = useState<string>(initialEmployeeId || '');
  const [selectedTemplate, setSelectedTemplate] = useState('corporate');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payslipData, setPayslipData] = useState<PayslipData | null>(null);
  const [templateConfig, setTemplateConfig] = useState<PayslipTemplateConfig | null>(null);
  const [generating, setGenerating] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchEmployees();
      loadTemplateConfig();
      
      // Auto-generate payslip data if employee is pre-selected
      if (initialEmployeeId) {
        setSelectedEmployee(initialEmployeeId);
        // Generate payslip data automatically
        setTimeout(async () => {
          try {
            setGenerating(true);
            const data = await PayslipGenerator.generatePayslipData(payRunId, initialEmployeeId);
            setPayslipData(data);
          } catch (error) {
            console.error('Error generating payslip data:', error);
            toast({
              title: "Error",
              description: "Failed to generate payslip data",
              variant: "destructive",
            });
          } finally {
            setGenerating(false);
          }
        }, 500);
      }
    }
  }, [open, payRunId, initialEmployeeId]);

  useEffect(() => {
    loadTemplateConfig();
  }, [selectedTemplate]);

  const fetchEmployees = async () => {
    try {
      const { data: payRunData, error } = await supabase
        .from('pay_runs')
        .select(`
          pay_items(
            *,
            employees(
              id,
              first_name,
              middle_name,
              last_name,
              email,
              department
            )
          )
        `)
        .eq('id', payRunId)
        .single();

      if (error) throw error;

      const employeeList = payRunData.pay_items.map((item: any) => ({
        id: item.employee_id,
        name: [
          item.employees.first_name,
          item.employees.middle_name,
          item.employees.last_name
        ].filter(Boolean).join(' '),
        email: item.employees.email,
        department: item.employees.department,
        gross_pay: Number(item.gross_pay || 0),
        net_pay: Number(item.net_pay || 0)
      }));

      setEmployees(employeeList);

      // Auto-select if only one employee or if employeeId is provided
      if (employeeList.length === 1) {
        setSelectedEmployee(employeeList[0].id);
      } else if (initialEmployeeId && employeeList.find(emp => emp.id === initialEmployeeId)) {
        setSelectedEmployee(initialEmployeeId);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast({
        title: "Error",
        description: "Failed to load employees for this pay run",
        variant: "destructive",
      });
    }
  };

  const loadTemplateConfig = () => {
    const template = DEFAULT_PAYSLIP_TEMPLATES.find(t => t.id === selectedTemplate);
    if (template) {
      setTemplateConfig(template.config);
    }
  };

  const generatePayslipData = async () => {
    if (!selectedEmployee) return;

    try {
      setGenerating(true);
      const data = await PayslipGenerator.generatePayslipData(payRunId, selectedEmployee);
      setPayslipData(data);
    } catch (error) {
      console.error('Error generating payslip data:', error);
      toast({
        title: "Error",
        description: "Failed to generate payslip data",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const downloadPayslip = async () => {
    if (!payslipData || !templateConfig) return;

    try {
      setGenerating(true);
      
      const exportSettings: PayslipExportSettings = {
        format: 'A4',
        orientation: 'portrait',
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        },
        quality: 'high',
        security: {
          passwordProtected: false,
          password: '',
          watermark: ''
        }
      };

      await PayslipPDFExport.downloadPDF(
        payslipData,
        templateConfig,
        exportSettings,
        `${payslipData.employee.code}_payslip.pdf`
      );

      toast({
        title: "Payslip Downloaded",
        description: `Payslip for ${payslipData.employee.name} has been downloaded`,
      });
    } catch (error) {
      console.error('Error downloading payslip:', error);
      toast({
        title: "Error",
        description: "Failed to download payslip",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const selectedEmployeeData = employees.find(emp => emp.id === selectedEmployee);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 border shadow-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate Individual Payslip
          </DialogTitle>
          <DialogDescription>
            Generate and download a payslip for a specific employee
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Selected Employee Information */}
          <Card className="bg-white dark:bg-gray-800 border dark:border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Selected Employee
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedEmployeeData && (
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Employee Details</Label>
                      <p className="text-sm text-muted-foreground">{selectedEmployeeData.name}</p>
                      <p className="text-sm text-muted-foreground">{selectedEmployeeData.email}</p>
                      <p className="text-sm text-muted-foreground">{selectedEmployeeData.department}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Pay Information</Label>
                      <p className="text-sm text-muted-foreground">
                        Gross: {new Intl.NumberFormat('en-UG', {
                          style: 'currency',
                          currency: 'UGX',
                          minimumFractionDigits: 0
                        }).format(selectedEmployeeData.gross_pay)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Net: {new Intl.NumberFormat('en-UG', {
                          style: 'currency',
                          currency: 'UGX',
                          minimumFractionDigits: 0
                        }).format(selectedEmployeeData.net_pay)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Template Selection */}
          <Card className="bg-white dark:bg-gray-800 border dark:border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Choose Template
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="template-select">Payslip Template</Label>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a template" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEFAULT_PAYSLIP_TEMPLATES.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          <div className="flex items-center gap-2">
                            <Palette className="h-4 w-4" />
                            {template.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {templateConfig && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-sm font-medium">
                      {DEFAULT_PAYSLIP_TEMPLATES.find(t => t.id === selectedTemplate)?.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {DEFAULT_PAYSLIP_TEMPLATES.find(t => t.id === selectedTemplate)?.description}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card className="bg-white dark:bg-gray-800 border dark:border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    onClick={downloadPayslip}
                    disabled={!payslipData || generating}
                    className="w-full"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {generating ? 'Downloading...' : 'Download Payslip PDF'}
                  </Button>
                </div>

                {payslipData && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Payslip data ready for {payslipData.employee.name}. 
                      Click "Download Payslip PDF" to generate and download the payslip.
                    </AlertDescription>
                  </Alert>
                )}

                {!payslipData && !generating && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Generating payslip data... This may take a moment.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Preview Section */}
          {payslipData && templateConfig && (
            <Card className="bg-white dark:bg-gray-800 border dark:border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Payslip Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="font-medium">Employee</Label>
                      <p>{payslipData.employee.name}</p>
                      <p className="text-muted-foreground">{payslipData.employee.department}</p>
                    </div>
                    <div>
                      <Label className="font-medium">Pay Period</Label>
                      <p>{payslipData.payPeriod.display}</p>
                    </div>
                    <div>
                      <Label className="font-medium">Gross Pay</Label>
                      <p>{new Intl.NumberFormat('en-UG', {
                        style: 'currency',
                        currency: 'UGX',
                        minimumFractionDigits: 0
                      }).format(payslipData.totals.gross)}</p>
                    </div>
                    <div>
                      <Label className="font-medium">Net Pay</Label>
                      <p className="font-semibold text-green-600">{new Intl.NumberFormat('en-UG', {
                        style: 'currency',
                        currency: 'UGX',
                        minimumFractionDigits: 0
                      }).format(payslipData.totals.net)}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={generating}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
