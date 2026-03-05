import { useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmployeeCreateForm } from "./EmployeeCreateForm";

interface AddEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEmployeeAdded: () => void;
}

const AddEmployeeDialog = ({ open, onOpenChange, onEmployeeAdded }: AddEmployeeDialogProps) => {
  useEffect(() => {
    if (!open) return;
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:w-auto sm:max-w-[800px] max-h-[95vh] p-0 gap-0 modern-dialog overflow-x-hidden overflow-y-auto">
        <DialogHeader className="modern-dialog-header shrink-0">
          <DialogTitle className="modern-dialog-title">
            Add New Employee
          </DialogTitle>
          <DialogDescription className="modern-dialog-description">
            Enter employee details below. All sections are collapsible.
          </DialogDescription>
        </DialogHeader>

        <div className="w-full min-w-0 overflow-x-hidden">
          <EmployeeCreateForm
            onSuccess={() => {
              onEmployeeAdded();
              onOpenChange(false);
            }}
            onCancel={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddEmployeeDialog;
