import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  EmployeeHrRecordsService,
  type EmployeeAddressRecord,
  type EmployeeDependentRecord,
  type EmployeeEducationRecord,
  type EmployeeWorkExperienceRecord,
} from "@/lib/services/employee-hr-records.service";
import { useOrg } from "@/lib/tenant/OrgContext";

interface EmployeeHrRecordsTabProps {
  employeeId: string;
}

export function EmployeeHrRecordsTab({ employeeId }: EmployeeHrRecordsTabProps) {
  const { toast } = useToast();
  const { organizationId } = useOrg();
  const [addresses, setAddresses] = useState<EmployeeAddressRecord[]>([]);
  const [dependents, setDependents] = useState<EmployeeDependentRecord[]>([]);
  const [education, setEducation] = useState<EmployeeEducationRecord[]>([]);
  const [experience, setExperience] = useState<EmployeeWorkExperienceRecord[]>([]);

  // Dialog states
  const [addressDialog, setAddressDialog] = useState<{ open: boolean; editing?: EmployeeAddressRecord }>({ open: false });
  const [dependentDialog, setDependentDialog] = useState<{ open: boolean; editing?: EmployeeDependentRecord }>({ open: false });
  const [educationDialog, setEducationDialog] = useState<{ open: boolean; editing?: EmployeeEducationRecord }>({ open: false });
  const [experienceDialog, setExperienceDialog] = useState<{ open: boolean; editing?: EmployeeWorkExperienceRecord }>({ open: false });

  const load = async () => {
    try {
      const [a, d, e, w] = await Promise.all([
        EmployeeHrRecordsService.listAddresses(employeeId),
        EmployeeHrRecordsService.listDependents(employeeId),
        EmployeeHrRecordsService.listEducation(employeeId),
        EmployeeHrRecordsService.listWorkExperience(employeeId),
      ]);
      setAddresses(a); setDependents(d); setEducation(e); setExperience(w);
    } catch (error) {
      console.error("Error loading employee HR records:", error);
    }
  };

  useEffect(() => { void load(); }, [employeeId]);

  const handleDelete = async (type: string, id: string) => {
    try {
      if (type === "address") await EmployeeHrRecordsService.deleteAddress(id);
      else if (type === "dependent") await EmployeeHrRecordsService.deleteDependent(id);
      else if (type === "education") await EmployeeHrRecordsService.deleteEducation(id);
      else if (type === "experience") await EmployeeHrRecordsService.deleteWorkExperience(id);
      toast({ title: "Record deleted" });
      void load();
    } catch {
      toast({ title: "Error deleting record", variant: "destructive" });
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Addresses */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Addresses</CardTitle>
            <Badge variant="outline">{addresses.length}</Badge>
          </div>
          <Button size="sm" variant="outline" onClick={() => setAddressDialog({ open: true })}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add
          </Button>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {addresses.length === 0 ? (
            <p className="text-muted-foreground">No addresses captured yet.</p>
          ) : addresses.map((item) => (
            <div key={item.id} className="rounded-md border px-3 py-2 flex items-center justify-between">
              <span>{item.address_type}: {item.line_1}</span>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setAddressDialog({ open: true, editing: item })}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete("address", item.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Dependents */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Dependents</CardTitle>
            <Badge variant="outline">{dependents.length}</Badge>
          </div>
          <Button size="sm" variant="outline" onClick={() => setDependentDialog({ open: true })}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add
          </Button>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {dependents.length === 0 ? (
            <p className="text-muted-foreground">No dependents captured yet.</p>
          ) : dependents.map((item) => (
            <div key={item.id} className="rounded-md border px-3 py-2 flex items-center justify-between">
              <span>{item.full_name} ({item.relationship})</span>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setDependentDialog({ open: true, editing: item })}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete("dependent", item.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Education */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Education</CardTitle>
            <Badge variant="outline">{education.length}</Badge>
          </div>
          <Button size="sm" variant="outline" onClick={() => setEducationDialog({ open: true })}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add
          </Button>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {education.length === 0 ? (
            <p className="text-muted-foreground">No education history captured yet.</p>
          ) : education.map((item) => (
            <div key={item.id} className="rounded-md border px-3 py-2 flex items-center justify-between">
              <span>{item.institution_name}{item.degree_diploma ? ` · ${item.degree_diploma}` : ""}</span>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEducationDialog({ open: true, editing: item })}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete("education", item.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Work Experience */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Work Experience</CardTitle>
            <Badge variant="outline">{experience.length}</Badge>
          </div>
          <Button size="sm" variant="outline" onClick={() => setExperienceDialog({ open: true })}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add
          </Button>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {experience.length === 0 ? (
            <p className="text-muted-foreground">No prior work experience captured yet.</p>
          ) : experience.map((item) => (
            <div key={item.id} className="rounded-md border px-3 py-2 flex items-center justify-between">
              <span>{item.employer_name}{item.job_title ? ` · ${item.job_title}` : ""}</span>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setExperienceDialog({ open: true, editing: item })}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete("experience", item.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Address Dialog */}
      <AddressFormDialog
        open={addressDialog.open}
        editing={addressDialog.editing}
        employeeId={employeeId}
        organizationId={organizationId || ""}
        onClose={() => setAddressDialog({ open: false })}
        onSaved={load}
      />
      {/* Dependent Dialog */}
      <DependentFormDialog
        open={dependentDialog.open}
        editing={dependentDialog.editing}
        employeeId={employeeId}
        organizationId={organizationId || ""}
        onClose={() => setDependentDialog({ open: false })}
        onSaved={load}
      />
      {/* Education Dialog */}
      <EducationFormDialog
        open={educationDialog.open}
        editing={educationDialog.editing}
        employeeId={employeeId}
        organizationId={organizationId || ""}
        onClose={() => setEducationDialog({ open: false })}
        onSaved={load}
      />
      {/* Experience Dialog */}
      <ExperienceFormDialog
        open={experienceDialog.open}
        editing={experienceDialog.editing}
        employeeId={employeeId}
        organizationId={organizationId || ""}
        onClose={() => setExperienceDialog({ open: false })}
        onSaved={load}
      />
    </div>
  );
}

// ─── Address Form Dialog ─────────────────────────────────────────
function AddressFormDialog({ open, editing, employeeId, organizationId, onClose, onSaved }: {
  open: boolean; editing?: EmployeeAddressRecord; employeeId: string; organizationId: string;
  onClose: () => void; onSaved: () => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ address_type: "present" as any, line_1: "", line_2: "", city: "", district: "", country: "" });

  useEffect(() => {
    if (editing) {
      setForm({ address_type: editing.address_type, line_1: editing.line_1, line_2: editing.line_2 || "", city: editing.city || "", district: editing.district || "", country: editing.country || "" });
    } else {
      setForm({ address_type: "present", line_1: "", line_2: "", city: "", district: "", country: "" });
    }
  }, [editing, open]);

  const handleSave = async () => {
    if (!form.line_1.trim()) { toast({ title: "Address line 1 is required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      if (editing) {
        await EmployeeHrRecordsService.updateAddress(editing.id, form);
      } else {
        await EmployeeHrRecordsService.createAddress({ ...form, employee_id: employeeId, organization_id: organizationId });
      }
      toast({ title: editing ? "Address updated" : "Address added" });
      onSaved(); onClose();
    } catch { toast({ title: "Error saving address", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Address</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Type</Label>
            <Select value={form.address_type} onValueChange={(v) => setForm(p => ({ ...p, address_type: v as any }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="present">Present</SelectItem>
                <SelectItem value="permanent">Permanent</SelectItem>
                <SelectItem value="mailing">Mailing</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label>Address Line 1 *</Label><Input value={form.line_1} onChange={(e) => setForm(p => ({ ...p, line_1: e.target.value }))} /></div>
          <div className="space-y-1"><Label>Address Line 2</Label><Input value={form.line_2} onChange={(e) => setForm(p => ({ ...p, line_2: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>City</Label><Input value={form.city} onChange={(e) => setForm(p => ({ ...p, city: e.target.value }))} /></div>
            <div className="space-y-1"><Label>District</Label><Input value={form.district} onChange={(e) => setForm(p => ({ ...p, district: e.target.value }))} /></div>
          </div>
          <div className="space-y-1"><Label>Country</Label><Input value={form.country} onChange={(e) => setForm(p => ({ ...p, country: e.target.value }))} /></div>
        </div>
        <DialogFooter><Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Dependent Form Dialog ───────────────────────────────────────
function DependentFormDialog({ open, editing, employeeId, organizationId, onClose, onSaved }: {
  open: boolean; editing?: EmployeeDependentRecord; employeeId: string; organizationId: string;
  onClose: () => void; onSaved: () => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ full_name: "", relationship: "", date_of_birth: "", contact_phone: "" });

  useEffect(() => {
    if (editing) {
      setForm({ full_name: editing.full_name, relationship: editing.relationship, date_of_birth: editing.date_of_birth || "", contact_phone: editing.contact_phone || "" });
    } else {
      setForm({ full_name: "", relationship: "", date_of_birth: "", contact_phone: "" });
    }
  }, [editing, open]);

  const handleSave = async () => {
    if (!form.full_name.trim() || !form.relationship.trim()) { toast({ title: "Name and relationship are required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      if (editing) {
        await EmployeeHrRecordsService.updateDependent(editing.id, form);
      } else {
        await EmployeeHrRecordsService.createDependent({ ...form, employee_id: employeeId, organization_id: organizationId });
      }
      toast({ title: editing ? "Dependent updated" : "Dependent added" });
      onSaved(); onClose();
    } catch { toast({ title: "Error saving dependent", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Dependent</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label>Full Name *</Label><Input value={form.full_name} onChange={(e) => setForm(p => ({ ...p, full_name: e.target.value }))} /></div>
          <div className="space-y-1">
            <Label>Relationship *</Label>
            <Select value={form.relationship} onValueChange={(v) => setForm(p => ({ ...p, relationship: v }))}>
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                {["Spouse", "Child", "Parent", "Sibling", "Other"].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Date of Birth</Label><Input type="date" value={form.date_of_birth} onChange={(e) => setForm(p => ({ ...p, date_of_birth: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Contact Phone</Label><Input value={form.contact_phone} onChange={(e) => setForm(p => ({ ...p, contact_phone: e.target.value }))} /></div>
          </div>
        </div>
        <DialogFooter><Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Education Form Dialog ───────────────────────────────────────
function EducationFormDialog({ open, editing, employeeId, organizationId, onClose, onSaved }: {
  open: boolean; editing?: EmployeeEducationRecord; employeeId: string; organizationId: string;
  onClose: () => void; onSaved: () => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ institution_name: "", degree_diploma: "", specialization: "", start_date: "", end_date: "" });

  useEffect(() => {
    if (editing) {
      setForm({ institution_name: editing.institution_name, degree_diploma: editing.degree_diploma || "", specialization: editing.specialization || "", start_date: editing.start_date || "", end_date: editing.end_date || "" });
    } else {
      setForm({ institution_name: "", degree_diploma: "", specialization: "", start_date: "", end_date: "" });
    }
  }, [editing, open]);

  const handleSave = async () => {
    if (!form.institution_name.trim()) { toast({ title: "Institution name is required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      if (editing) {
        await EmployeeHrRecordsService.updateEducation(editing.id, form);
      } else {
        await EmployeeHrRecordsService.createEducation({ ...form, employee_id: employeeId, organization_id: organizationId });
      }
      toast({ title: editing ? "Education updated" : "Education added" });
      onSaved(); onClose();
    } catch { toast({ title: "Error saving education", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Education</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label>Institution Name *</Label><Input value={form.institution_name} onChange={(e) => setForm(p => ({ ...p, institution_name: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Degree / Diploma</Label><Input value={form.degree_diploma} onChange={(e) => setForm(p => ({ ...p, degree_diploma: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Specialization</Label><Input value={form.specialization} onChange={(e) => setForm(p => ({ ...p, specialization: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={(e) => setForm(p => ({ ...p, start_date: e.target.value }))} /></div>
            <div className="space-y-1"><Label>End Date</Label><Input type="date" value={form.end_date} onChange={(e) => setForm(p => ({ ...p, end_date: e.target.value }))} /></div>
          </div>
        </div>
        <DialogFooter><Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Work Experience Form Dialog ─────────────────────────────────
function ExperienceFormDialog({ open, editing, employeeId, organizationId, onClose, onSaved }: {
  open: boolean; editing?: EmployeeWorkExperienceRecord; employeeId: string; organizationId: string;
  onClose: () => void; onSaved: () => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ employer_name: "", job_title: "", from_date: "", to_date: "", job_description: "" });

  useEffect(() => {
    if (editing) {
      setForm({ employer_name: editing.employer_name, job_title: editing.job_title || "", from_date: editing.from_date || "", to_date: editing.to_date || "", job_description: editing.job_description || "" });
    } else {
      setForm({ employer_name: "", job_title: "", from_date: "", to_date: "", job_description: "" });
    }
  }, [editing, open]);

  const handleSave = async () => {
    if (!form.employer_name.trim()) { toast({ title: "Employer name is required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      if (editing) {
        await EmployeeHrRecordsService.updateWorkExperience(editing.id, form);
      } else {
        await EmployeeHrRecordsService.createWorkExperience({ ...form, employee_id: employeeId, organization_id: organizationId });
      }
      toast({ title: editing ? "Experience updated" : "Experience added" });
      onSaved(); onClose();
    } catch { toast({ title: "Error saving experience", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Work Experience</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label>Employer Name *</Label><Input value={form.employer_name} onChange={(e) => setForm(p => ({ ...p, employer_name: e.target.value }))} /></div>
          <div className="space-y-1"><Label>Job Title</Label><Input value={form.job_title} onChange={(e) => setForm(p => ({ ...p, job_title: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>From Date</Label><Input type="date" value={form.from_date} onChange={(e) => setForm(p => ({ ...p, from_date: e.target.value }))} /></div>
            <div className="space-y-1"><Label>To Date</Label><Input type="date" value={form.to_date} onChange={(e) => setForm(p => ({ ...p, to_date: e.target.value }))} /></div>
          </div>
          <div className="space-y-1"><Label>Job Description</Label><Input value={form.job_description} onChange={(e) => setForm(p => ({ ...p, job_description: e.target.value }))} /></div>
        </div>
        <DialogFooter><Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
