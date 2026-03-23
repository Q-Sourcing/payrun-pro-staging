import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface URAExportButtonProps {
  payRunId: string;
  payRunStatus: string;
  taxCountry?: string;
  disabled?: boolean;
}

/**
 * URA P10 Monthly PAYE Return export button.
 * Only shown when:
 *  - tax_country = "Uganda"
 *  - pay run status is "processed" or "approved"
 */
export function URAExportButton({ payRunId, payRunStatus, taxCountry, disabled }: URAExportButtonProps) {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  // Only render for Uganda processed/approved pay runs
  if (taxCountry !== "Uganda" && taxCountry !== "UG") return null;
  if (!["processed", "approved"].includes(payRunStatus)) return null;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const supabaseProjectRef = (import.meta.env.VITE_SUPABASE_URL || "").replace("https://", "").split(".")[0];
      const url = `https://${supabaseProjectRef}.supabase.co/functions/v1/generate-ura-paye-return`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ pay_run_id: payRunId }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Export failed (${response.status})`);
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get("Content-Disposition") || "";
      const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
      const filename = filenameMatch?.[1] || `URA_P10_${payRunId.slice(0, 8)}.csv`;

      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);

      toast({ title: "URA P10 export downloaded", description: filename });
    } catch (err: any) {
      toast({ title: "Export failed", description: err?.message || "Unknown error", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={disabled || isExporting}
    >
      <Download className="h-4 w-4 mr-1" />
      {isExporting ? "Exporting..." : "Export URA P10"}
    </Button>
  );
}
