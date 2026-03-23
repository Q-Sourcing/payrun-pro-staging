import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { QrCode, Plus, Eye, XCircle, Printer } from "lucide-react";
import { AttendanceService, AttendanceQrCode } from "@/lib/services/attendance.service";
import { useToast } from "@/hooks/use-toast";

interface Props {
  projectId: string;
  organizationId: string;
  currentUserId: string;
}

export function QrCodeManagerPanel({ projectId, organizationId, currentUserId }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showGenerate, setShowGenerate] = useState(false);
  const [viewingCode, setViewingCode] = useState<AttendanceQrCode | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [form, setForm] = useState({ label: "", geofence_id: "", expires_at: "" });
  const printRef = useRef<HTMLDivElement>(null);

  const { data: codes = [] } = useQuery({
    queryKey: ["project-qr-codes", projectId],
    queryFn: () => AttendanceService.getProjectQrCodes(projectId),
    enabled: !!projectId,
  });

  const { data: geofences = [] } = useQuery({
    queryKey: ["project-geofences", projectId],
    queryFn: () => AttendanceService.getProjectGeofences(projectId),
    enabled: !!projectId,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      AttendanceService.createQrCode({
        organization_id: organizationId,
        project_id: projectId,
        geofence_id: form.geofence_id || null,
        label: form.label || null,
        is_active: true,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
        created_by: currentUserId,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project-qr-codes", projectId] });
      setShowGenerate(false);
      setForm({ label: "", geofence_id: "", expires_at: "" });
      toast({ title: "QR code generated" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to generate QR", description: err.message, variant: "destructive" });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => AttendanceService.deactivateQrCode(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project-qr-codes", projectId] });
      toast({ title: "QR code deactivated" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to deactivate", description: err.message, variant: "destructive" });
    },
  });

  // Generate QR image when viewing a code
  useEffect(() => {
    if (!viewingCode?.token) return;
    const url = `${window.location.origin}/attend?token=${viewingCode.token}`;
    import("qrcode").then(QRCode => {
      QRCode.toDataURL(url, { width: 300, margin: 2 }).then(setQrDataUrl);
    });
  }, [viewingCode]);

  const handlePrint = () => {
    const win = window.open("", "_blank");
    if (!win || !viewingCode) return;
    const url = `${window.location.origin}/attend?token=${viewingCode.token}`;
    win.document.write(`
      <html><head><title>QR Code - ${viewingCode.label || "Attendance"}</title>
      <style>body{font-family:sans-serif;text-align:center;padding:40px}</style></head>
      <body>
        <h2>${viewingCode.label || "Attendance Check-In"}</h2>
        <img src="${qrDataUrl}" style="width:300px;height:300px" />
        <p style="font-size:12px;color:#666">Scan to check in at this site</p>
        <p style="font-size:10px;color:#aaa">${url}</p>
      </body></html>
    `);
    win.document.close();
    win.print();
  };

  const isExpired = (code: AttendanceQrCode) =>
    code.expires_at ? new Date(code.expires_at) < new Date() : false;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <QrCode className="h-4 w-4" />
              QR Codes
            </CardTitle>
            <Button size="sm" variant="outline" onClick={() => setShowGenerate(true)}>
              <Plus className="h-3 w-3 mr-1" />
              Generate QR
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {(codes as AttendanceQrCode[]).length === 0 ? (
            <p className="text-sm text-muted-foreground">No QR codes yet. Generate one for staff to scan at the site entrance.</p>
          ) : (
            <div className="space-y-2">
              {(codes as AttendanceQrCode[]).map(code => (
                <div key={code.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <div className="flex items-center gap-2">
                    <QrCode className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{code.label || "Unnamed"}</p>
                      <p className="text-xs text-muted-foreground">
                        {(code as any).geofences?.name
                          ? `Geofence: ${(code as any).geofences.name}`
                          : "No geofence restriction"}
                        {code.expires_at && ` · Expires ${new Date(code.expires_at).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isExpired(code) ? (
                      <Badge className="bg-red-100 text-red-600 text-xs">Expired</Badge>
                    ) : (
                      <Badge className="bg-green-100 text-green-700 text-xs">Active</Badge>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => setViewingCode(code)}>
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deactivateMutation.mutate(code.id!)}
                      disabled={deactivateMutation.isPending}
                    >
                      <XCircle className="h-3 w-3 text-red-400" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generate dialog */}
      <Dialog open={showGenerate} onOpenChange={setShowGenerate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate QR Code</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Label (e.g. "Gate A", "Main Entrance")</Label>
              <Input
                value={form.label}
                onChange={e => setForm(p => ({ ...p, label: e.target.value }))}
                placeholder="Optional label"
              />
            </div>
            {geofences.length > 0 && (
              <div className="space-y-1">
                <Label>Restrict to geofence (optional)</Label>
                <Select
                  value={form.geofence_id || "__none__"}
                  onValueChange={v => setForm(p => ({ ...p, geofence_id: v === "__none__" ? "" : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Any location</SelectItem>
                    {(geofences as any[]).map(g => (
                      <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1">
              <Label>Expiry date (optional)</Label>
              <Input
                type="date"
                value={form.expires_at}
                onChange={e => setForm(p => ({ ...p, expires_at: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerate(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View QR dialog */}
      <Dialog open={!!viewingCode} onOpenChange={open => !open && setViewingCode(null)}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle>{viewingCode?.label || "Attendance QR Code"}</DialogTitle>
          </DialogHeader>
          <div ref={printRef} className="flex flex-col items-center gap-3 py-2">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR Code" className="w-64 h-64" />
            ) : (
              <div className="w-64 h-64 bg-gray-100 flex items-center justify-center text-sm text-muted-foreground">
                Generating...
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {(viewingCode as any)?.geofences?.name
                ? `Geofence: ${(viewingCode as any).geofences.name}`
                : "No geofence restriction"}
            </p>
          </div>
          <DialogFooter className="justify-center">
            <Button variant="outline" onClick={handlePrint} disabled={!qrDataUrl}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
