import { AlertTriangle } from "lucide-react";

export default function Anomalies() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="rounded-xl border border-orange-200 bg-orange-50 p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-orange-100 p-2 text-orange-600">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-900">Anomalies</h1>
            <p className="text-sm text-slate-600">
              This is a temporary placeholder for payroll anomalies. The live anomaly feed
              and API-backed counts can be connected here next.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
