/**
 * AllowancesSection
 * Payroll allowances selector for staff onboarding:
 * House, Travel, Airtime, Medical, Seating
 */
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export interface AllowanceItem {
  key: string;
  label: string;
  enabled: boolean;
  amount: number | "";
}

export const DEFAULT_ALLOWANCES: AllowanceItem[] = [
  { key: "house", label: "Housing Allowance", enabled: false, amount: "" },
  { key: "travel", label: "Travel Allowance", enabled: false, amount: "" },
  { key: "airtime", label: "Airtime Allowance", enabled: false, amount: "" },
  { key: "medical", label: "Medical Allowance", enabled: false, amount: "" },
  { key: "seating", label: "Seating Allowance", enabled: false, amount: "" },
];

interface Props {
  allowances: AllowanceItem[];
  onChange: (allowances: AllowanceItem[]) => void;
  currency?: string;
  readOnly?: boolean;
}

export function AllowancesSection({ allowances, onChange, currency = "UGX", readOnly = false }: Props) {
  const toggle = (key: string, enabled: boolean) => {
    onChange(allowances.map((a) => (a.key === key ? { ...a, enabled, amount: enabled ? a.amount : "" } : a)));
  };

  const setAmount = (key: string, value: string) => {
    onChange(
      allowances.map((a) => (a.key === key ? { ...a, amount: value === "" ? "" : Number(value) } : a))
    );
  };

  const activeCount = allowances.filter((a) => a.enabled).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Label className="text-sm font-semibold">Payroll Allowances</Label>
        {activeCount > 0 && (
          <Badge variant="secondary" className="text-xs">{activeCount} selected</Badge>
        )}
      </div>
      <div className="grid grid-cols-1 gap-3 rounded-lg border p-4 bg-muted/20">
        {allowances.map((a) => (
          <div key={a.key} className="flex items-center gap-3">
            <Checkbox
              id={`allowance-${a.key}`}
              checked={a.enabled}
              onCheckedChange={(v) => !readOnly && toggle(a.key, Boolean(v))}
              disabled={readOnly}
            />
            <Label
              htmlFor={`allowance-${a.key}`}
              className={`w-40 text-sm cursor-pointer ${readOnly ? "cursor-default" : ""}`}
            >
              {a.label}
            </Label>
            {a.enabled && (
              <div className="flex items-center gap-1 flex-1">
                <span className="text-xs text-muted-foreground">{currency}</span>
                <Input
                  type="number"
                  className="h-7 w-36 text-sm"
                  placeholder="0"
                  value={a.amount}
                  onChange={(e) => setAmount(a.key, e.target.value)}
                  disabled={readOnly}
                  min={0}
                />
              </div>
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Selected allowances will be included in the generated employment contract.
      </p>
    </div>
  );
}

/** Serialize allowances to a plain JSON-safe record for storage */
export function serializeAllowances(allowances: AllowanceItem[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const a of allowances) {
    if (a.enabled && a.amount !== "") {
      result[a.key] = Number(a.amount);
    }
  }
  return result;
}

/** Deserialize from stored record back to AllowanceItem[] */
export function deserializeAllowances(stored: Record<string, number> | null | undefined): AllowanceItem[] {
  return DEFAULT_ALLOWANCES.map((def) => ({
    ...def,
    enabled: stored ? def.key in stored : false,
    amount: stored && def.key in stored ? stored[def.key] : "",
  }));
}
