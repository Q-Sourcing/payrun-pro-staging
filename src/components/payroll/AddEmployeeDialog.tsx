import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ALL_COUNTRIES, PIECE_RATE_TYPES, getCountryByName, formatCurrency } from "@/lib/constants/countries";

interface PayGroup {
  id: string;
  name: string;
  country: string;
}

interface AddEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEmployeeAdded: () => void;
}

const AddEmployeeDialog = ({ open, onOpenChange, onEmployeeAdded }: AddEmployeeDialogProps) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    pay_type: "hourly",
    pay_rate: "",
    country: "",
    pay_group_id: "",
    status: "active",
    piece_type: "units", // For piece-rate employees
  });
  const [payGroups, setPayGroups] = useState<PayGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Get selected country details for currency display
  const selectedCountry = formData.country ? getCountryByName(formData.country) : null;

  useEffect(() => {
    if (open) {
      fetchPayGroups();
    }
  }, [open]);

  const fetchPayGroups = async () => {
    try {
      const { data, error } = await supabase
        .from("pay_groups")
        .select("id, name, country")
        .order("name");

      if (error) throw error;
      setPayGroups(data || []);
    } catch (error) {
      console.error("Error fetching pay groups:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.pay_rate || !formData.country) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("employees").insert([
        {
          name: formData.name,
          email: formData.email,
          phone: formData.phone || null,
          pay_type: formData.pay_type as "hourly" | "salary" | "piece_rate",
          pay_rate: parseFloat(formData.pay_rate),
          country: formData.country,
          pay_group_id: formData.pay_group_id || null,
          status: formData.status as "active" | "inactive",
        },
      ]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Employee added successfully",
      });

      setFormData({
        name: "",
        email: "",
        phone: "",
        pay_type: "hourly",
        pay_rate: "",
        country: "",
        pay_group_id: "",
        status: "active",
        piece_type: "units",
      });
      onEmployeeAdded();
      onOpenChange(false);
    } catch (error) {
      console.error("Error adding employee:", error);
      toast({
        title: "Error",
        description: "Failed to add employee",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredPayGroups = payGroups.filter(group => 
    !formData.country || group.country === formData.country
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Employee</DialogTitle>
          <DialogDescription>
            Enter the employee information and pay details
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Full name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@example.com"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="Phone number"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pay_type">Pay Type *</Label>
              <Select
                value={formData.pay_type}
                onValueChange={(value) => setFormData({ ...formData, pay_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="salary">Salary</SelectItem>
                  <SelectItem value="piece_rate">Piece Rate</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pay_rate">
                Pay Rate * 
                {formData.pay_type === "hourly" && " (per hour)"}
                {formData.pay_type === "salary" && " (yearly)"}
                {formData.pay_type === "piece_rate" && ` (per ${formData.piece_type})`}
                {selectedCountry && (
                  <span className="text-sm text-muted-foreground ml-1">
                    ({selectedCountry.currencySymbol})
                  </span>
                )}
              </Label>
              <Input
                id="pay_rate"
                type="number"
                step={selectedCountry?.currency === "UGX" || selectedCountry?.currency === "TZS" || selectedCountry?.currency === "RWF" ? "1" : "0.01"}
                value={formData.pay_rate}
                onChange={(e) => setFormData({ ...formData, pay_rate: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="country">Country *</Label>
            <Select
              value={formData.country}
              onValueChange={(value) => setFormData({ ...formData, country: value, pay_group_id: "" })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                <div className="px-2 py-1 text-xs font-medium text-muted-foreground">East African Countries</div>
                {ALL_COUNTRIES.filter(c => c.isEastAfrican).map((country) => (
                  <SelectItem key={country.code} value={country.name}>
                    <div className="flex items-center justify-between w-full">
                      <span>{country.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">{country.currencySymbol}</span>
                    </div>
                  </SelectItem>
                ))}
                <div className="px-2 py-1 text-xs font-medium text-muted-foreground border-t mt-1 pt-2">Other Countries</div>
                {ALL_COUNTRIES.filter(c => !c.isEastAfrican).map((country) => (
                  <SelectItem key={country.code} value={country.name}>
                    <div className="flex items-center justify-between w-full">
                      <span>{country.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">{country.currencySymbol}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formData.pay_type === "piece_rate" && (
            <div className="space-y-2">
              <Label htmlFor="piece_type">Piece Type *</Label>
              <Select
                value={formData.piece_type}
                onValueChange={(value) => setFormData({ ...formData, piece_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PIECE_RATE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {formData.country && (
            <div className="space-y-2">
              <Label htmlFor="pay_group">Pay Group</Label>
              <Select
                value={formData.pay_group_id}
                onValueChange={(value) => setFormData({ ...formData, pay_group_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select pay group (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No pay group</SelectItem>
                  {filteredPayGroups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Adding..." : "Add Employee"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddEmployeeDialog;