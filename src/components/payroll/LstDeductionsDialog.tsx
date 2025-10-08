import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

type MethodOption = "official" | "fixed";
type DistributionOption = "equal";
type ScopeOption = "all" | "selected" | "threshold";

interface PreviewRow {
  id: string;
  name: string;
  grossPay: number;
  annualLST: number;
  monthly: number;
}

export interface LstDialogEmployee {
  id: string;
  name: string;
  grossPay: number;
}

interface LstDeductionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: LstDialogEmployee[];
  currency: string;
  selectedIds?: string[];
  payRunStartMonthISO: string; // e.g., 2025-10-01
  onApply: (options: {
    method: MethodOption;
    months: number;
    annualAmountFixed?: number;
    scope: ScopeOption;
    threshold?: number;
    applyFuture: boolean;
  }, targets: LstDialogEmployee[], preview: PreviewRow[]) => Promise<void>;
}

const formatCurrency = (val: number, currency: string) =>
  `${currency} ${Math.round(val).toLocaleString("en-US")}`;

const computeUgAnnualByBrackets = (grossPay: number): number => {
  if (grossPay < 100000) return 0;
  if (grossPay < 200000) return 5000;
  if (grossPay < 300000) return 10000;
  if (grossPay < 400000) return 20000;
  if (grossPay < 500000) return 30000;
  if (grossPay < 600000) return 40000;
  if (grossPay < 700000) return 60000;
  if (grossPay < 800000) return 70000;
  if (grossPay < 900000) return 80000;
  if (grossPay < 1000000) return 90000;
  return 100000;
};

export const LstDeductionsDialog = ({ open, onOpenChange, employees, currency, selectedIds = [], payRunStartMonthISO, onApply }: LstDeductionsDialogProps) => {
  const [method, setMethod] = useState<MethodOption>("official");
  const [months, setMonths] = useState<number>(3);
  const [annualFixed, setAnnualFixed] = useState<number>(100000);
  const [scope, setScope] = useState<ScopeOption>("all");
  const [threshold, setThreshold] = useState<number>(100000);
  const [applyFuture, setApplyFuture] = useState<boolean>(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setMethod("official");
      setMonths(3);
      setAnnualFixed(100000);
      setScope("all");
      setThreshold(100000);
      setApplyFuture(true);
      setBusy(false);
    }
  }, [open]);

  const targetEmployees = useMemo(() => {
    let targets = employees;
    if (scope === "selected" && selectedIds.length > 0) {
      targets = employees.filter(e => selectedIds.includes(e.id));
    } else if (scope === "threshold") {
      targets = employees.filter(e => e.grossPay >= threshold);
    }
    return targets;
  }, [employees, scope, selectedIds, threshold]);

  const preview = useMemo<PreviewRow[]>(() => {
    return targetEmployees.map(e => {
      const annual = method === "official" ? computeUgAnnualByBrackets(e.grossPay) : annualFixed;
      const base = Math.floor(annual / months);
      const remainder = annual % months;
      const monthly = months > 1 ? base : annual;
      return { id: e.id, name: e.name, grossPay: e.grossPay, annualLST: annual, monthly: months > 1 ? monthly : annual };
    });
  }, [targetEmployees, method, annualFixed, months]);

  const handleApply = async () => {
    if (targetEmployees.length === 0) return;
    setBusy(true);
    try {
      await onApply({ method, months, annualAmountFixed: annualFixed, scope, threshold, applyFuture }, targetEmployees, preview);
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[680px] modern-dialog">
        <DialogHeader className="modern-dialog-header">
          <DialogTitle className="modern-dialog-title">Uganda LST Deductions</DialogTitle>
          <DialogDescription className="modern-dialog-description">Configure and apply Local Service Tax installments</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="rounded-md border p-3 text-sm bg-amber-50 text-amber-900">
            <strong>APPLYING TO CURRENT PAY RUN ONLY</strong>
            <div className="text-xs mt-1">Start month: {payRunStartMonthISO}</div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>LST Calculation Method</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as MethodOption)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="official">Use Official Brackets</SelectItem>
                  <SelectItem value="fixed">Fixed Amount for All</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Payment Months</Label>
              <Select value={String(months)} onValueChange={(v) => setMonths(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {method === "fixed" && (
              <div className="space-y-2">
                <Label>Annual LST Amount</Label>
                <Input type="number" value={annualFixed} onChange={(e) => setAnnualFixed(parseInt(e.target.value || "0"))} />
              </div>
            )}
            <div className="space-y-2">
              <Label>Start Month</Label>
              <Input value={payRunStartMonthISO} disabled />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Application Scope</Label>
              <Select value={scope} onValueChange={(v) => setScope(v as ScopeOption)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Uganda Employees</SelectItem>
                  <SelectItem value="selected">Selected Employees Only</SelectItem>
                  <SelectItem value="threshold">Gross pay above threshold</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {scope === "threshold" && (
              <div className="space-y-2">
                <Label>Gross Pay Threshold</Label>
                <Input type="number" value={threshold} onChange={(e) => setThreshold(parseInt(e.target.value || "0"))} />
              </div>
            )}
            <div className="flex items-end gap-2">
              <Checkbox id="applyFuture" checked={applyFuture} onCheckedChange={(c) => setApplyFuture(!!c)} />
              <Label htmlFor="applyFuture" className="font-normal">Apply to future pay runs</Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Calculation Preview</Label>
            <div className="max-h-56 overflow-auto border rounded">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted">
                    <th className="text-left p-2">Employee</th>
                    <th className="text-left p-2">Gross Pay</th>
                    <th className="text-left p-2">Annual LST</th>
                    <th className="text-left p-2">Monthly Deduction</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map(row => (
                    <tr key={row.id}>
                      <td className="p-2">{row.name}</td>
                      <td className="p-2">{formatCurrency(row.grossPay, currency)}</td>
                      <td className="p-2">{formatCurrency(row.annualLST, currency)}</td>
                      <td className="p-2">{formatCurrency(row.monthly, currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
            <Button onClick={handleApply} disabled={busy}>{busy ? "Applying..." : "Apply LST Deduction"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LstDeductionsDialog;


