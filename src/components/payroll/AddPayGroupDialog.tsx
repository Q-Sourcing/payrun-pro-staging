import { useState } from "react";
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
    pay_frequency: "monthly",
    default_tax_percentage: "",
    description: "",
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Get selected country details and suggested tax rate
  const selectedCountry = formData.country ? getCountryByName(formData.country) : null;
  const countryDeductions = selectedCountry ? getCountryDeductions(selectedCountry.code) : [];
  const suggestedTaxRate = countryDeductions.find(d => d.name === "PAYE")?.percentage || 
                          (countryDeductions.find(d => d.name === "PAYE")?.brackets?.[1]?.rate || 0);

  const frequencies = [
    { value: "weekly", label: "Weekly" },
    { value: "bi_weekly", label: "Bi-Weekly" },
    { value: "monthly", label: "Monthly" },
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
      const { error } = await supabase.from("pay_groups").insert([
        {
          name: formData.name,
          country: formData.country,
          pay_frequency: formData.pay_frequency as "weekly" | "bi_weekly" | "monthly" | "custom",
          default_tax_percentage: taxPercentage,
          description: formData.description || null,
        },
      ]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Pay group created successfully",
      });

      setFormData({
        name: "",
        country: "",
        pay_frequency: "monthly",
        default_tax_percentage: "",
        description: "",
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