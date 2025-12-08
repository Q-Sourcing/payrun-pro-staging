import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ColumnVisibilityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columns: { key: string; label: string }[];
  visibleColumns: Record<string, boolean>;
  onColumnsChange: (columns: Record<string, boolean>) => void;
}

export const ColumnVisibilityDialog = ({
  open,
  onOpenChange,
  columns,
  visibleColumns,
  onColumnsChange,
}: ColumnVisibilityDialogProps) => {
  const [localVisibleColumns, setLocalVisibleColumns] = useState<Record<string, boolean>>(visibleColumns);

  useEffect(() => {
    setLocalVisibleColumns(visibleColumns);
  }, [visibleColumns]);

  const handleToggle = (key: string) => {
    const newVisible = { ...localVisibleColumns, [key]: !localVisibleColumns[key] };
    
    // Ensure at least one column is visible
    const visibleCount = Object.values(newVisible).filter(v => v).length;
    if (visibleCount === 0) {
      return; // Don't allow hiding all columns
    }
    
    setLocalVisibleColumns(newVisible);
  };

  const handleShowAll = () => {
    const allVisible: Record<string, boolean> = {};
    columns.forEach(col => {
      allVisible[col.key] = true;
    });
    setLocalVisibleColumns(allVisible);
  };

  const handleHideAll = () => {
    // Keep at least the first column visible
    const allHidden: Record<string, boolean> = {};
    columns.forEach((col, index) => {
      allHidden[col.key] = index === 0; // Keep first column visible
    });
    setLocalVisibleColumns(allHidden);
  };

  const handleSave = () => {
    onColumnsChange(localVisibleColumns);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setLocalVisibleColumns(visibleColumns);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Column Visibility</DialogTitle>
          <DialogDescription>
            Choose which columns to display in the employee directory table.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {columns.map((column) => (
              <div key={column.key} className="flex items-center space-x-2">
                <Checkbox
                  id={column.key}
                  checked={localVisibleColumns[column.key] ?? true}
                  onCheckedChange={() => handleToggle(column.key)}
                  disabled={
                    localVisibleColumns[column.key] &&
                    Object.values(localVisibleColumns).filter(v => v).length === 1
                  }
                />
                <Label
                  htmlFor={column.key}
                  className="text-sm font-normal cursor-pointer flex-1"
                >
                  {column.label}
                </Label>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleShowAll}>
              Show All
            </Button>
            <Button variant="outline" size="sm" onClick={handleHideAll}>
              Hide All
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

