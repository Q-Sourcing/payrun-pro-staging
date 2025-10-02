import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, Download, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface BulkUploadEmployeesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEmployeesAdded: () => void;
}

const BulkUploadEmployeesDialog = ({ open, onOpenChange, onEmployeesAdded }: BulkUploadEmployeesDialogProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const downloadTemplate = () => {
    const headers = [
      "first_name",
      "middle_name",
      "last_name",
      "email",
      "phone",
      "country",
      "currency",
      "pay_type",
      "pay_rate",
      "pay_group_id",
      "status"
    ];
    
    const sampleData = [
      "John,M,Doe,john.doe@example.com,+256700000000,Uganda,UGX,salary,5000000,,active",
      "Jane,,Smith,jane.smith@example.com,+254700000000,Kenya,KSH,hourly,1500,,active"
    ];

    const csvContent = [headers.join(","), ...sampleData].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "employee_upload_template.csv";
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const parseCSV = (text: string): any[] => {
    const lines = text.split("\n").filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map(h => h.trim());
    const employees = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map(v => v.trim());
      const employee: any = {};

      headers.forEach((header, index) => {
        const value = values[index];
        if (value) {
          if (header === "pay_rate") {
            employee[header] = parseFloat(value);
          } else if (header === "pay_group_id" && !value) {
            employee[header] = null;
          } else {
            employee[header] = value;
          }
        } else if (header === "middle_name" || header === "last_name" || header === "phone" || header === "pay_group_id") {
          employee[header] = null;
        }
      });

      if (employee.first_name && employee.email) {
        employees.push(employee);
      }
    }

    return employees;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== "text/csv" && !selectedFile.name.endsWith(".csv")) {
        toast({
          title: "Error",
          description: "Please upload a CSV file",
          variant: "destructive",
        });
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "Error",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const text = await file.text();
      const employees = parseCSV(text);

      if (employees.length === 0) {
        toast({
          title: "Error",
          description: "No valid employee data found in the file",
          variant: "destructive",
        });
        return;
      }

      // Validate required fields
      const validEmployees = employees.filter(emp => 
        emp.first_name && 
        emp.email && 
        emp.country && 
        emp.currency && 
        emp.pay_type && 
        emp.pay_rate
      );

      if (validEmployees.length === 0) {
        toast({
          title: "Error",
          description: "No valid employees found. Ensure all required fields are filled.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from("employees")
        .insert(validEmployees);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Successfully uploaded ${validEmployees.length} employee(s)`,
      });

      setFile(null);
      onEmployeesAdded();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error uploading employees:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload employees",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Bulk Upload Employees</DialogTitle>
          <DialogDescription>
            Upload multiple employees at once using a CSV file
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 mt-0.5 text-muted-foreground" />
                  <div className="flex-1">
                    <h4 className="font-medium mb-1">CSV Format Requirements</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Required: first_name, email, country, currency, pay_type, pay_rate, status</li>
                      <li>• Optional: middle_name, last_name, phone, pay_group_id</li>
                      <li>• Pay types: salary, hourly, piece_rate</li>
                      <li>• Status: active, inactive</li>
                    </ul>
                  </div>
                </div>

                <Button
                  variant="outline"
                  onClick={downloadTemplate}
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download CSV Template
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <Label htmlFor="csv-file">Upload CSV File</Label>
            <div className="flex gap-2">
              <input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="flex-1 text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />
            </div>
            {file && (
              <p className="text-sm text-muted-foreground">
                Selected: {file.name}
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!file || loading}
              className="flex-1"
            >
              <Upload className="h-4 w-4 mr-2" />
              {loading ? "Uploading..." : "Upload Employees"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkUploadEmployeesDialog;
