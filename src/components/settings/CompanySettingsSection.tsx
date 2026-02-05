import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ALL_COUNTRIES } from "@/lib/constants/countries";
import { useOrg } from "@/lib/tenant/OrgContext";
import { useOrgNames } from "@/lib/tenant/useOrgNames";
import { useUserRole } from "@/hooks/use-user-role";
import { Pencil, Settings as GearIcon } from "lucide-react";
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
      // Update canonical organization name
      const { error: orgError } = await supabase
        .from('organizations')
        .update({ name: formData.companyName })
        .eq('id', effectiveOrgId);
      if (orgError) throw orgError;

      // Mirror name to companies table (selected company)
      if (effectiveCompanyId) {
        await supabase
          .from('companies')
          .update({ name: formData.companyName })
          .eq('id', effectiveCompanyId);
      }

      const { error } = await supabase
        .from('company_settings')
        .upsert({
          company_name: formData.companyName,
          address: formData.address,
          phone: formData.phone,
          email: formData.email,
          website: formData.website,
          tax_id: formData.taxId,
        });

      if (error) throw error;

      toast({
        title: "Company settings saved",
        description: "Your company information has been updated successfully.",
      });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("org-names-refresh"));
      }
    } catch (error) {
      toast({
        title: "Error saving settings",
        description: "Failed to save company settings.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-xl">Company Settings</CardTitle>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenAdvanced?.()}
            title="Organization Setup"
            className="hover:bg-slate-100"
          >
            <GearIcon className="h-5 w-5 text-slate-500" />
          </Button>
          {!readOnly && (
            <Button variant="outline" size="sm" onClick={() => setEditingName(!editingName)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <OrganizationSetupModal open={showOrgSetup} onClose={() => setShowOrgSetup(false)} />
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground">BASIC INFORMATION</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Company Name *</Label>
              <Input
                value={formData.companyName}
                onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                disabled={!isSuperAdmin || !editingName}
              />
            </div>
            <div className="space-y-2">
              <Label>Legal Name</Label>
              <Input
                value={formData.legalName}
                onChange={(e) => setFormData(prev => ({ ...prev, legalName: e.target.value }))}
                disabled={readOnly}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Tax ID / Business Number</Label>
            <Input
              value={formData.taxId}
              onChange={(e) => setFormData(prev => ({ ...prev, taxId: e.target.value }))}
              disabled={readOnly}
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground">CONTACT INFORMATION</h3>
          <div className="space-y-2">
            <Label>Address</Label>
            <Input
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              disabled={readOnly}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>City</Label>
              <Input
                value={formData.city}
                onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                disabled={readOnly}
              />
            </div>
            <div className="space-y-2">
              <Label>State/Region</Label>
              <Input
                value={formData.state}
                onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                disabled={readOnly}
              />
            </div>
            <div className="space-y-2">
              <Label>Postal Code</Label>
              <Input
                value={formData.postalCode}
                onChange={(e) => setFormData(prev => ({ ...prev, postalCode: e.target.value }))}
                disabled={readOnly}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Country</Label>
              <Select
                value={formData.country}
                onValueChange={(value) => setFormData(prev => ({ ...prev, country: value }))}
                disabled={readOnly}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_COUNTRIES.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                disabled={readOnly}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                disabled={readOnly}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Website</Label>
            <Input
              value={formData.website}
              onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
              disabled={readOnly}
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground">CURRENCY & LOCALIZATION</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date Format</Label>
              <Select
                value={formData.dateFormat}
                onValueChange={(value) => setFormData(prev => ({ ...prev, dateFormat: value }))}
                disabled={readOnly}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                  <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                  <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Financial Year Start</Label>
              <Select
                value={formData.financialYearStart}
                onValueChange={(value) => setFormData(prev => ({ ...prev, financialYearStart: value }))}
                disabled={readOnly}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((month) => (
                    <SelectItem key={month} value={month}>{month}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <Button onClick={handleSave} disabled={loading || readOnly}>
            {loading ? "Saving..." : "Save Company Settings"}
          </Button>
          <Button variant="outline" onClick={loadSettings}>Reset</Button>
        </div>
      </CardContent>
    </Card>
  );
};
