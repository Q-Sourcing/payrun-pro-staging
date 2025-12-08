import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmployeeCreateForm } from "./EmployeeCreateForm";

interface AddEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEmployeeAdded: () => void;
}

const AddEmployeeDialog = ({ open, onOpenChange, onEmployeeAdded }: AddEmployeeDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] h-[90vh] p-0 gap-0 modern-dialog overflow-hidden flex flex-col">
        <DialogHeader className="modern-dialog-header shrink-0">
          <DialogTitle className="modern-dialog-title">
            Add New Employee
          </DialogTitle>
          <DialogDescription className="modern-dialog-description">
            Enter employee details below. All sections are collapsible.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden min-h-0">
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
