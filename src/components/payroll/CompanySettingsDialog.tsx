import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Building2, Upload, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOrg } from "@/lib/tenant/OrgContext";
import { useOrgNames } from "@/lib/tenant/useOrgNames";
import { useUserRole } from "@/hooks/use-user-role";
import { Pencil } from "lucide-react";

interface CompanySettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CompanySettingsDialog = ({ open, onOpenChange }: CompanySettingsDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [companyName, setCompanyName] = useState("Q-Payroll Solutions");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [taxId, setTaxId] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#117288");
  const [secondaryColor, setSecondaryColor] = useState("#faa71c");
  const [accentColor, setAccentColor] = useState("#faa71c");
  const [includeLogo, setIncludeLogo] = useState(true);
  const [showCompanyDetails, setShowCompanyDetails] = useState(true);
  const [addConfidentialityFooter, setAddConfidentialityFooter] = useState(true);
  const [includeGeneratedDate, setIncludeGeneratedDate] = useState(true);
  const [showPageNumbers, setShowPageNumbers] = useState(true);
  const { toast } = useToast();
  const { organizationId, companyId } = useOrg();
  const { resolvedCompanyId, organizationName } = useOrgNames();
  const { isSuperAdmin } = useUserRole();
  const [editingName, setEditingName] = useState(false);
  const readOnly = !isSuperAdmin;
  // Employee numbering settings
  const [numberFormat, setNumberFormat] = useState("PREFIX-SEQUENCE");
  const [defaultPrefix, setDefaultPrefix] = useState("EMP");
  const [sequenceDigits, setSequenceDigits] = useState(3);
  const [nextSequence, setNextSequence] = useState(1);
  const [useDeptPrefix, setUseDeptPrefix] = useState(false);
  const [includeCountryCode, setIncludeCountryCode] = useState(false);
  const [useEmploymentType, setUseEmploymentType] = useState(false);

  useEffect(() => {
    if (open) {
      fetchSettings();
      fetchNumbering();
    }
  }, [open]);

  const fetchSettings = async () => {
    try {
      const effectiveCompanyId = getEffectiveCompanyId();
      if (effectiveCompanyId) {
        const { data: comp } = await supabase.from("companies").select("name").eq("id", effectiveCompanyId).maybeSingle();
        if (comp?.name) {
          setCompanyName(comp.name);
        }
      } else if (organizationName) {
        setCompanyName(organizationName);
      }
      const { data, error } = await supabase
        .from("company_settings")
        .select("*")
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setCompanyName(data.company_name || "Q-Payroll Solutions");
        setAddress(data.address || "");
        setPhone(data.phone || "");
        setEmail(data.email || "");
        setWebsite(data.website || "");
        setTaxId(data.tax_id || "");
        setLogoUrl(data.logo_url || "");
        setPrimaryColor(data.primary_color || "#117288");
        setSecondaryColor(data.secondary_color || "#faa71c");
        setAccentColor(data.accent_color || "#faa71c");
        setIncludeLogo(data.include_logo ?? true);
        setShowCompanyDetails(data.show_company_details ?? true);
        setAddConfidentialityFooter(data.add_confidentiality_footer ?? true);
        setIncludeGeneratedDate(data.include_generated_date ?? true);
        setShowPageNumbers(data.show_page_numbers ?? true);
      }
      setEditingName(false);
    } catch (error) {
      console.error("Error fetching settings:", error);
    }
  };

  const fetchNumbering = async () => {
    try {
      const { data, error } = await supabase
        .from("employee_number_settings")
        .select("number_format, default_prefix, sequence_digits, next_sequence, use_department_prefix, include_country_code, use_employment_type")
        .limit(1)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      if (data) {
        setNumberFormat(data.number_format || "PREFIX-SEQUENCE");
        setDefaultPrefix(data.default_prefix || "EMP");
        setSequenceDigits(data.sequence_digits || 3);
        setNextSequence(data.next_sequence || 1);
        setUseDeptPrefix(!!data.use_department_prefix);
        setIncludeCountryCode(!!data.include_country_code);
        setUseEmploymentType(!!data.use_employment_type);
      }
    } catch (err) {
      console.error("Error fetching numbering settings:", err);
    }
  };

  const getEffectiveOrgId = () => {
    if (organizationId) return organizationId;
    if (typeof window !== "undefined") return localStorage.getItem("active_organization_id");
    return null;
  };

  const getEffectiveCompanyId = () => {
    if (companyId) return companyId;
    if (resolvedCompanyId) return resolvedCompanyId;
    if (typeof window !== "undefined") return localStorage.getItem("active_company_id");
    return null;
  };

  const handleSave = async () => {
    if (!isSuperAdmin) {
      toast({
        title: "Insufficient permissions",
        description: "Only super admins can change the company name.",
        variant: "destructive",
      });
      return;
    }

    const effectiveOrgId = getEffectiveOrgId();
    const effectiveCompanyId = getEffectiveCompanyId();
    if (!effectiveOrgId) {
      toast({
        title: "Missing organization",
        description: "No organization context available to save changes.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: existing } = await supabase
        .from("company_settings")
        .select("id")
        .limit(1)
        .single();

      const settingsData = {
        company_name: companyName,
        address,
        phone,
        email,
        website,
        tax_id: taxId,
        logo_url: logoUrl,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        accent_color: accentColor,
        include_logo: includeLogo,
        show_company_details: showCompanyDetails,
        add_confidentiality_footer: addConfidentialityFooter,
        include_generated_date: includeGeneratedDate,
        show_page_numbers: showPageNumbers,
      };

      if (existing) {
        const { error } = await supabase
          .from("company_settings")
          .update(settingsData)
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("company_settings")
          .insert([settingsData]);

        if (error) throw error;
      }

      // Upsert numbering settings singleton
      const { data: existingNumbering } = await supabase
        .from("employee_number_settings")
        .select("id")
        .limit(1)
        .single();
      const numberingData = {
        number_format: numberFormat,
        default_prefix: defaultPrefix,
        sequence_digits: sequenceDigits,
        next_sequence: nextSequence,
        use_department_prefix: useDeptPrefix,
        include_country_code: includeCountryCode,
        use_employment_type: useEmploymentType,
      };
      if (existingNumbering) {
        const { error: nErr } = await supabase
          .from("employee_number_settings")
          .update(numberingData)
          .eq("id", existingNumbering.id);
        if (nErr) throw nErr;
      } else {
        const { error: nErr } = await supabase
          .from("employee_number_settings")
          .insert([numberingData]);
        if (nErr) throw nErr;
      }

      // Update canonical organization name
      const { error: orgError } = await supabase
        .from("organizations")
        .update({ name: companyName })
        .eq("id", effectiveOrgId);
      if (orgError) throw orgError;

      // Mirror to companies table
      if (effectiveCompanyId) {
        await supabase
          .from("companies")
          .update({ name: companyName })
          .eq("id", effectiveCompanyId);
      }

      toast({
        title: "Settings Saved",
        description: "Company settings and numbering updated successfully",
      });
      setEditingName(false);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("org-names-refresh"));
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Error",
        description: "Failed to save company settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setCompanyName("Q-Payroll Solutions");
    setAddress("");
    setPhone("");
    setEmail("");
    setWebsite("");
    setTaxId("");
    setPrimaryColor("#117288");
    setSecondaryColor("#faa71c");
    setAccentColor("#faa71c");
    setIncludeLogo(true);
    setShowCompanyDetails(true);
    setAddConfidentialityFooter(true);
    setIncludeGeneratedDate(true);
    setShowPageNumbers(true);
    // numbering defaults
    setNumberFormat("PREFIX-SEQUENCE");
    setDefaultPrefix("EMP");
    setSequenceDigits(3);
    setNextSequence(1);
    setUseDeptPrefix(false);
    setIncludeCountryCode(false);
    setUseEmploymentType(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto modern-dialog">
        <DialogHeader className="modern-dialog-header">
          <DialogTitle className="modern-dialog-title flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Company Branding Settings
          </DialogTitle>
          <DialogDescription className="modern-dialog-description">
            Configure your company details and branding for all exports
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-4">
            <Label className="text-base font-semibold">Employee Numbering</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Number Format</Label>
                <Select value={numberFormat} onValueChange={setNumberFormat}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PREFIX-SEQUENCE">PREFIX-SEQUENCE (EMP-001)</SelectItem>
                    <SelectItem value="SEQUENCE">SEQUENCE ONLY (001)</SelectItem>
                    <SelectItem value="DEPARTMENT-PREFIX">DEPARTMENT-PREFIX (ENG-001)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Default Prefix</Label>
                <Input value={defaultPrefix} onChange={(e) => setDefaultPrefix(e.target.value.toUpperCase())} />
              </div>
              <div>
                <Label>Sequence Digits</Label>
                <Select value={String(sequenceDigits)} onValueChange={(v) => setSequenceDigits(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="4">4</SelectItem>
                    <SelectItem value="5">5</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Next Sequence</Label>
                <Input type="number" min={1} value={nextSequence} onChange={(e) => setNextSequence(parseInt(e.target.value || "1"))} />
              </div>
              <div className="col-span-2 grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox id="deptPrefix" checked={useDeptPrefix} onCheckedChange={(c) => setUseDeptPrefix(!!c)} />
                  <Label htmlFor="deptPrefix" className="font-normal">Use department as prefix</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="countryCode" checked={includeCountryCode} onCheckedChange={(c) => setIncludeCountryCode(!!c)} />
                  <Label htmlFor="countryCode" className="font-normal">Include country code</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="employmentType" checked={useEmploymentType} onCheckedChange={(c) => setUseEmploymentType(!!c)} />
                  <Label htmlFor="employmentType" className="font-normal">Use employment type</Label>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <Label className="text-base font-semibold">Company Details</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="companyName">Company Name</Label>
                  {isSuperAdmin && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => {
                        if (editingName) {
                          fetchSettings();
                          setEditingName(false);
                        } else {
                          setEditingName(true);
                        }
                      }}
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      {editingName ? "Cancel" : "Edit"}
                    </Button>
                  )}
                </div>
                <Input
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Q-Payroll Solutions"
                  disabled={!isSuperAdmin || !editingName}
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Business Street, City, Country"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+256 123 456 789"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="info@company.com"
                />
              </div>
              <div>
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="www.company.com"
                />
              </div>
              <div>
                <Label htmlFor="taxId">Tax ID/Business Number</Label>
                <Input
                  id="taxId"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  placeholder="TIN123456789"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Label className="text-base font-semibold">Company Logo</Label>
            <div className="space-y-3">
              {logoUrl && (
                <div className="flex items-center gap-4 p-3 border rounded-md">
                  <img src={logoUrl} alt="Company logo" className="h-12 w-auto object-contain" />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setLogoUrl("")}
                    className="ml-auto"
                  >
                    <X className="h-4 w-4" />
                    Remove
                  </Button>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Input
                  id="logo"
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml"
                  disabled={uploadingLogo}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 2 * 1024 * 1024) {
                      toast({
                        title: "File too large",
                        description: "Logo must be less than 2MB",
                        variant: "destructive",
                      });
                      return;
                    }
                    setUploadingLogo(true);
                    try {
                      const reader = new FileReader();
                      reader.onload = () => {
                        setLogoUrl(reader.result as string);
                        toast({ title: "Logo uploaded", description: "Logo will be saved when you click Save Branding" });
                      };
                      reader.readAsDataURL(file);
                    } catch (err) {
                      toast({
                        title: "Upload failed",
                        description: "Could not upload logo",
                        variant: "destructive",
                      });
                    } finally {
                      setUploadingLogo(false);
                    }
                  }}
                />
              </div>
              <p className="text-sm text-muted-foreground">PNG, JPG, SVG • Max 2MB • Recommended 300x100px</p>
            </div>
          </div>

          <div className="space-y-4">
            <Label className="text-base font-semibold">Report Branding</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeLogo"
                  checked={includeLogo}
                  onCheckedChange={(checked) => setIncludeLogo(checked as boolean)}
                />
                <Label htmlFor="includeLogo" className="font-normal">
                  Include company logo on all exports
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="showCompanyDetails"
                  checked={showCompanyDetails}
                  onCheckedChange={(checked) => setShowCompanyDetails(checked as boolean)}
                />
                <Label htmlFor="showCompanyDetails" className="font-normal">
                  Show company details in header
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="addConfidentialityFooter"
                  checked={addConfidentialityFooter}
                  onCheckedChange={(checked) => setAddConfidentialityFooter(checked as boolean)}
                />
                <Label htmlFor="addConfidentialityFooter" className="font-normal">
                  Add confidentiality footer
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeGeneratedDate"
                  checked={includeGeneratedDate}
                  onCheckedChange={(checked) => setIncludeGeneratedDate(checked as boolean)}
                />
                <Label htmlFor="includeGeneratedDate" className="font-normal">
                  Include generated date and time
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="showPageNumbers"
                  checked={showPageNumbers}
                  onCheckedChange={(checked) => setShowPageNumbers(checked as boolean)}
                />
                <Label htmlFor="showPageNumbers" className="font-normal">
                  Show page numbers
                </Label>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Label className="text-base font-semibold">Color Scheme</Label>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="primaryColor">Primary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="primaryColor"
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-16 h-10"
                  />
                  <Input
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    placeholder="#3366CC"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="secondaryColor">Secondary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="secondaryColor"
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="w-16 h-10"
                  />
                  <Input
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    placeholder="#666666"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="accentColor">Accent Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="accentColor"
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-16 h-10"
                  />
                  <Input
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    placeholder="#FF6B35"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleReset} disabled={loading}>
            Reset to Defaults
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading || readOnly}>
            {loading ? "Saving..." : "Save Branding"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
