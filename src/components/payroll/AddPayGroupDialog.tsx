import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ALL_COUNTRIES, getCountryByName } from "@/lib/constants/countries";
import { getCountryDeductions } from "@/lib/constants/deductions";

interface AddPayGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPayGroupAdded: () => void;
}

const AddPayGroupDialog = ({ open, onOpenChange, onPayGroupAdded }: AddPayGroupDialogProps) => {
  const [formData, setFormData] = useState({
    name: "",
    country: "",
    type: "Local",
    pay_frequency: "monthly",
    default_tax_percentage: "",
    description: "",
    category: "" as "head_office" | "projects" | "",
    project_id: "",
  });
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Array<{ id: string; name: string; code: string; project_type: string | null; project_subtype: string | null }>>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchProjects();
    }
  }, [open]);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, code, project_type, project_subtype")
        .eq("status", "active")
        .order("name");

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  };

  // Handle project selection - auto-set pay group type and frequency from project
  const handleProjectSelection = (projectId: string) => {
    const selectedProject = projects.find(p => p.id === projectId);
    if (selectedProject && selectedProject.project_type) {
      let newType = formData.type;
      let newPayFrequency = formData.pay_frequency;

      // Map project type to pay group type
      if (selectedProject.project_type === "manpower") {
        newType = "Local"; // Manpower is typically local
        // Map project subtype to pay frequency
        if (selectedProject.project_subtype === "daily") {
          newPayFrequency = "daily_rate";
        } else if (selectedProject.project_subtype === "bi_weekly") {
          newPayFrequency = "biweekly";
        } else if (selectedProject.project_subtype === "monthly") {
          newPayFrequency = "monthly";
        }
      } else if (selectedProject.project_type === "ippms") {
        newType = "Local";
        newPayFrequency = "daily_rate"; // IPPMS typically uses piece rate/daily
      } else if (selectedProject.project_type === "expatriate") {
        newType = "Expatriate";
        newPayFrequency = "daily_rate";
      }

      setFormData({
        ...formData,
        project_id: projectId,
        type: newType,
        pay_frequency: newPayFrequency,
      });
    } else {
      setFormData({ ...formData, project_id: projectId });
    }
  };

  // Get selected country details and suggested tax rate
  const selectedCountry = formData.country ? getCountryByName(formData.country) : null;
  const countryDeductions = selectedCountry ? getCountryDeductions(selectedCountry.code) : [];
  const suggestedTaxRate = countryDeductions.find(d => d.name === "PAYE")?.percentage ||
    (countryDeductions.find(d => d.name === "PAYE")?.brackets?.[1]?.rate || 0);

  // Map UI labels to DB enum values where needed
  const frequencies = [
    { value: "weekly", label: "Weekly" },
    { value: "biweekly", label: "Bi-Weekly" },
    { value: "monthly", label: "Monthly" },
    { value: "daily_rate", label: "Daily Rate" },
    { value: "custom", label: "Custom" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.country || !formData.default_tax_percentage) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const taxPercentage = parseFloat(formData.default_tax_percentage);
    if (isNaN(taxPercentage) || taxPercentage < 0 || taxPercentage > 100) {
      toast({
        title: "Error",
        description: "Tax percentage must be between 0 and 100",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Determine if this is an expatriate pay group based on name or type
      const isExpat = formData.type === "Expatriate" || formData.name.toLowerCase().includes("expat");

      const { error } = await supabase.from("pay_groups").insert([
        {
          name: formData.name,
          country: formData.country,
          type: (isExpat ? "Expatriate" : formData.type) as any,
          pay_frequency: isExpat ? "daily_rate" : formData.pay_frequency,
          default_tax_percentage: taxPercentage,
          description: formData.description || null,
          category: formData.category || null,
          project_id: formData.category === "projects" ? formData.project_id || null : null,
          organization_id: '00000000-0000-0000-0000-000000000001',
          tax_country: formData.country || 'UG',
        } as any,
      ]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Pay group created successfully",
      });

      setFormData({
        name: "",
        country: "",
        type: "Local",
        pay_frequency: "monthly",
        default_tax_percentage: "",
        description: "",
        category: "",
        project_id: "",
      });
      onPayGroupAdded();
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating pay group:", error);
      toast({
        title: "Error",
        description: "Failed to create pay group",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] modern-dialog">
        <DialogHeader className="modern-dialog-header">
          <DialogTitle className="modern-dialog-title">Create Pay Group</DialogTitle>
          <DialogDescription className="modern-dialog-description">
            Set up a new pay group with specific frequency and tax settings
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Group Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., US Weekly Staff"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Pay Group Type *</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => {
                const isExpat = value === "Expatriate";
                setFormData({
                  ...formData,
                  type: value,
                  pay_frequency: isExpat ? "daily_rate" : formData.pay_frequency
                });
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Local">Local</SelectItem>
                <SelectItem value="Expatriate">Expatriate</SelectItem>
                <SelectItem value="Contractor">Contractor</SelectItem>
                <SelectItem value="Intern">Intern</SelectItem>
                <SelectItem value="Casual">Casual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value as "head_office" | "projects" | "", project_id: "" })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="head_office">Head Office</SelectItem>
                <SelectItem value="projects">Projects</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.category === "projects" && (
            <div className="space-y-2">
              <Label htmlFor="project">Project *</Label>
              <Select
                value={formData.project_id}
                onValueChange={handleProjectSelection}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name} ({project.code})
                      {project.project_type && ` - ${project.project_type.toUpperCase()}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {projects.length === 0 && (
                <p className="text-xs text-muted-foreground">No active projects available. Create one first.</p>
              )}
              {formData.project_id && projects.find(p => p.id === formData.project_id)?.project_type && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-2 mt-2">
                  <p className="text-xs text-blue-800">
                    <strong>Auto-set from project:</strong> Pay group type and frequency have been automatically set based on the selected project.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="country">Country *</Label>
              <Select
                value={formData.country}
                onValueChange={(value) => {
                  const country = getCountryByName(value);
                  const deductions = country ? getCountryDeductions(country.code) : [];
                  const payeTax = deductions.find(d => d.name === "PAYE");
                  const suggestedRate = payeTax?.percentage || (payeTax?.brackets?.[1]?.rate || 0);

                  setFormData({
                    ...formData,
                    country: value,
                    default_tax_percentage: suggestedRate ? suggestedRate.toString() : ""
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {ALL_COUNTRIES.filter(c => c.isEastAfrican).map((country) => (
                    <SelectItem key={country.code} value={country.name}>
                      {country.name} {country.currencySymbol}
                    </SelectItem>
                  ))}
                  {ALL_COUNTRIES.filter(c => !c.isEastAfrican).map((country) => (
                    <SelectItem key={country.code} value={country.name}>
                      {country.name} {country.currencySymbol}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedCountry && countryDeductions.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  Available deductions: {countryDeductions.map(d => d.name).join(", ")}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="frequency">Pay Frequency *</Label>
              <Select
                value={formData.pay_frequency}
                onValueChange={(value) => setFormData({ ...formData, pay_frequency: value })}
                disabled={formData.type === "Expatriate"}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {frequencies.map((freq) => (
                    <SelectItem key={freq.value} value={freq.value}>
                      {freq.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.type === "Expatriate" && (
                <div className="text-xs text-muted-foreground">
                  Expatriate pay groups automatically use Daily Rate
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tax_rate">
              Default Tax Percentage *
              {suggestedTaxRate > 0 && (
                <span className="text-sm text-muted-foreground ml-1">
                  (Suggested: {suggestedTaxRate}% based on {selectedCountry?.name} PAYE)
                </span>
              )}
            </Label>
            <Input
              id="tax_rate"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={formData.default_tax_percentage}
              onChange={(e) => setFormData({ ...formData, default_tax_percentage: e.target.value })}
              placeholder={suggestedTaxRate > 0 ? `e.g., ${suggestedTaxRate}.00` : "e.g., 20.00"}
              required
            />
            {suggestedTaxRate > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFormData({ ...formData, default_tax_percentage: suggestedTaxRate.toString() })}
                className="text-xs"
              >
                Use suggested rate ({suggestedTaxRate}%)
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Optional description for this pay group"
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Creating..." : "Create Pay Group"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddPayGroupDialog;