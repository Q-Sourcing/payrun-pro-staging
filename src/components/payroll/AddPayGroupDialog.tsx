import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

  const countries = [
    "United States", "United Kingdom", "Canada", "Australia", 
    "Germany", "France", "Netherlands", "Sweden", "Other"
  ];

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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Pay Group</DialogTitle>
          <DialogDescription>
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
                onValueChange={(value) => setFormData({ ...formData, country: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country} value={country}>
                      {country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <Label htmlFor="tax_rate">Default Tax Percentage *</Label>
            <Input
              id="tax_rate"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={formData.default_tax_percentage}
              onChange={(e) => setFormData({ ...formData, default_tax_percentage: e.target.value })}
              placeholder="e.g., 20.00"
              required
            />
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