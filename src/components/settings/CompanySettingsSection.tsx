import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ALL_COUNTRIES } from "@/lib/constants/countries";
import { useOrg } from "@/lib/tenant/OrgContext";
import { useOrgNames } from "@/lib/tenant/useOrgNames";
import { useUserRole } from "@/hooks/use-user-role";
import { Pencil, Settings as GearIcon, Building2, MapPin, Globe2, Phone, Mail, CalendarDays } from "lucide-react";
import { OrganizationSetupModal } from "../organization-setup/OrganizationSetupModal";

export const CompanySettingsSection = ({ onOpenAdvanced }: { onOpenAdvanced?: () => void }) => {
  const { toast } = useToast();
  const { organizationId, companyId } = useOrg();
  const { resolvedCompanyId } = useOrgNames();
  const { isSuperAdmin } = useUserRole();
  const readOnly = !isSuperAdmin;
  const [loading, setLoading] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [formData, setFormData] = useState({
    companyName: "Q-Payroll",
    legalName: "",
    taxId: "",
    address: "",
    city: "",
    state: "",
    postalCode: "",
    country: "UG",
    phone: "",
    email: "",
    website: "",
    defaultCurrency: "UGX",
    dateFormat: "DD/MM/YYYY",
    financialYearStart: "January",
  });
  const [showOrgSetup, setShowOrgSetup] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [organizationId, resolvedCompanyId]);

  const loadSettings = async () => {
    const effectiveCompanyId = getEffectiveCompanyId();
    let nameFromCompany = formData.companyName;

    if (effectiveCompanyId) {
      const { data: comp } = await supabase.from('companies').select('name').eq('id', effectiveCompanyId).maybeSingle();
      if (comp?.name) {
        nameFromCompany = comp.name;
      }
    }

    const { data: companySettings } = await supabase
      .from('company_settings')
      .select('*')
      .limit(1);

    const settingsRow = companySettings?.[0];

    setFormData(prev => ({
      ...prev,
      companyName: nameFromCompany || settingsRow?.company_name || prev.companyName,
      address: settingsRow?.address || "",
      phone: settingsRow?.phone || "",
      email: settingsRow?.email || "",
      website: settingsRow?.website || "",
      taxId: settingsRow?.tax_id || "",
    }));
    setEditingName(false);
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
      toast({ title: "Insufficient permissions", description: "Only super admins can change the company name.", variant: "destructive" });
      return;
    }

    const effectiveOrgId = getEffectiveOrgId();
    const effectiveCompanyId = getEffectiveCompanyId();
    if (!effectiveOrgId) {
      toast({ title: "Missing organization", description: "No organization context available to save changes.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { error: orgError } = await supabase.from('organizations').update({ name: formData.companyName }).eq('id', effectiveOrgId);
      if (orgError) throw orgError;

      if (effectiveCompanyId) {
        await supabase.from('companies').update({ name: formData.companyName }).eq('id', effectiveCompanyId);
      }

      const { error } = await supabase.from('company_settings').upsert({
        company_name: formData.companyName,
        address: formData.address,
        phone: formData.phone,
        email: formData.email,
        website: formData.website,
        tax_id: formData.taxId,
      });

      if (error) throw error;

      toast({ title: "Company settings saved", description: "Your company information has been updated successfully." });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("org-names-refresh"));
      }
    } catch (error) {
      toast({ title: "Error saving settings", description: "Failed to save company settings.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <OrganizationSetupModal open={showOrgSetup} onClose={() => setShowOrgSetup(false)} />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Company Settings</h2>
          <p className="text-sm text-muted-foreground">Manage your company identity, contact details, and localization.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenAdvanced?.()} className="gap-2">
            <GearIcon className="h-4 w-4" />
            Organization Setup
          </Button>
          {!readOnly && (
            <Button variant="outline" size="sm" onClick={() => setEditingName(!editingName)}>
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              Edit
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general" className="gap-1.5">
            <Building2 className="h-3.5 w-3.5" />
            General
          </TabsTrigger>
          <TabsTrigger value="contact" className="gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            Contact & Address
          </TabsTrigger>
          <TabsTrigger value="localization" className="gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            Localization
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Basic Information</CardTitle>
              <CardDescription>Your company identity and legal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Company Name *</Label>
                  <Input value={formData.companyName} onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))} disabled={!isSuperAdmin || !editingName} className="h-10" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Legal Name</Label>
                  <Input value={formData.legalName} onChange={(e) => setFormData(prev => ({ ...prev, legalName: e.target.value }))} disabled={readOnly} className="h-10" placeholder="Full legal entity name" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tax ID / Business Number</Label>
                <Input value={formData.taxId} onChange={(e) => setFormData(prev => ({ ...prev, taxId: e.target.value }))} disabled={readOnly} className="h-10 max-w-md" placeholder="e.g. UG-1234567890" />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <Button onClick={handleSave} disabled={loading || readOnly}>{loading ? "Saving..." : "Save"}</Button>
                <Button variant="outline" onClick={loadSettings}>Reset</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contact & Address</CardTitle>
              <CardDescription>Company location and contact details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Street Address</Label>
                <Input value={formData.address} onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))} disabled={readOnly} className="h-10" placeholder="123 Main Street" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">City</Label>
                  <Input value={formData.city} onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))} disabled={readOnly} className="h-10" placeholder="Kampala" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">State / Region</Label>
                  <Input value={formData.state} onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))} disabled={readOnly} className="h-10" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Postal Code</Label>
                  <Input value={formData.postalCode} onChange={(e) => setFormData(prev => ({ ...prev, postalCode: e.target.value }))} disabled={readOnly} className="h-10" />
                </div>
              </div>
              <Separator className="my-2" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"><Globe2 className="h-3 w-3" /> Country</Label>
                  <Select value={formData.country} onValueChange={(value) => setFormData(prev => ({ ...prev, country: value }))} disabled={readOnly}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ALL_COUNTRIES.map((country) => (
                        <SelectItem key={country.code} value={country.code}>{country.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"><Phone className="h-3 w-3" /> Phone</Label>
                  <Input value={formData.phone} onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))} disabled={readOnly} className="h-10" placeholder="+256 700 000 000" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"><Mail className="h-3 w-3" /> Email</Label>
                  <Input type="email" value={formData.email} onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))} disabled={readOnly} className="h-10" placeholder="info@company.com" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Website</Label>
                <Input value={formData.website} onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))} disabled={readOnly} className="h-10 max-w-md" placeholder="https://www.company.com" />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <Button onClick={handleSave} disabled={loading || readOnly}>{loading ? "Saving..." : "Save"}</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="localization" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Currency & Localization</CardTitle>
              <CardDescription>Date formats and financial year configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Date Format</Label>
                  <Select value={formData.dateFormat} onValueChange={(value) => setFormData(prev => ({ ...prev, dateFormat: value }))} disabled={readOnly}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Financial Year Start</Label>
                  <Select value={formData.financialYearStart} onValueChange={(value) => setFormData(prev => ({ ...prev, financialYearStart: value }))} disabled={readOnly}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((month) => (
                        <SelectItem key={month} value={month}>{month}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <Button onClick={handleSave} disabled={loading || readOnly}>{loading ? "Saving..." : "Save"}</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
