import React from "react";
import { ExpatriatePayGroupsSection } from "@/components/payroll/ExpatriatePayGroupsSection";

interface ExpatriatePayrollTabProps {
  projectId: string;
  taxCountry?: string;
  currency?: string;
  defaultExchangeRate?: number;
}

export function ExpatriatePayrollTab({ projectId, taxCountry, currency, defaultExchangeRate }: ExpatriatePayrollTabProps) {
  return (
    <div className="space-y-6">
      <ExpatriatePayGroupsSection />
    </div>
  );
}
