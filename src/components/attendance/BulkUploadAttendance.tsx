// @ts-nocheck
import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { AttendanceService } from "@/lib/services/attendance.service";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Download, FileSpreadsheet, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";

interface BulkUploadAttendanceProps {
  organizationId: string;
}

export function BulkUploadAttendance({ organizationId }: BulkUploadAttendanceProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = async () => {
    // Get employees for template
    const { data: emps } = await supabase
      .from("employees")
      .select("employee_number, first_name, last_name")
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .order("last_name");

    const rows = (emps || []).map((e) => ({
      "Employee Number": e.employee_number || "",
      "Employee Name": `${e.first_name} ${e.last_name}`,
      "Date (YYYY-MM-DD)": "",
      "Status": "PRESENT",
      "Check In (HH:MM)": "",
      "Check Out (HH:MM)": "",
      "Remarks": "",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    XLSX.writeFile(wb, "attendance_template.xlsx");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target?.result, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws);
      setPreview(data);
    };
    reader.readAsBinaryString(file);
  };

  const handleUpload = async () => {
    if (preview.length === 0) return;
    setUploading(true);

    try {
      // Map employee numbers to IDs
      const empNumbers = preview.map((r: any) => r["Employee Number"]).filter(Boolean);
      const { data: emps } = await supabase
        .from("employees")
        .select("id, employee_number")
        .eq("organization_id", organizationId)
        .in("employee_number", empNumbers);

      const empMap: Record<string, string> = {};
      emps?.forEach((e: any) => { empMap[e.employee_number] = e.id; });

      const records = preview
        .map((row: any) => {
          const empId = empMap[row["Employee Number"]];
          if (!empId) return null;
          return {
            organization_id: organizationId,
            employee_id: empId,
            attendance_date: row["Date (YYYY-MM-DD)"],
            status: row["Status"]?.toUpperCase() || "PRESENT",
            remarks: row["Remarks"] || null,
          };
        })
        .filter(Boolean);

      if (records.length === 0) {
        toast({ title: "No valid records found", variant: "destructive" });
        return;
      }

      await AttendanceService.markAttendance(records);
      toast({ title: "Upload complete", description: `${records.length} records imported.` });
      setPreview([]);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Bulk Upload Attendance
        </CardTitle>
        <CardDescription>Import attendance data from an Excel file</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-2" /> Download Template
          </Button>
          <div>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              ref={fileRef}
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" /> Select File
            </Button>
          </div>
        </div>

        {preview.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{preview.length} rows ready to import</p>
            <div className="max-h-[300px] overflow-auto border border-border rounded-lg">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    {Object.keys(preview[0]).map((key) => (
                      <th key={key} className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 10).map((row, i) => (
                    <tr key={i} className="border-b border-border/50">
                      {Object.values(row).map((val: any, j) => (
                        <td key={j} className="px-3 py-2 text-xs">{String(val)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.length > 10 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  ...and {preview.length - 10} more rows
                </p>
              )}
            </div>
            <Button onClick={handleUpload} disabled={uploading}>
              {uploading ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Importing...</>
              ) : (
                <><Upload className="h-4 w-4 mr-2" /> Import {preview.length} Records</>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
