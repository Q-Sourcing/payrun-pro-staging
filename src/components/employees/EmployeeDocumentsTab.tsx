import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmployeeHrRecordsService, type EmployeeDocumentRecord } from "@/lib/services/employee-hr-records.service";

interface EmployeeDocumentsTabProps {
  employeeId: string;
}

export function EmployeeDocumentsTab({ employeeId }: EmployeeDocumentsTabProps) {
  const [documents, setDocuments] = useState<EmployeeDocumentRecord[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const rows = await EmployeeHrRecordsService.listDocuments(employeeId);
        setDocuments(rows);
      } catch (error) {
        console.error("Error loading employee documents:", error);
      }
    };

    void load();
  }, [employeeId]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base">Documents</CardTitle>
        <Badge variant="outline">{documents.length}</Badge>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {documents.length === 0 ? (
          <p className="text-muted-foreground">
            No employee documents have been stored yet. Phase 3 schema is ready for document metadata and
            `employee-documents` storage paths.
          </p>
        ) : (
          documents.map((document) => (
            <div key={document.id} className="rounded-md border px-3 py-2">
              <div className="font-medium">{document.title}</div>
              <div className="text-muted-foreground">
                {document.document_type}
                {document.source ? ` · ${document.source}` : ""}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
