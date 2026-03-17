import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, FileText } from "lucide-react";
import BulkUploadEmployeesDialog from "./BulkUploadEmployeesDialog";
import BulkImportEmployeesXlsxDialog from "./BulkImportEmployeesXlsxDialog";

interface BulkImportChoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEmployeesAdded: () => void;
}

export default function BulkImportChoiceDialog({ open, onOpenChange, onEmployeesAdded }: BulkImportChoiceDialogProps) {
  const [format, setFormat] = useState<"csv" | "xlsx" | null>(null);

  const handleClose = () => {
    setFormat(null);
    onOpenChange(false);
  };

  if (format === "csv") {
    return (
      <BulkUploadEmployeesDialog
        open={true}
        onOpenChange={(v) => { if (!v) handleClose(); }}
        onEmployeesAdded={() => { onEmployeesAdded(); handleClose(); }}
      />
    );
  }

  if (format === "xlsx") {
    return (
      <BulkImportEmployeesXlsxDialog
        open={true}
        onOpenChange={(v) => { if (!v) handleClose(); }}
        onEmployeesAdded={() => { onEmployeesAdded(); handleClose(); }}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Import Employees</DialogTitle>
          <DialogDescription>Choose a file format to import employees from.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          <Button
            variant="outline"
            className="h-24 flex flex-col items-center gap-2"
            onClick={() => setFormat("csv")}
          >
            <FileText className="h-8 w-8 text-muted-foreground" />
            <span className="font-medium">CSV</span>
          </Button>
          <Button
            variant="outline"
            className="h-24 flex flex-col items-center gap-2"
            onClick={() => setFormat("xlsx")}
          >
            <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
            <span className="font-medium">Excel (XLSX)</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
