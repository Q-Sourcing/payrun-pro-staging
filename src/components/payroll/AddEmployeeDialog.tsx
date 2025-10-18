import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ALL_COUNTRIES, CURRENCIES, PIECE_RATE_TYPES, getCurrencyByCode } from "@/lib/constants/countries";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PayGroup {
  id: string;
  name: string;
  country: string;
  type?: string;
  pay_frequency?: string;
}

interface AddEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEmployeeAdded: () => void;
}

const AddEmployeeDialog = ({ open, onOpenChange, onEmployeeAdded }: AddEmployeeDialogProps) => {
  const [currentStep, setCurrentStep] = useState(1);
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
    employee_type: "Local",
    employee_category: "",
    employment_status: "Active",
    bank_name: "",
    bank_branch: "",
    account_number: "",
    account_type: "",
    department: "",
  });
  const [payGroups, setPayGroups] = useState<PayGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [employeeNumberCustomEnabled, setEmployeeNumberCustomEnabled] = useState(false);
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [employeeNumberError, setEmployeeNumberError] = useState("");
  const [employeePrefix, setEmployeePrefix] = useState("EMP");
  const [nextSequence, setNextSequence] = useState(1);
  const [showCreatePayGroup, setShowCreatePayGroup] = useState(false);
  const [newPayGroupName, setNewPayGroupName] = useState("");
  const [creatingPayGroup, setCreatingPayGroup] = useState(false);
  const { toast } = useToast();

  const selectedCurrency = formData.currency ? getCurrencyByCode(formData.currency) : null;

  useEffect(() => {
    if (open) {
      fetchPayGroups();
      setCurrentStep(1);
      generateEmployeeNumber();
    }
  }, [open]);

  // Handle dynamic logic when employee type changes
  useEffect(() => {
    if (formData.employee_type === "Expatriate") {
      // Auto-set pay_type to daily_rate for expatriates
      setFormData(prev => ({
        ...prev,
        pay_type: "daily_rate",
        employee_category: "" // Hide category field for expatriates
      }));
    } else if (formData.employee_type === "Local") {
      // Reset pay_type to salary for local employees
      setFormData(prev => ({
        ...prev,
        pay_type: prev.pay_type === "daily_rate" ? "salary" : prev.pay_type
      }));
    }
  }, [formData.employee_type]);

  const generateEmployeeNumber = async () => {
    try {
      // Get the next sequence number from the database
      const { data: settings, error: settingsError } = await supabase
        .from("employee_number_settings")
        .select("next_sequence, sequence_digits")
        .order("created_at", { ascending: true })
        .limit(1)
        .single();

      if (settingsError || !settings) {
        // Fallback: get the highest existing employee number
        const { data: existingEmployees, error: fetchError } = await supabase
          .from("employees")
          .select("employee_number")
          .not("employee_number", "is", null)
          .like("employee_number", `${employeePrefix}-%`)
          .order("employee_number", { ascending: false })
          .limit(1);

        if (fetchError || !existingEmployees || existingEmployees.length === 0) {
          setNextSequence(1);
        } else {
          // Extract sequence number from the highest employee number
          const lastNumber = existingEmployees[0].employee_number;
          const match = lastNumber.match(new RegExp(`${employeePrefix}-(\\d+)`));
          if (match) {
            setNextSequence(parseInt(match[1]) + 1);
          } else {
            setNextSequence(1);
          }
        }
      } else {
        setNextSequence(settings.next_sequence);
      }

      // Generate the employee number with the current sequence
      const sequenceDigits = settings?.sequence_digits || 3;
      const paddedSequence = nextSequence.toString().padStart(sequenceDigits, '0');
      const generatedNumber = `${employeePrefix}-${paddedSequence}`;
      setEmployeeNumber(generatedNumber);
    } catch (error) {
      // Fallback to simple generation
      const paddedSequence = nextSequence.toString().padStart(3, '0');
      setEmployeeNumber(`${employeePrefix}-${paddedSequence}`);
    }
  };

  const fetchPayGroups = async () => {
    try {
      const { data, error } = await supabase
        .from("pay_groups")
        .select("id, name, country, type, pay_frequency")
        .order("name");

      if (error) throw error;
      setPayGroups(data || []);
    } catch (error) {
      console.error("Error fetching pay groups:", error);
    }
  };

  // Filter pay groups based on employee type and category
  const filteredPayGroups = payGroups.filter(group => {
    if (formData.employee_type === "Expatriate") {
      return group.type === "expatriate";
    } else if (formData.employee_type === "Local") {
      return group.type === "local";
    }
    return true;
  });

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.first_name || !formData.email || !formData.phone) {
          toast({
            title: "Required Fields",
            description: "Please fill in First Name, Email, and Phone",
            variant: "destructive",
          });
          return false;
        }
        return true;
      case 2:
        if (!formData.pay_rate || !formData.country || !formData.currency) {
          toast({
            title: "Required Fields",
            description: "Please fill in Pay Rate, Country, and Currency",
            variant: "destructive",
          });
          return false;
        }
        if (formData.employee_type === "Local" && !formData.employee_category) {
          toast({
            title: "Required Fields",
            description: "Please select an Employee Category for Local employees",
            variant: "destructive",
          });
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(2)) return;

    setLoading(true);
    try {
      // Validate custom employee number uniqueness if provided
      if (employeeNumberCustomEnabled) {
        const trimmed = employeeNumber.trim();
        if (!trimmed) {
          setEmployeeNumberError("Employee ID cannot be empty");
          setLoading(false);
          return;
        }
        if (!/^[A-Za-z0-9\-]+$/.test(trimmed)) {
          setEmployeeNumberError("Only letters, numbers and hyphens allowed");
          setLoading(false);
          return;
        }
        const { count, error: countError } = await supabase
          .from("employees")
          .select("id", { count: "exact", head: true })
          .eq("employee_number", trimmed);
        if (countError) throw countError;
        if ((count || 0) > 0) {
          setEmployeeNumberError("This Employee ID already exists");
          setLoading(false);
          return;
        }
      }

      const { error } = await supabase.from("employees").insert([
        {
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
          employee_type: formData.employee_type,
          employee_category: formData.employee_category || null,
          employment_status: formData.employment_status,
          bank_name: formData.bank_name || null,
          bank_branch: formData.bank_branch || null,
          account_number: formData.account_number || null,
          account_type: formData.account_type || null,
          department: formData.department || null,
          employee_number: employeeNumber.trim() || null,
        },
      ]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Employee added successfully",
      });

      // Increment the sequence for next employee
      setNextSequence(prev => prev + 1);

      setFormData({
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
        employee_type: "Local",
        employee_category: "",
        employment_status: "Active",
        bank_name: "",
        bank_branch: "",
        account_number: "",
        account_type: "",
        department: "",
      });
      setEmployeeNumber("");
      setEmployeeNumberCustomEnabled(false);
      setEmployeeNumberError("");
      setCurrentStep(1);
      onEmployeeAdded();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error adding employee:", error);
      
      // Enhanced error handling with specific messages
      let errorMessage = "Failed to add employee";
      
      if (error?.code === "23505") {
        if (error.message?.includes("employees_email_key")) {
          errorMessage = "This email address is already registered to another employee";
        } else if (error.message?.includes("employees_phone_key")) {
          errorMessage = "This phone number is already registered to another employee";
        } else if (error.message?.includes("employees_national_id_key")) {
          errorMessage = "This National ID is already registered to another employee";
        } else if (error.message?.includes("nssf_number")) {
          errorMessage = "This Social Security Number is already registered to another employee";
        } else {
          errorMessage = "Duplicate entry detected. Please check your data.";
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error Adding Employee",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePayGroup = async () => {
    if (!newPayGroupName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a pay group name",
        variant: "destructive",
      });
      return;
    }

    if (!formData.country) {
      toast({
        title: "Error",
        description: "Please select a country first",
        variant: "destructive",
      });
      return;
    }

    setCreatingPayGroup(true);
    try {
      const { data, error } = await supabase
        .from("pay_groups")
        .insert({
          name: newPayGroupName.trim(),
          country: formData.country,
          pay_frequency: "monthly",
          default_tax_percentage: 0,
          type: formData.employee_type === 'expatriate' ? 'expatriate' : 'regular',
        })
        .select()
        .single();

      if (error) throw error;

      // Add to local list and select it
      setPayGroups([...payGroups, data]);
      setFormData({ ...formData, pay_group_id: data.id });
      setNewPayGroupName("");
      setShowCreatePayGroup(false);

      toast({
        title: "Success",
        description: "Pay group created and selected",
      });
    } catch (error: any) {
      console.error("Error creating pay group:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create pay group",
        variant: "destructive",
      });
    } finally {
      setCreatingPayGroup(false);
    }
  };

  const filteredPayGroups = payGroups.filter(group => {
    // Filter by country
    if (formData.country && group.country !== formData.country) {
      return false;
    }
    
    // Filter by employee type
    if (formData.employee_type === 'expatriate') {
      // For expatriates, only show expatriate pay groups
      return group.type === 'expatriate' || group.name.toLowerCase().includes('expat');
    } else if (formData.employee_type === 'local') {
      // For local employees, exclude expatriate pay groups
      return group.type !== 'expatriate' && !group.name.toLowerCase().includes('expat');
    }
    
    return true;
  });

  const steps = [
    { number: 1, label: "Personal Details" },
    { number: 2, label: "Employment" },
    { number: 3, label: "Bank & Project" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] p-0 gap-0 modern-dialog">
        <DialogHeader className="modern-dialog-header">
          <DialogTitle className="modern-dialog-title">
            Add New Employee (Step {currentStep} of 3)
          </DialogTitle>
          <DialogDescription className="modern-dialog-description">
            Complete the employee information in 3 steps
          </DialogDescription>
          
          {/* Progress Indicator */}
          <div className="flex items-center gap-2 mt-4">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center flex-1">
                <div className="flex flex-col items-center gap-1 flex-1">
                  <div className="flex items-center w-full">
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors
                      ${currentStep >= step.number 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted text-muted-foreground'}
                    `}>
                      {step.number}
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`
                        flex-1 h-0.5 mx-2 transition-colors
                        ${currentStep > step.number ? 'bg-primary' : 'bg-muted'}
                      `} />
                    )}
                  </div>
                  <span className={`
                    text-xs transition-colors hidden sm:block
                    ${currentStep >= step.number ? 'text-foreground font-medium' : 'text-muted-foreground'}
                  `}>
                    {step.label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </DialogHeader>

        <div className="modern-dialog-content">
          <ScrollArea className="h-[400px] px-6 py-4">
          {/* Step 1: Personal Information */}
          {currentStep === 1 && (
            <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-primary mb-3 uppercase tracking-wide">Employee Number</h3>
              <div className="space-y-3">
                {/* Prefix Configuration */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="employee_prefix" className="text-xs">Prefix</Label>
                    <Input
                      id="employee_prefix"
                      value={employeePrefix}
                      onChange={(e) => {
                        setEmployeePrefix(e.target.value.toUpperCase());
                        if (!employeeNumberCustomEnabled) {
                          // Regenerate with new prefix
                          setTimeout(() => generateEmployeeNumber(), 100);
                        }
                      }}
                      placeholder="EMP"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="next_sequence" className="text-xs">Next Sequence</Label>
                    <Input
                      id="next_sequence"
                      value={nextSequence}
                      onChange={(e) => {
                        const newSeq = parseInt(e.target.value) || 1;
                        setNextSequence(newSeq);
                        if (!employeeNumberCustomEnabled) {
                          // Regenerate with new sequence
                          setTimeout(() => generateEmployeeNumber(), 100);
                        }
                      }}
                      type="number"
                      min="1"
                      className="h-9"
                    />
                  </div>
                </div>

                {/* Employee ID Field */}
                <div className="space-y-2">
                  <Label htmlFor="employee_number" className="text-xs">Employee ID * (Auto-generated)</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      id="employee_number"
                      placeholder={employeeNumberCustomEnabled ? "Enter custom ID, e.g., EMP-024" : "Auto-generated employee ID"}
                      disabled={!employeeNumberCustomEnabled}
                      value={employeeNumber}
                      onChange={(e) => { setEmployeeNumber(e.target.value); setEmployeeNumberError(""); }}
                      className="h-9"
                    />
                    {employeeNumberCustomEnabled ? (
                      <Button type="button" variant="outline" onClick={() => { setEmployeeNumberCustomEnabled(false); generateEmployeeNumber(); setEmployeeNumberError(""); }}>Use Auto</Button>
                    ) : (
                      <div className="flex gap-1">
                        <Button type="button" variant="outline" onClick={() => setEmployeeNumberCustomEnabled(true)}>✎ Customize</Button>
                        <Button type="button" variant="outline" onClick={generateEmployeeNumber} title="Generate new ID">🔄</Button>
                      </div>
                    )}
                  </div>
                  {employeeNumberError && (
                    <p className="text-xs text-destructive">{employeeNumberError}</p>
                  )}
                  <p className="text-xs text-muted-foreground">Format: {employeePrefix}-{nextSequence.toString().padStart(3, '0')}. Next ID will be: {employeePrefix}-{(nextSequence + 1).toString().padStart(3, '0')}</p>
                </div>
              </div>
            </div>
              <div>
                <h3 className="text-sm font-semibold text-primary mb-3 uppercase tracking-wide">Personal Information</h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="first_name" className="text-xs">First Name *</Label>
                      <Input
                        id="first_name"
                        value={formData.first_name}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        placeholder="First name"
                        className="h-9"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="middle_name" className="text-xs">Middle Name</Label>
                      <Input
                        id="middle_name"
                        value={formData.middle_name}
                        onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })}
                        placeholder="Middle name"
                        className="h-9"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="last_name" className="text-xs">Last Name</Label>
                      <Input
                        id="last_name"
                        value={formData.last_name}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                        placeholder="Last name"
                        className="h-9"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-xs">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="email@example.com"
                        className="h-9"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="phone" className="text-xs">Phone *</Label>
                      <div className="flex gap-2">
                        <Select
                          value={formData.phone_country_code}
                          onValueChange={(value) => setFormData({ ...formData, phone_country_code: value })}
                        >
                          <SelectTrigger className="w-24 h-9">
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
                          className="flex-1 h-9"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="gender" className="text-xs">Gender</Label>
                      <Select
                        value={formData.gender}
                        onValueChange={(value) => setFormData({ ...formData, gender: value })}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="date_of_birth" className="text-xs">Date of Birth</Label>
                      <Input
                        id="date_of_birth"
                        type="date"
                        value={formData.date_of_birth}
                        onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                        className="h-9"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-primary mb-3 uppercase tracking-wide">Identification</h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="national_id" className="text-xs">National ID Number</Label>
                      <Input
                        id="national_id"
                        value={formData.national_id}
                        onChange={(e) => setFormData({ ...formData, national_id: e.target.value })}
                        placeholder="National ID"
                        className="h-9"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="tin" className="text-xs">TIN (Tax ID)</Label>
                      <Input
                        id="tin"
                        value={formData.tin}
                        onChange={(e) => setFormData({ ...formData, tin: e.target.value })}
                        placeholder="Tax Identification Number"
                        className="h-9"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="nssf_number" className="text-xs">Social Security Number</Label>
                      <Input
                        id="nssf_number"
                        value={formData.nssf_number}
                        onChange={(e) => setFormData({ ...formData, nssf_number: e.target.value })}
                        placeholder="Social Security Number"
                        className="h-9"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="passport_number" className="text-xs">Passport Number</Label>
                      <Input
                        id="passport_number"
                        value={formData.passport_number}
                        onChange={(e) => setFormData({ ...formData, passport_number: e.target.value })}
                        placeholder="Passport (optional)"
                        className="h-9"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Employment Details */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-primary mb-3 uppercase tracking-wide">Employment Information</h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="pay_type" className="text-xs">Pay Type *</Label>
                      <Select
                        value={formData.pay_type}
                        onValueChange={(value) => setFormData({ ...formData, pay_type: value })}
                        disabled={formData.employee_type === "Expatriate"} // Disable for expatriates (auto-set to daily_rate)
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hourly">Hourly</SelectItem>
                          <SelectItem value="salary">Salary (Monthly)</SelectItem>
                          <SelectItem value="piece_rate">Piece Rate</SelectItem>
                          <SelectItem value="daily_rate">Daily Rate</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="pay_rate" className="text-xs">
                        Pay Rate * 
                        {formData.pay_type === "hourly" && " (hourly)"}
                        {formData.pay_type === "salary" && " (monthly)"}
                        {formData.pay_type === "daily_rate" && " (daily)"}
                        {formData.pay_type === "piece_rate" && ` (per ${formData.piece_type})`}
                      </Label>
                      <Input
                        id="pay_rate"
                        type="number"
                        step={selectedCurrency?.decimalPlaces === 0 ? "1" : "0.01"}
                        value={formData.pay_rate}
                        onChange={(e) => setFormData({ ...formData, pay_rate: e.target.value })}
                        placeholder="0.00"
                        className="h-9"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="country" className="text-xs">Country *</Label>
                      <Select
                        value={formData.country}
                        onValueChange={(value) => setFormData({ ...formData, country: value, pay_group_id: "" })}
                      >
                        <SelectTrigger className="h-9">
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

                    <div className="space-y-1.5">
                      <Label htmlFor="currency" className="text-xs">Currency *</Label>
                      <Select
                        value={formData.currency}
                        onValueChange={(value) => setFormData({ ...formData, currency: value })}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                        <SelectContent>
                          {CURRENCIES.map((currency) => (
                            <SelectItem key={currency.code} value={currency.code}>
                              {currency.code} - {currency.symbol}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {formData.pay_type === "piece_rate" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="piece_type" className="text-xs">Piece Type *</Label>
                      <Select
                        value={formData.piece_type}
                        onValueChange={(value) => setFormData({ ...formData, piece_type: value })}
                      >
                        <SelectTrigger className="h-9">
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

                  <div className="space-y-1.5">
                    <Label htmlFor="employee_type" className="text-xs">Employee Type *</Label>
                    <Select
                      value={formData.employee_type}
                      onValueChange={(value) => setFormData({ ...formData, employee_type: value, employee_category: "" })}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Local">Local National</SelectItem>
                        <SelectItem value="Expatriate">Expatriate</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Local nationals follow standard country-specific payroll rules. Expatriates may have different tax treatments.
                    </p>
                  </div>

                  {/* Employee Category - only show for Local employees */}
                  {formData.employee_type === "Local" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="employee_category" className="text-xs">Employee Category *</Label>
                      <Select
                        value={formData.employee_category}
                        onValueChange={(value) => setFormData({ ...formData, employee_category: value })}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Permanent">Permanent</SelectItem>
                          <SelectItem value="On Contract">On Contract</SelectItem>
                          <SelectItem value="Temporary">Temporary</SelectItem>
                          <SelectItem value="Intern">Intern</SelectItem>
                          <SelectItem value="Trainee">Trainee</SelectItem>
                          <SelectItem value="Casual">Casual</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Employment Status */}
                  <div className="space-y-1.5">
                    <Label htmlFor="employment_status" className="text-xs">Employment Status *</Label>
                    <Select
                      value={formData.employment_status}
                      onValueChange={(value) => setFormData({ ...formData, employment_status: value })}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Probation">Probation</SelectItem>
                        <SelectItem value="Notice Period">Notice Period</SelectItem>
                        <SelectItem value="Resigned">Resigned</SelectItem>
                        <SelectItem value="Terminated">Terminated</SelectItem>
                        <SelectItem value="Deceased">Deceased</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.country && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="pay_group" className="text-xs">Pay Group</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowCreatePayGroup(true)}
                          className="h-7 text-xs text-primary hover:text-primary-dark"
                        >
                          + Create New
                        </Button>
                      </div>
                      <Select
                        value={formData.pay_group_id}
                        onValueChange={(value) =>
                          setFormData({ ...formData, pay_group_id: value === "__none__" ? "" : value })
                        }
                      >
                        <SelectTrigger className="h-9">
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
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Bank & Project Details */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-primary mb-3 uppercase tracking-wide">Banking Information</h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="bank_name" className="text-xs">Bank Name</Label>
                      <Input
                        id="bank_name"
                        value={formData.bank_name}
                        onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                        placeholder="e.g., Stanbic Bank"
                        className="h-9"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="bank_branch" className="text-xs">Bank Branch</Label>
                      <Input
                        id="bank_branch"
                        value={formData.bank_branch}
                        onChange={(e) => setFormData({ ...formData, bank_branch: e.target.value })}
                        placeholder="e.g., Kampala Main"
                        className="h-9"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="account_number" className="text-xs">Account Number</Label>
                      <Input
                        id="account_number"
                        value={formData.account_number}
                        onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                        placeholder="Account number"
                        className="h-9"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="account_type" className="text-xs">Account Type</Label>
                      <Select
                        value={formData.account_type}
                        onValueChange={(value) => setFormData({ ...formData, account_type: value })}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select account type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="savings">Savings Account</SelectItem>
                          <SelectItem value="current">Current Account</SelectItem>
                          <SelectItem value="checking">Checking Account</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-primary mb-3 uppercase tracking-wide">Project/Department</h3>
                <div className="space-y-1.5">
                  <Label htmlFor="department" className="text-xs">Project/Department</Label>
                  <Input
                    id="department"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="e.g., Engineering, Marketing"
                    className="h-9"
                  />
                </div>
              </div>
            </div>
          )}
          </ScrollArea>
        </div>

        {/* Footer with Navigation Buttons */}
        <div className="modern-dialog-actions">
          <div className="flex gap-2">
            {currentStep > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                className="modern-dialog-button-secondary gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="modern-dialog-button-secondary"
            >
              Cancel
            </Button>
            
            {currentStep < 3 ? (
              <Button
                type="button"
                onClick={handleNext}
                className="modern-dialog-button gap-1"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="modern-dialog-button"
              >
                {loading ? "Adding..." : "Add Employee"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>

      {/* Inline Pay Group Creation Dialog */}
      <Dialog open={showCreatePayGroup} onOpenChange={setShowCreatePayGroup}>
        <DialogContent className="sm:max-w-[450px] modern-dialog">
          <DialogHeader className="modern-dialog-header">
            <DialogTitle className="modern-dialog-title">Create New Pay Group</DialogTitle>
            <DialogDescription className="modern-dialog-description">
              Create a new pay group for {formData.country}
            </DialogDescription>
          </DialogHeader>
          
          <div className="modern-dialog-content">
            <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new_paygroup_name">Pay Group Name *</Label>
              <Input
                id="new_paygroup_name"
                value={newPayGroupName}
                onChange={(e) => setNewPayGroupName(e.target.value)}
                placeholder="e.g., Engineering Team, Sales Staff"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Country</Label>
                <Input value={formData.country} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Input value={formData.currency} disabled className="bg-muted" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Pay Frequency</Label>
              <Select defaultValue="monthly" disabled>
                <SelectTrigger className="bg-muted">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Default to monthly. You can configure this later in Pay Groups settings.
              </p>
            </div>
            </div>
          </div>

          <div className="modern-dialog-actions">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowCreatePayGroup(false);
                setNewPayGroupName("");
              }}
              disabled={creatingPayGroup}
              className="modern-dialog-button-secondary"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCreatePayGroup}
              disabled={creatingPayGroup}
              className="modern-dialog-button"
            >
              {creatingPayGroup ? "Creating..." : "Create & Select"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};

export default AddEmployeeDialog;
