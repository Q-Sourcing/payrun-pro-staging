import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Download, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { EmployeeHrRecordsService, type EmployeeDocumentRecord } from "@/lib/services/employee-hr-records.service";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/lib/tenant/OrgContext";

interface EmployeeDocumentsTabProps {
  employeeId: string;
}

const DOCUMENT_TYPES = [
  "National ID",
  "Passport",
  "Work Permit",
  "Contract",
  "Tax Certificate",
  "NSSF Card",
  "Academic Certificate",
  "CV / Resume",
  "Offer Letter",
  "Other",
];

export function EmployeeDocumentsTab({ employeeId }: EmployeeDocumentsTabProps) {
  const { toast } = useToast();
  const { organizationId } = useOrg();
  const [documents, setDocuments] = useState<EmployeeDocumentRecord[]>([]);
  const [uploadDialog, setUploadDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [docTitle, setDocTitle] = useState("");
  const [docType, setDocType] = useState("Other");
  const [docDescription, setDocDescription] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    try {
      const rows = await EmployeeHrRecordsService.listDocuments(employeeId);
      setDocuments(rows);
    } catch (error) {
      console.error("Error loading employee documents:", error);
    }
  };

  useEffect(() => { void load(); }, [employeeId]);

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!docTitle.trim()) { toast({ title: "Title is required", variant: "destructive" }); return; }

    setUploading(true);
    try {
      let storagePath: string | undefined;
      let mimeType: string | undefined;
      let fileSize: number | undefined;

      if (file) {
        const path = `employee-documents/${employeeId}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage.from("employee-documents").upload(path, file);
        if (uploadError) {
          // Bucket might not exist — still save metadata
          console.warn("Storage upload failed (bucket may not exist):", uploadError.message);
        } else {
          storagePath = path;
        }
        mimeType = file.type;
        fileSize = file.size;
      }

      await EmployeeHrRecordsService.createDocument({
        employee_id: employeeId,
        organization_id: organizationId || "",
        title: docTitle.trim(),
        document_type: docType,
        description: docDescription || undefined,
        storage_bucket: storagePath ? "employee-documents" : undefined,
        storage_path: storagePath,
        mime_type: mimeType,
        file_size_bytes: fileSize,
      });

      toast({ title: "Document added" });
      setUploadDialog(false);
      setDocTitle(""); setDocType("Other"); setDocDescription("");
      if (fileRef.current) fileRef.current.value = "";
      void load();
    } catch {
      toast({ title: "Error uploading document", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc: EmployeeDocumentRecord) => {
    if (!doc.storage_path || !doc.storage_bucket) {
      toast({ title: "No file attached to this document" }); return;
    }
    const { data } = await supabase.storage.from(doc.storage_bucket).createSignedUrl(doc.storage_path, 300);
    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank");
    } else {
      toast({ title: "Error generating download link", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await EmployeeHrRecordsService.deleteDocument(id);
      toast({ title: "Document deleted" });
      void load();
    } catch {
      toast({ title: "Error deleting document", variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">Documents</CardTitle>
          <Badge variant="outline">{documents.length}</Badge>
        </div>
        <Button size="sm" variant="outline" onClick={() => setUploadDialog(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Upload
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {documents.length === 0 ? (
          <p className="text-muted-foreground">No employee documents have been stored yet.</p>
        ) : (
          documents.map((document) => (
            <div key={document.id} className="rounded-md border px-3 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">{document.title}</div>
                  <div className="text-muted-foreground text-xs">
                    {document.document_type}
                    {document.source ? ` · ${document.source}` : ""}
                  </div>
                </div>
              </div>
              <div className="flex gap-1">
                {document.storage_path && (
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDownload(document)}>
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(document.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>

      <Dialog open={uploadDialog} onOpenChange={setUploadDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Title *</Label><Input value={docTitle} onChange={(e) => setDocTitle(e.target.value)} placeholder="e.g. National ID Copy" /></div>
            <div className="space-y-1">
              <Label>Document Type</Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Description</Label><Input value={docDescription} onChange={(e) => setDocDescription(e.target.value)} placeholder="Optional notes" /></div>
            <div className="space-y-1">
              <Label>File (optional)</Label>
              <Input type="file" ref={fileRef} />
            </div>
          </div>
          <DialogFooter><Button onClick={handleUpload} disabled={uploading}>{uploading ? "Uploading..." : "Upload"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
