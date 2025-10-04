import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ALL_COUNTRIES, CURRENCIES, PIECE_RATE_TYPES, getCurrencyByCode } from "@/lib/constants/countries";

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
    first_name: "",
    middle_name: "",
    last_name: "",
    email: "",
    phone: "",
    pay_type: "hourly",
    pay_rate: "",
    country: "",
    currency: "",
    pay_group_id: "",
    status: "active",
    piece_type: "units",
    employee_type: "local",
  });
  const [payGroups, setPayGroups] = useState<PayGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const selectedCurrency = formData.currency ? getCurrencyByCode(formData.currency) : null;

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
    if (!formData.first_name || !formData.email || !formData.pay_rate || !formData.country || !formData.currency) {
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
          first_name: formData.first_name,
          middle_name: formData.middle_name || null,
          last_name: formData.last_name || null,
          email: formData.email,
          phone: formData.phone || null,
          pay_type: formData.pay_type as "hourly" | "salary" | "piece_rate",
          pay_rate: parseFloat(formData.pay_rate),
          country: formData.country,
          currency: formData.currency,
          pay_group_id: formData.pay_group_id || null,
          status: formData.status as "active" | "inactive",
          employee_type: formData.employee_type as "local" | "expatriate",
        },
      ]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Employee added successfully",
      });

      setFormData({
        first_name: "",
        middle_name: "",
        last_name: "",
        email: "",
        phone: "",
        pay_type: "hourly",
        pay_rate: "",
        country: "",
        currency: "",
        pay_group_id: "",
        status: "active",
        piece_type: "units",
        employee_type: "local",
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
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name *</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                placeholder="First name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="middle_name">Middle Name</Label>
              <Input
                id="middle_name"
                value={formData.middle_name}
                onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })}
                placeholder="Middle name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                placeholder="Last name"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Phone number"
              />
            </div>
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
                {formData.pay_type === "hourly" && " (hourly)"}
                {formData.pay_type === "salary" && " (monthly)"}
                {formData.pay_type === "piece_rate" && ` (per ${formData.piece_type})`}
                {selectedCurrency && (
                  <span className="text-sm text-muted-foreground ml-1">
                    ({selectedCurrency.symbol})
                  </span>
                )}
              </Label>
              <Input
                id="pay_rate"
                type="number"
                step={selectedCurrency?.decimalPlaces === 0 ? "1" : "0.01"}
                value={formData.pay_rate}
                onChange={(e) => setFormData({ ...formData, pay_rate: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
                  {ALL_COUNTRIES.filter(c => c.isEastAfrican).map((country) => (
                    <SelectItem key={country.code} value={country.name}>
                      {country.name}
                    </SelectItem>
                  ))}
                  {ALL_COUNTRIES.filter(c => !c.isEastAfrican).map((country) => (
                    <SelectItem key={country.code} value={country.name}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency *</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) => setFormData({ ...formData, currency: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((currency) => (
                    <SelectItem key={currency.code} value={currency.code}>
                      {currency.code} - {currency.name} ({currency.symbol})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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

          <div className="space-y-2">
            <Label htmlFor="employee_type">Employee Type *</Label>
            <Select
              value={formData.employee_type}
              onValueChange={(value) => setFormData({ ...formData, employee_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="local">Local National</SelectItem>
                <SelectItem value="expatriate">Expatriate</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Local nationals follow standard country-specific payroll rules. Expatriates may have different tax treatments, benefits, and deductions based on company policy.
            </p>
          </div>

          {formData.country && (
            <div className="space-y-2">
              <Label htmlFor="pay_group">Pay Group</Label>
              <Select
                value={formData.pay_group_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, pay_group_id: value === "__none__" ? "" : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select pay group (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No pay group</SelectItem>
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