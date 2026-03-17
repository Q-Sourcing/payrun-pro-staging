import { useEffect, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Maximize2, Minimize2 } from "lucide-react";
import { EmployeeCreateForm } from "./EmployeeCreateForm";

const STORAGE_KEY = "payrun-pro:addEmployeeMaximized";

function getStoredMaximized(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}
function setStoredMaximized(v: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, String(v));
  } catch {}
}

interface AddEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEmployeeAdded: () => void;
}

const AddEmployeeDialog = ({ open, onOpenChange, onEmployeeAdded }: AddEmployeeDialogProps) => {
  const [maximized, setMaximized] = useState(getStoredMaximized);

  const toggleMaximized = useCallback(() => {
    setMaximized((prev) => {
      const next = !prev;
      setStoredMaximized(next);
      return next;
    });
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "F11") {
        e.preventDefault();
        if (maximized) {
          setMaximized(false);
          setStoredMaximized(false);
        } else {
          toggleMaximized();
        }
      }
      if (e.key === "Escape" && maximized) {
        e.preventDefault();
        e.stopPropagation();
        setMaximized(false);
        setStoredMaximized(false);
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [open, maximized, toggleMaximized]);

  // Lock body scroll when open
  useEffect(() => {
    if (!open) return;
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={
          maximized
            ? "w-screen h-screen max-w-none max-h-none rounded-none p-0 gap-0 modern-dialog overflow-hidden flex flex-col translate-x-0 translate-y-0 left-0 top-0 [&>button:last-child]:hidden"
            : "w-[calc(100vw-1rem)] sm:w-auto sm:max-w-[800px] max-h-[95vh] p-0 gap-0 modern-dialog overflow-x-hidden overflow-y-auto [&>button:last-child]:hidden"
        }
        style={maximized ? { transform: "none", left: 0, top: 0 } : undefined}
        onEscapeKeyDown={maximized ? (e) => e.preventDefault() : undefined}
      >
        <DialogHeader className="modern-dialog-header shrink-0 flex flex-row items-center justify-between pr-2">
          <div className="flex-1 min-w-0">
            <DialogTitle className="modern-dialog-title">
              Add New Employee
            </DialogTitle>
            <DialogDescription className="modern-dialog-description">
              Enter employee details below. All sections are collapsible.
            </DialogDescription>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-sm opacity-70 hover:opacity-100"
                    onClick={toggleMaximized}
                  >
                    {maximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                    <span className="sr-only">{maximized ? "Restore size" : "Expand to full screen"}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {maximized ? "Restore to default size" : "Expand to full screen"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-sm opacity-70 hover:opacity-100"
              onClick={() => onOpenChange(false)}
            >
              <span className="text-lg leading-none">×</span>
              <span className="sr-only">Close</span>
            </Button>
          </div>
        </DialogHeader>

        <div className={maximized ? "flex-1 overflow-hidden" : "w-full min-w-0 overflow-x-hidden"}>
          <EmployeeCreateForm
            maximized={maximized}
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
