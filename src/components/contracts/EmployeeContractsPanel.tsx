// @ts-nocheck
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, FileText, Calendar, RefreshCw, Download } from "lucide-react";
import { format } from "date-fns";
import { ContractsService, EmployeeContract } from "@/lib/data/contracts.service";
import { useToast } from "@/hooks/use-toast";
import { GenerateContractDialog } from "./GenerateContractDialog";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  signed: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  expired: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  terminated: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

interface Props {
  employeeId: string;
  organizationId: string;
  employeeName: string;
  employeeData: Record<string, any>;
}

export function EmployeeContractsPanel({ employeeId, organizationId, employeeName, employeeData }: Props) {
  const [contracts, setContracts] = useState<EmployeeContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGenerate, setShowGenerate] = useState(false);
  const { toast } = useToast();

  const fetchContracts = async () => {
    try {
      setLoading(true);
      const data = await ContractsService.getContractsByEmployee(employeeId);
      setContracts(data);
    } catch (err: any) {
      toast({ title: "Error loading contracts", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, [employeeId]);

  const handleStatusChange = async (contractId: string, newStatus: string) => {
    try {
      await ContractsService.updateContract(contractId, { status: newStatus as any });
      toast({ title: "Contract updated" });
      fetchContracts();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleExportPdf = (contract: EmployeeContract) => {
    // Dynamic import for PDF generation
    import("jspdf").then(({ default: jsPDF }) => {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text("Employment Contract", 20, 20);
      doc.setFontSize(11);
      doc.text(`Contract #: ${contract.contract_number || "—"}`, 20, 35);
      doc.text(`Employee: ${employeeName}`, 20, 42);
      doc.text(`Status: ${contract.status}`, 20, 49);
      if (contract.start_date) doc.text(`Start: ${contract.start_date}`, 20, 56);
      if (contract.end_date) doc.text(`End: ${contract.end_date}`, 20, 63);

      // Render body as simple text (strip HTML)
      const bodyText = (contract.body_html || "").replace(/<[^>]*>/g, "\n").replace(/\n{2,}/g, "\n");
      const lines = doc.splitTextToSize(bodyText, 170);
      doc.text(lines, 20, 75);

      doc.save(`contract-${contract.contract_number || contract.id.slice(0, 8)}.pdf`);
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Contracts
        </CardTitle>
        <Button size="sm" onClick={() => setShowGenerate(true)}>
          <Plus className="h-4 w-4 mr-1" /> Generate Contract
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Loading contracts...</p>
        ) : contracts.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">No contracts yet</p>
            <p className="text-xs text-muted-foreground mt-1">Generate a contract from a template to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {contracts.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{c.contract_number || "Draft Contract"}</span>
                    <Badge className={STATUS_COLORS[c.status] || ""}>{c.status}</Badge>
                    {c.auto_renew && (
                      <Badge variant="outline" className="text-xs">
                        <RefreshCw className="h-3 w-3 mr-1" /> Auto-renew
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {c.contract_templates?.name && <span>Template: {c.contract_templates.name}</span>}
                    {c.start_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(c.start_date), "MMM d, yyyy")}
                        {c.end_date && ` – ${format(new Date(c.end_date), "MMM d, yyyy")}`}
                      </span>
                    )}
                    {c.signed_by_employee_at && <span>Signed by employee</span>}
                    {c.signed_by_employer_at && <span>Signed by employer</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {c.status === "draft" && (
                    <Button variant="outline" size="sm" onClick={() => handleStatusChange(c.id, "sent")}>
                      Mark Sent
                    </Button>
                  )}
                  {c.status === "sent" && (
                    <Button variant="outline" size="sm" onClick={() => handleStatusChange(c.id, "signed")}>
                      Mark Signed
                    </Button>
                  )}
                  {c.status === "signed" && (
                    <Button variant="outline" size="sm" onClick={() => handleStatusChange(c.id, "active")}>
                      Activate
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => handleExportPdf(c)} title="Export PDF">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <GenerateContractDialog
        open={showGenerate}
        onOpenChange={setShowGenerate}
        employeeId={employeeId}
        organizationId={organizationId}
        employeeName={employeeName}
        employeeData={employeeData}
        onContractCreated={fetchContracts}
      />
    </Card>
  );
}
