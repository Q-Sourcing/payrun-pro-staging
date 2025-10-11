import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { log, warn, error, debug } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Download, Eye, FileSpreadsheet, Users, DollarSign, AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { BankScheduleService, BankScheduleResult } from '@/lib/services/bank-schedule-service';
import { BankScheduleExporter } from '@/lib/services/bank-schedule-exporter';

interface BankScheduleExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payRunId: string;
  payRunDate?: string;
  payPeriod?: string;
}

interface PreviewData {
  centenaryPreview: any[][];
  stanbicPreview: any[][];
  summary: {
    totalEmployees: number;
    centenaryEmployees: number;
    stanbicEmployees: number;
    centenaryTotal: number;
    stanbicTotal: number;
    grandTotal: number;
  };
}

export const BankScheduleExportDialog: React.FC<BankScheduleExportDialogProps> = ({
  open,
  onOpenChange,
  payRunId,
  payRunDate,
  payPeriod,
}) => {
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [bankScheduleData, setBankScheduleData] = useState<BankScheduleResult | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();

  // Load bank schedule data when dialog opens
  useEffect(() => {
    if (open && payRunId) {
      loadBankScheduleData();
    }
  }, [open, payRunId]);

  const loadBankScheduleData = async () => {
    setLoading(true);
    try {
      const data = await BankScheduleService.generateBankSchedule(payRunId);
      setBankScheduleData(data);

      // Validate data
      const validation = BankScheduleService.validateBankSchedule(data);
      setValidationErrors(validation.errors);

      // Generate preview
      const preview = BankScheduleExporter.generatePreview(data);
      setPreviewData(preview);

      if (validation.isValid) {
        toast({
          title: "Data loaded successfully",
          description: `Found ${preview.summary.totalEmployees} employees for bank schedule export`,
        });
      } else {
        toast({
          title: "Data validation warnings",
          description: validation.errors.join(', '),
          variant: "destructive",
        });
      }
    } catch (error) {
      error('Error loading bank schedule data:', error);
      toast({
        title: "Error loading data",
        description: error instanceof Error ? error.message : 'Failed to load bank schedule data',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    if (!bankScheduleData) return;

    setExporting(true);
    try {
      const fileName = `Bank_Schedule_${payRunId.slice(0, 8)}_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      await BankScheduleExporter.exportToExcel(bankScheduleData, {
        fileName,
        includeHeaders: true,
        includeTotals: true,
        formatCurrency: true,
      });

      toast({
        title: "Export successful",
        description: `Bank schedule exported to ${fileName}`,
      });

      onOpenChange(false);
    } catch (error) {
      error('Error exporting bank schedule:', error);
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : 'Failed to export bank schedule',
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const handleExportCSV = async (bankName: 'centenary' | 'stanbic') => {
    if (!bankScheduleData) return;

    try {
      const bankData = bankName === 'centenary' ? bankScheduleData.centenaryBank : bankScheduleData.stanbicBank;
      const fileName = `${bankName.toUpperCase()}_Bank_Schedule_${new Date().toISOString().split('T')[0]}.csv`;
      
      const csvContent = BankScheduleExporter.exportBankToCSV(
        bankData,
        bankName === 'centenary' ? 'Centenary Bank' : 'Stanbic Bank',
        bankScheduleData.payRunInfo
      );

      // Create and download CSV file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "CSV Export successful",
        description: `${bankName.toUpperCase()} bank schedule exported to ${fileName}`,
      });
    } catch (error) {
      error('Error exporting CSV:', error);
      toast({
        title: "CSV Export failed",
        description: error instanceof Error ? error.message : 'Failed to export CSV',
        variant: "destructive",
      });
    }
  };

  const renderPreviewTable = (data: any[][], title: string) => {
    if (data.length === 0) return null;

    return (
      <div className="space-y-2">
        <h4 className="font-medium text-sm">{title}</h4>
        <div className="border rounded-lg overflow-hidden">
          <div className="max-h-48 overflow-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted">
                <tr>
                  {data[0]?.map((header, index) => (
                    <th key={index} className="px-2 py-1 text-left font-medium">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.slice(1, 6).map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-t">
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className="px-2 py-1">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
                {data.length > 6 && (
                  <tr>
                    <td colSpan={data[0]?.length} className="px-2 py-1 text-center text-muted-foreground">
                      ... and {data.length - 6} more rows
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Bank Schedule Export
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary Cards */}
          {previewData && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="text-2xl font-bold">{previewData.summary.totalEmployees}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Centenary Bank</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{previewData.summary.centenaryEmployees}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {BankScheduleExporter.formatCurrency(previewData.summary.centenaryTotal)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Stanbic Bank</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{previewData.summary.stanbicEmployees}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {BankScheduleExporter.formatCurrency(previewData.summary.stanbicTotal)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium">Data validation issues:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {validationErrors.map((error, index) => (
                      <li key={index} className="text-sm">{error}</li>
                    ))}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Preview Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
                disabled={loading || !previewData}
              >
                <Eye className="w-4 h-4 mr-2" />
                {showPreview ? 'Hide Preview' : 'Show Preview'}
              </Button>
            </div>
          </div>

          {/* Preview Content */}
          {showPreview && previewData && (
            <ScrollArea className="h-64 border rounded-lg p-4">
              <div className="space-y-4">
                {renderPreviewTable(previewData.centenaryPreview, 'Centenary Bank Preview')}
                <Separator />
                {renderPreviewTable(previewData.stanbicPreview, 'Stanbic Bank Preview')}
              </div>
            </ScrollArea>
          )}

          {/* Export Actions */}
          <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
            <Button
              onClick={handleExportExcel}
              disabled={loading || exporting || validationErrors.length > 0}
              className="flex-1"
            >
              {exporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export Excel
                </>
              )}
            </Button>

            {previewData && previewData.summary.centenaryEmployees > 0 && (
              <Button
                variant="outline"
                onClick={() => handleExportCSV('centenary')}
                disabled={loading || exporting}
              >
                Export Centenary CSV
              </Button>
            )}

            {previewData && previewData.summary.stanbicEmployees > 0 && (
              <Button
                variant="outline"
                onClick={() => handleExportCSV('stanbic')}
                disabled={loading || exporting}
              >
                Export Stanbic CSV
              </Button>
            )}

            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={exporting}
            >
              Cancel
            </Button>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              <span>Loading bank schedule data...</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BankScheduleExportDialog;
