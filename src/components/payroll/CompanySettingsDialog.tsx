import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Building2, Upload, X } from "lucide-react";

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

  useEffect(() => {
    if (open) {
      fetchSettings();
    }
  }, [open]);

  const fetchSettings = async () => {
    try {
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
    } catch (error) {
      console.error("Error fetching settings:", error);
    }
  };

  const handleSave = async () => {
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

      toast({
        title: "Settings Saved",
        description: "Company branding settings have been updated successfully",
      });
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
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Company Branding Settings
          </DialogTitle>
          <DialogDescription>
            Configure your company details and branding for all exports
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-4">
            <Label className="text-base font-semibold">Company Details</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Q-Payroll Solutions"
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
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save Branding"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
