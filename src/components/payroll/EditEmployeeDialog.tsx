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

interface Employee {
  id: string;
  first_name: string;
  middle_name?: string | null;
  last_name?: string | null;
  email: string;
  phone?: string | null;
  pay_type: string;
  pay_rate: number;
  country: string;
  currency: string;
  pay_group_id?: string | null;
  status: string;
  employee_type: string;
}

interface EditEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEmployeeUpdated: () => void;
  employee: Employee | null;
}

const EditEmployeeDialog = ({ open, onOpenChange, onEmployeeUpdated, employee }: EditEmployeeDialogProps) => {
  const [formData, setFormData] = useState({
    first_name: "",
    middle_name: "",
    last_name: "",
    email: "",
    phone: "",
    phone_country_code: "+256",
    gender: "",
    date_of_birth: "",
    national_id: "",
    tin: "",
    nssf_number: "",
    passport_number: "",
    pay_type: "salary",
    pay_rate: "",
    country: "",
    currency: "",
    pay_group_id: "",
    status: "active",
    piece_type: "units",
    employee_type: "local",
    bank_name: "",
    bank_branch: "",
    account_number: "",
    account_type: "",
    department: "",
  });
  const [payGroups, setPayGroups] = useState<PayGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const selectedCurrency = formData.currency ? getCurrencyByCode(formData.currency) : null;

  useEffect(() => {
    if (open && employee) {
      // Extract phone country code if phone exists
      let phoneNumber = employee.phone || "";
      let countryCode = "+256";
      
      if (phoneNumber) {
        const codes = ["+256", "+254", "+255", "+250", "+211", "+1", "+44"];
        const found = codes.find(code => phoneNumber.startsWith(code));
        if (found) {
          countryCode = found;
          phoneNumber = phoneNumber.slice(found.length);
        }
      }
      
      setFormData({
        first_name: employee.first_name || "",
        middle_name: employee.middle_name || "",
        last_name: employee.last_name || "",
        email: employee.email || "",
        phone: phoneNumber,
        phone_country_code: countryCode,
        gender: (employee as any).gender || "",
        date_of_birth: (employee as any).date_of_birth || "",
        national_id: (employee as any).national_id || "",
        tin: (employee as any).tin || "",
        nssf_number: (employee as any).nssf_number || "",
        passport_number: (employee as any).passport_number || "",
        pay_type: employee.pay_type || "salary",
        pay_rate: employee.pay_rate?.toString() || "",
        country: employee.country || "",
        currency: employee.currency || "",
        pay_group_id: employee.pay_group_id || "",
        status: employee.status || "active",
        piece_type: "units",
        employee_type: employee.employee_type || "local",
        bank_name: (employee as any).bank_name || "",
        bank_branch: (employee as any).bank_branch || "",
        account_number: (employee as any).account_number || "",
        account_type: (employee as any).account_type || "",
        department: (employee as any).department || "",
      });
      fetchPayGroups();
    }
  }, [open, employee]);

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

    if (!employee) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("employees")
        .update({
          first_name: formData.first_name,
          middle_name: formData.middle_name || null,
          last_name: formData.last_name || null,
          email: formData.email,
          phone: formData.phone ? `${formData.phone_country_code}${formData.phone}` : null,
          gender: formData.gender || null,
          date_of_birth: formData.date_of_birth || null,
          national_id: formData.national_id || null,
          tin: formData.tin || null,
          nssf_number: formData.nssf_number || null,
          passport_number: formData.passport_number || null,
          pay_type: formData.pay_type as "hourly" | "salary" | "piece_rate" | "daily_rate",
          pay_rate: parseFloat(formData.pay_rate),
          country: formData.country,
          currency: formData.currency,
          pay_group_id: formData.pay_group_id || null,
          status: formData.status as "active" | "inactive",
          employee_type: formData.employee_type as "local" | "expatriate",
          bank_name: formData.bank_name || null,
          bank_branch: formData.bank_branch || null,
          account_number: formData.account_number || null,
          account_type: formData.account_type || null,
          department: formData.department || null,
        })
        .eq("id", employee.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Employee updated successfully",
      });

      onEmployeeUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating employee:", error);
      toast({
        title: "Error",
        description: "Failed to update employee",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredPayGroups = payGroups.filter(group => 
    !formData.country || group.country === formData.country
  );

  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto modern-dialog">
        <DialogHeader className="modern-dialog-header">
          <DialogTitle className="modern-dialog-title">Edit Employee</DialogTitle>
          <DialogDescription className="modern-dialog-description">
            Update employee information and pay details
          </DialogDescription>
        </DialogHeader>

        <div className="modern-dialog-content">
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
              <Label htmlFor="phone">Phone *</Label>
              <div className="flex gap-2">
                <Select
                  value={formData.phone_country_code}
                  onValueChange={(value) => setFormData({ ...formData, phone_country_code: value })}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="+256">+256 🇺🇬</SelectItem>
                    <SelectItem value="+254">+254 🇰🇪</SelectItem>
                    <SelectItem value="+255">+255 🇹🇿</SelectItem>
                    <SelectItem value="+250">+250 🇷🇼</SelectItem>
                    <SelectItem value="+211">+211 🇸🇸</SelectItem>
                    <SelectItem value="+1">+1 🇺🇸</SelectItem>
                    <SelectItem value="+44">+44 🇬🇧</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="752 123 456"
                  required
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gender">Gender *</Label>
              <Select
                value={formData.gender}
                onValueChange={(value) => setFormData({ ...formData, gender: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date_of_birth">Date of Birth *</Label>
              <Input
                id="date_of_birth"
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="national_id">National ID Number *</Label>
              <Input
                id="national_id"
                value={formData.national_id}
                onChange={(e) => setFormData({ ...formData, national_id: e.target.value })}
                placeholder="National ID"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tin">TIN (Tax ID) *</Label>
              <Input
                id="tin"
                value={formData.tin}
                onChange={(e) => setFormData({ ...formData, tin: e.target.value })}
                placeholder="Tax Identification Number"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nssf_number">NSSF Number *</Label>
              <Input
                id="nssf_number"
                value={formData.nssf_number}
                onChange={(e) => setFormData({ ...formData, nssf_number: e.target.value })}
                placeholder="Social Security Number"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="passport_number">Passport Number</Label>
              <Input
                id="passport_number"
                value={formData.passport_number}
                onChange={(e) => setFormData({ ...formData, passport_number: e.target.value })}
                placeholder="Passport (optional)"
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
                  <SelectItem value="daily_rate">Daily Rate</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pay_rate">
                Pay Rate * 
                {formData.pay_type === "hourly" && " (hourly)"}
                {formData.pay_type === "salary" && " (monthly)"}
                {formData.pay_type === "daily_rate" && " (daily)"}
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

          {/* Bank Details Section */}
          <div className="pt-4 border-t">
            <h3 className="text-sm font-semibold mb-3">Bank Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bank_name">Bank Name *</Label>
                <Input
                  id="bank_name"
                  value={formData.bank_name}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  placeholder="e.g., Stanbic Bank"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bank_branch">Bank Branch *</Label>
                <Input
                  id="bank_branch"
                  value={formData.bank_branch}
                  onChange={(e) => setFormData({ ...formData, bank_branch: e.target.value })}
                  placeholder="e.g., Kampala Main"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="account_number">Account Number *</Label>
                <Input
                  id="account_number"
                  value={formData.account_number}
                  onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                  placeholder="Account number"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="account_type">Account Type *</Label>
                <Select
                  value={formData.account_type}
                  onValueChange={(value) => setFormData({ ...formData, account_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select account type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="savings">Savings Account</SelectItem>
                    <SelectItem value="current">Current Account</SelectItem>
                    <SelectItem value="salary">Salary Account</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Department/Project Section */}
          <div className="space-y-2">
            <Label htmlFor="department">Project/Department *</Label>
            <Input
              id="department"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              placeholder="e.g., Sales, IT, Operations"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

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
            </div>
          </div>

          <div className="modern-dialog-actions">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="modern-dialog-button-secondary flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="modern-dialog-button flex-1">
              {loading ? "Updating..." : "Update Employee"}
            </Button>
          </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditEmployeeDialog;
