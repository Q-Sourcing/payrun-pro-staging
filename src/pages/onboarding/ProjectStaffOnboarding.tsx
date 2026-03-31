// @ts-nocheck
import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  ChevronRight,
  User,
  Briefcase,
  Shield,
  Phone,
  DollarSign,
  Building2,
  ClipboardList,
  HardHat,
  Loader2,
  Upload,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from '@/lib/auth/OrgProvider';
import { useToast } from "@/hooks/use-toast";
import { ALL_COUNTRIES, CURRENCIES } from "@/lib/constants/countries";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const wizardSchema = z.object({
  // Step 1 — Project & Role
  project_id: z.string().min(1, "Project is required"),
  employee_type: z.enum(["manpower", "ippms", "expatriate"], {
    required_error: "Employee type is required",
  }),
  company_id: z.string().optional(),
  company_unit_id: z.string().optional(),
  date_joined: z.string().optional(),
  designation: z.string().optional(),

  // Step 2 — Personal Info
  first_name: z.string().min(1, "First name is required"),
  middle_name: z.string().optional(),
  last_name: z.string().optional(),
  gender: z.string().optional(),
  date_of_birth: z.string().optional(),
  nationality: z.string().optional(),
  citizenship: z.string().optional(),
  marital_status: z.string().optional(),

  // Step 3 — ID & Compliance
  national_id: z.string().optional(),
  tin: z.string().optional(),
  nssf_number: z.string().optional(),
  passport_number: z.string().optional(),

  // Step 4 — Contact
  phone_country_code: z.string().optional(),
  phone: z.string().optional(),
  personal_email: z.string().email("Invalid email").optional().or(z.literal("")),

  // Step 5 — Compensation
  pay_type: z.string().min(1, "Pay type is required"),
  pay_frequency: z.string().optional(),
  pay_rate: z.string().min(1, "Pay rate is required"),
  country: z.string().min(1, "Country is required"),
  currency: z.string().min(1, "Currency is required"),
  pay_group_id: z.string().optional(),

  // Step 6 — Bank Details
  bank_name: z.string().optional(),
  bank_branch: z.string().optional(),
  account_number: z.string().optional(),
  account_type: z.string().optional(),
});

type WizardValues = z.infer<typeof wizardSchema>;

// Per-step field triggers for validation
const STEP_FIELDS: Record<number, (keyof WizardValues)[]> = {
  1: ["project_id", "employee_type"],
  2: ["first_name"],
  3: [],
  4: [],
  5: ["pay_type", "pay_rate", "country", "currency"],
  6: [],
  7: [],
};

// ---------------------------------------------------------------------------
// Step config
// ---------------------------------------------------------------------------

const STEPS = [
  { id: 1, label: "Project & Role", icon: Briefcase },
  { id: 2, label: "Personal Info", icon: User },
  { id: 3, label: "ID & Compliance", icon: Shield },
  { id: 4, label: "Contact", icon: Phone },
  { id: 5, label: "Compensation", icon: DollarSign },
  { id: 6, label: "Bank Details", icon: Building2 },
  { id: 7, label: "Review & Submit", icon: ClipboardList },
];

const PHONE_CODES = [
  { value: "+256", label: "+256 (UG)" },
  { value: "+254", label: "+254 (KE)" },
  { value: "+255", label: "+255 (TZ)" },
  { value: "+250", label: "+250 (RW)" },
  { value: "+211", label: "+211 (SS)" },
  { value: "+1", label: "+1 (US)" },
  { value: "+44", label: "+44 (UK)" },
];

const PAY_TYPE_OPTIONS: Record<string, { value: string; label: string }[]> = {
  manpower: [
    { value: "salary", label: "Salary" },
    { value: "daily_rate", label: "Daily Rate" },
  ],
  ippms: [
    { value: "piece_rate", label: "Piece Rate" },
    { value: "daily_rate", label: "Daily Rate" },
  ],
  expatriate: [{ value: "salary", label: "Salary" }],
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ProjectStaffOnboarding() {
  const navigate = useNavigate();
  const { projectId: routeProjectId } = useParams<{ projectId?: string }>();
  const [searchParams] = useSearchParams();
  const queryProjectId = searchParams.get("project") || "";
  const { organizationId } = useOrg();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<{ id: string; name: string } | null>(null);

  const form = useForm<WizardValues>({
    resolver: zodResolver(wizardSchema),
    defaultValues: {
      project_id: routeProjectId || queryProjectId || "",
      employee_type: undefined,
      company_id: "",
      company_unit_id: "",
      date_joined: "",
      designation: "",
      first_name: "",
      middle_name: "",
      last_name: "",
      gender: "",
      date_of_birth: "",
      nationality: "",
      citizenship: "",
      marital_status: "",
      national_id: "",
      tin: "",
      nssf_number: "",
      passport_number: "",
      phone_country_code: "+256",
      phone: "",
      personal_email: "",
      pay_type: "",
      pay_frequency: "",
      pay_rate: "",
      country: "",
      currency: "",
      pay_group_id: "",
      bank_name: "",
      bank_branch: "",
      account_number: "",
      account_type: "",
    },
    mode: "onChange",
  });

  const { watch, setValue, trigger, getValues } = form;
  const watchedEmployeeType = watch("employee_type");
  const watchedCompanyId = watch("company_id");
  const watchedCountry = watch("country");
  const watchedPayType = watch("pay_type");

  // Auto-fill currency when country changes
  useEffect(() => {
    if (watchedCountry) {
      const found = ALL_COUNTRIES.find((c) => c.code === watchedCountry);
      if (found) setValue("currency", found.currency);
    }
  }, [watchedCountry, setValue]);

  // Reset pay_type if employee_type changes and current pay_type isn't valid
  useEffect(() => {
    if (!watchedEmployeeType) return;
    const options = PAY_TYPE_OPTIONS[watchedEmployeeType] || [];
    const current = getValues("pay_type");
    if (current && !options.find((o) => o.value === current)) {
      setValue("pay_type", "");
      setValue("pay_frequency", "");
    }
  }, [watchedEmployeeType, setValue, getValues]);

  // ---------------------------------------------------------------------------
  // Data queries
  // ---------------------------------------------------------------------------

  const { data: projects = [] } = useQuery({
    queryKey: ["projects-onboard", organizationId],
    queryFn: async () => {
      const { data } = await supabase
        .from("projects")
        .select("id, name, code")
        .eq("organization_id", organizationId)
        .order("name");
      return data || [];
    },
    enabled: !!organizationId,
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies-onboard", organizationId],
    queryFn: async () => {
      const { data } = await supabase
        .from("companies")
        .select("id, name")
        .eq("organization_id", organizationId)
        .order("name");
      return data || [];
    },
    enabled: !!organizationId,
  });

  const { data: companyUnits = [] } = useQuery({
    queryKey: ["company-units-onboard", watchedCompanyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("company_units")
        .select("id, name")
        .eq("company_id", watchedCompanyId);
      return data || [];
    },
    enabled: !!watchedCompanyId,
  });

  const { data: payGroups = [] } = useQuery({
    queryKey: ["pay-groups-onboard", organizationId],
    queryFn: async () => {
      const { data } = await supabase
        .from("pay_groups")
        .select("id, name, employee_type, pay_type, pay_frequency")
        .eq("organization_id", organizationId);
      return data || [];
    },
    enabled: !!organizationId,
  });

  const filteredPayGroups = payGroups.filter(
    (pg) => !watchedEmployeeType || pg.employee_type === watchedEmployeeType
  );

  // ---------------------------------------------------------------------------
  // Navigation helpers
  // ---------------------------------------------------------------------------

  const handleNext = async () => {
    const fieldsToValidate = STEP_FIELDS[currentStep];
    const valid = fieldsToValidate.length === 0 || (await trigger(fieldsToValidate));
    if (!valid) return;
    setCompletedSteps((prev) => new Set(prev).add(currentStep));
    setCurrentStep((s) => Math.min(s + 1, 7));
  };

  const handleBack = () => {
    setCurrentStep((s) => Math.max(s - 1, 1));
  };

  const handleStepClick = (stepId: number) => {
    if (stepId <= currentStep || completedSteps.has(stepId - 1) || stepId === 1) {
      setCurrentStep(stepId);
    }
  };

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------

  const handleSubmit = async () => {
    const valid = await trigger();
    if (!valid) {
      toast({ title: "Validation error", description: "Please fix the highlighted fields.", variant: "destructive" });
      return;
    }
    const values = getValues();
    setSubmitting(true);
    try {
      const orgId = organizationId || localStorage.getItem("active_organization_id");
      if (!orgId) throw new Error("No organization selected.");

      const ts = Date.now();
      const email =
        values.personal_email && values.personal_email.trim()
          ? values.personal_email.trim()
          : `emp.${ts}@placeholder.local`;

      const { data, error } = await supabase.from("employees").insert([
        {
          employee_number: `EMP-${ts}`,
          first_name: values.first_name,
          middle_name: values.middle_name || null,
          last_name: values.last_name || null,
          email,
          personal_email: values.personal_email || null,
          phone: values.phone ? `${values.phone_country_code || "+256"}${values.phone}` : null,
          gender: values.gender || null,
          date_of_birth: values.date_of_birth || null,
          national_id: values.national_id || null,
          nationality: values.nationality || null,
          citizenship: values.citizenship || null,
          tin: values.tin || null,
          nssf_number: values.nssf_number || null,
          passport_number: values.passport_number || null,
          pay_type: values.pay_type,
          pay_rate: Number(values.pay_rate),
          country: values.country,
          currency: values.currency,
          pay_group_id: values.pay_group_id || null,
          pay_frequency: values.pay_frequency || null,
          status: "active",
          employment_status: "Active",
          bank_name: values.bank_name || null,
          bank_branch: values.bank_branch || null,
          account_number: values.account_number || null,
          account_type: values.account_type || null,
          company_id: values.company_id || null,
          company_unit_id: values.company_unit_id || null,
          date_joined: values.date_joined || null,
          designation_id: values.designation || null,
          category: "projects",
          employee_type: values.employee_type,
          organization_id: orgId,
          project_id: values.project_id,
          marital_status: values.marital_status || null,
        },
      ]).select("id, first_name, last_name").single();

      if (error) throw error;

      const empName = [data?.first_name, data?.last_name].filter(Boolean).join(" ") || "Employee";
      setSuccessData({ id: data?.id || "", name: empName });
      setCompletedSteps((prev) => new Set(prev).add(7));
      toast({ title: "Employee onboarded", description: `${empName} has been added successfully.` });
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Something went wrong.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOnboardAnother = () => {
    form.reset();
    setCurrentStep(1);
    setCompletedSteps(new Set());
    setSuccessData(null);
  };

  // ---------------------------------------------------------------------------
  // Success screen
  // ---------------------------------------------------------------------------

  if (successData) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[60vh] gap-6 p-8">
        <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Onboarding Complete!</h2>
          <p className="text-muted-foreground">
            <strong>{successData.name}</strong> has been successfully onboarded as a project staff member.
          </p>
        </div>
        <div className="flex gap-3 flex-wrap justify-center">
          <Button variant="outline" onClick={handleOnboardAnother}>
            <HardHat className="h-4 w-4 mr-2" />
            Onboard Another
          </Button>
          {successData.id && (
            <Button onClick={() => navigate(`/employees/${successData.id}`)}>
              View Employee Profile
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render step content
  // ---------------------------------------------------------------------------

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1ProjectRole form={form} projects={projects} companies={companies} companyUnits={companyUnits} routeProjectId={routeProjectId || queryProjectId} />;
      case 2:
        return <Step2PersonalInfo form={form} />;
      case 3:
        return <Step3IdCompliance form={form} />;
      case 4:
        return <Step4Contact form={form} />;
      case 5:
        return <Step5Compensation form={form} watchedEmployeeType={watchedEmployeeType} filteredPayGroups={filteredPayGroups} />;
      case 6:
        return <Step6BankDetails form={form} />;
      case 7:
        return <Step7Review values={getValues()} projects={projects} companies={companies} companyUnits={companyUnits} filteredPayGroups={filteredPayGroups} />;
      default:
        return null;
    }
  };

  // ---------------------------------------------------------------------------
  // Layout
  // ---------------------------------------------------------------------------

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Top header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b bg-background sticky top-0 z-20">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <HardHat className="h-5 w-5 text-primary shrink-0" />
          <h1 className="text-lg font-semibold truncate">Onboard Project Staff</h1>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate(routeProjectId ? `/projects/${routeProjectId}/onboard/bulk` : '/onboarding/project-staff/bulk')}>
          <Upload className="h-4 w-4 mr-2" />
          Bulk Import
        </Button>
        {/* Step pills — shown on medium+ screens */}
        <div className="hidden md:flex items-center gap-1.5">
          {STEPS.map((step) => (
            <button
              key={step.id}
              onClick={() => handleStepClick(step.id)}
              className={[
                "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                currentStep === step.id
                  ? "bg-primary text-primary-foreground"
                  : completedSteps.has(step.id)
                  ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                  : "bg-muted text-muted-foreground",
              ].join(" ")}
            >
              {step.id}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left sidebar */}
        <aside className="hidden md:flex flex-col w-60 border-r bg-muted/30 sticky top-0 overflow-y-auto shrink-0">
          <div className="p-4 space-y-1">
            {STEPS.map((step) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isDone = completedSteps.has(step.id);
              return (
                <button
                  key={step.id}
                  onClick={() => handleStepClick(step.id)}
                  className={[
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors text-sm",
                    isActive
                      ? "bg-primary text-primary-foreground font-medium"
                      : isDone
                      ? "text-green-700 dark:text-green-400 hover:bg-muted"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  ].join(" ")}
                >
                  {isDone && !isActive ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                  ) : isActive ? (
                    <Icon className="h-4 w-4 shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 opacity-40" />
                  )}
                  <span className="truncate">{step.label}</span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto space-y-6">
            <div>
              <h2 className="text-xl font-semibold">
                Step {currentStep} — {STEPS[currentStep - 1].label}
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {currentStep === 7 ? "Review your entries then submit." : "Fill in the details below."}
              </p>
            </div>
            {renderStep()}
          </div>
        </main>
      </div>

      {/* Sticky bottom bar */}
      <div className="border-t bg-background px-6 py-4 flex items-center justify-between z-20">
        <Button variant="outline" onClick={handleBack} disabled={currentStep === 1}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <span className="text-sm text-muted-foreground hidden sm:block">
          Step {currentStep} of {STEPS.length}
        </span>
        {currentStep < 7 ? (
          <Button onClick={handleNext}>
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Submit
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 1 — Project & Role
// ---------------------------------------------------------------------------

function Step1ProjectRole({ form, projects, companies, companyUnits, routeProjectId }) {
  const { control, watch, setValue, formState: { errors } } = form;
  const projectOptions = projects.map((p) => ({
    value: p.id,
    label: `${p.name}${p.code ? ` (${p.code})` : ""}`,
  }));
  const companyOptions = [
    { value: "", label: "— None —" },
    ...companies.map((c) => ({ value: c.id, label: c.name })),
  ];
  const unitOptions = [
    { value: "", label: "— None —" },
    ...companyUnits.map((u) => ({ value: u.id, label: u.name })),
  ];

  const employeeType = watch("employee_type");

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>
          Project <span className="text-destructive">*</span>
        </Label>
        <Controller
          name="project_id"
          control={control}
          render={({ field }) => (
            <SearchableSelect
              options={projectOptions}
              value={field.value}
              onValueChange={field.onChange}
              placeholder="Select project..."
              searchPlaceholder="Search projects..."
              emptyMessage="No projects found"
              disabled={!!routeProjectId}
            />
          )}
        />
        {errors.project_id && (
          <p className="text-xs text-destructive">{errors.project_id.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>
          Employee Type <span className="text-destructive">*</span>
        </Label>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: "manpower", label: "Manpower" },
            { value: "ippms", label: "IPPMS" },
            { value: "expatriate", label: "Expatriate" },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setValue("employee_type", opt.value as any)}
              className={[
                "border rounded-lg p-3 text-sm font-medium transition-colors",
                employeeType === opt.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-muted-foreground/40 text-muted-foreground",
              ].join(" ")}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {errors.employee_type && (
          <p className="text-xs text-destructive">{errors.employee_type.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Company</Label>
          <Controller
            name="company_id"
            control={control}
            render={({ field }) => (
              <SearchableSelect
                options={companyOptions}
                value={field.value || ""}
                onValueChange={(val) => {
                  field.onChange(val);
                  setValue("company_unit_id", "");
                }}
                placeholder="Select company..."
                searchPlaceholder="Search companies..."
                emptyMessage="No companies found"
              />
            )}
          />
        </div>
        <div className="space-y-2">
          <Label>Company Unit</Label>
          <Controller
            name="company_unit_id"
            control={control}
            render={({ field }) => (
              <SearchableSelect
                options={unitOptions}
                value={field.value || ""}
                onValueChange={field.onChange}
                placeholder="Select unit..."
                searchPlaceholder="Search units..."
                emptyMessage="No units found"
                disabled={!watch("company_id")}
              />
            )}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Date Joined</Label>
          <Controller
            name="date_joined"
            control={control}
            render={({ field }) => (
              <Input type="date" {...field} />
            )}
          />
        </div>
        <div className="space-y-2">
          <Label>Designation</Label>
          <Controller
            name="designation"
            control={control}
            render={({ field }) => (
              <Input placeholder="e.g. Site Engineer" {...field} />
            )}
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — Personal Info
// ---------------------------------------------------------------------------

function Step2PersonalInfo({ form }) {
  const { control, formState: { errors } } = form;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>
            First Name <span className="text-destructive">*</span>
          </Label>
          <Controller name="first_name" control={control} render={({ field }) => <Input placeholder="John" {...field} />} />
          {errors.first_name && <p className="text-xs text-destructive">{errors.first_name.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>Middle Name</Label>
          <Controller name="middle_name" control={control} render={({ field }) => <Input placeholder="Optional" {...field} />} />
        </div>
        <div className="space-y-2">
          <Label>Last Name</Label>
          <Controller name="last_name" control={control} render={({ field }) => <Input placeholder="Doe" {...field} />} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Gender</Label>
          <Controller
            name="gender"
            control={control}
            render={({ field }) => (
              <Select value={field.value || ""} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-2">
          <Label>Date of Birth</Label>
          <Controller name="date_of_birth" control={control} render={({ field }) => <Input type="date" {...field} />} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Nationality</Label>
          <Controller name="nationality" control={control} render={({ field }) => <Input placeholder="e.g. Ugandan" {...field} />} />
        </div>
        <div className="space-y-2">
          <Label>Citizenship</Label>
          <Controller name="citizenship" control={control} render={({ field }) => <Input placeholder="e.g. Ugandan" {...field} />} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Marital Status</Label>
        <Controller
          name="marital_status"
          control={control}
          render={({ field }) => (
            <Select value={field.value || ""} onValueChange={field.onChange}>
              <SelectTrigger><SelectValue placeholder="Select marital status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Single">Single</SelectItem>
                <SelectItem value="Married">Married</SelectItem>
                <SelectItem value="Divorced">Divorced</SelectItem>
                <SelectItem value="Widowed">Widowed</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 3 — ID & Compliance
// ---------------------------------------------------------------------------

function Step3IdCompliance({ form }) {
  const { control } = form;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>National ID</Label>
          <Controller name="national_id" control={control} render={({ field }) => <Input placeholder="CM1234567890..." {...field} />} />
        </div>
        <div className="space-y-2">
          <Label>TIN</Label>
          <Controller name="tin" control={control} render={({ field }) => <Input placeholder="Tax ID number" {...field} />} />
        </div>
        <div className="space-y-2">
          <Label>NSSF Number</Label>
          <Controller name="nssf_number" control={control} render={({ field }) => <Input placeholder="NSSF number" {...field} />} />
        </div>
        <div className="space-y-2">
          <Label>Passport Number</Label>
          <Controller name="passport_number" control={control} render={({ field }) => <Input placeholder="Passport number" {...field} />} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">All fields in this step are optional.</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 4 — Contact
// ---------------------------------------------------------------------------

function Step4Contact({ form }) {
  const { control, formState: { errors } } = form;
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>Phone Number</Label>
        <div className="flex gap-2">
          <div className="w-40 shrink-0">
            <Controller
              name="phone_country_code"
              control={control}
              render={({ field }) => (
                <Select value={field.value || "+256"} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PHONE_CODES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <Controller
            name="phone"
            control={control}
            render={({ field }) => <Input placeholder="700000000" {...field} className="flex-1" />}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Personal Email</Label>
        <Controller
          name="personal_email"
          control={control}
          render={({ field }) => <Input type="email" placeholder="john@example.com (optional)" {...field} />}
        />
        {errors.personal_email && (
          <p className="text-xs text-destructive">{errors.personal_email.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          If left blank, a placeholder email will be auto-generated.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 5 — Compensation
// ---------------------------------------------------------------------------

function Step5Compensation({ form, watchedEmployeeType, filteredPayGroups }) {
  const { control, watch, setValue, formState: { errors } } = form;
  const watchedPayType = watch("pay_type");
  const watchedCountry = watch("country");

  const payTypeOptions = PAY_TYPE_OPTIONS[watchedEmployeeType] || [];
  const payGroupOptions = [
    { value: "", label: "— None —" },
    ...filteredPayGroups.map((pg) => ({
      value: pg.id,
      label: `${pg.name}${pg.pay_type ? ` (${pg.pay_type})` : ""}`,
    })),
  ];

  const countryOptions = ALL_COUNTRIES.map((c) => ({
    value: c.code,
    label: `${c.name} (${c.code})`,
  }));
  const currencyOptions = CURRENCIES.map((c) => ({
    value: c.code,
    label: `${c.name} (${c.code})`,
  }));

  const showPayFrequency = watchedEmployeeType === "manpower" && watchedPayType === "salary";

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>
          Pay Type <span className="text-destructive">*</span>
        </Label>
        {!watchedEmployeeType ? (
          <p className="text-xs text-muted-foreground italic">Select an employee type in Step 1 first.</p>
        ) : (
          <div className="flex gap-3 flex-wrap">
            {payTypeOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setValue("pay_type", opt.value)}
                className={[
                  "border rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                  watch("pay_type") === opt.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-muted-foreground/40 text-muted-foreground",
                ].join(" ")}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
        {errors.pay_type && <p className="text-xs text-destructive">{errors.pay_type.message}</p>}
      </div>

      {showPayFrequency && (
        <div className="space-y-2">
          <Label>Pay Frequency</Label>
          <Controller
            name="pay_frequency"
            control={control}
            render={({ field }) => (
              <Select value={field.value || ""} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue placeholder="Select frequency" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="bi_weekly">Bi-Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
      )}

      <div className="space-y-2">
        <Label>
          Pay Rate <span className="text-destructive">*</span>
        </Label>
        <Controller
          name="pay_rate"
          control={control}
          render={({ field }) => <Input type="number" min="0" step="0.01" placeholder="0.00" {...field} />}
        />
        {errors.pay_rate && <p className="text-xs text-destructive">{errors.pay_rate.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>
            Country <span className="text-destructive">*</span>
          </Label>
          <Controller
            name="country"
            control={control}
            render={({ field }) => (
              <SearchableSelect
                options={countryOptions}
                value={field.value || ""}
                onValueChange={field.onChange}
                placeholder="Select country..."
                searchPlaceholder="Search countries..."
                emptyMessage="No countries found"
              />
            )}
          />
          {errors.country && <p className="text-xs text-destructive">{errors.country.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>
            Currency <span className="text-destructive">*</span>
          </Label>
          <Controller
            name="currency"
            control={control}
            render={({ field }) => (
              <SearchableSelect
                options={currencyOptions}
                value={field.value || ""}
                onValueChange={field.onChange}
                placeholder="Select currency..."
                searchPlaceholder="Search currencies..."
                emptyMessage="No currencies found"
              />
            )}
          />
          {errors.currency && <p className="text-xs text-destructive">{errors.currency.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Pay Group</Label>
        <Controller
          name="pay_group_id"
          control={control}
          render={({ field }) => (
            <SearchableSelect
              options={payGroupOptions}
              value={field.value || ""}
              onValueChange={field.onChange}
              placeholder="Select pay group (optional)..."
              searchPlaceholder="Search pay groups..."
              emptyMessage="No pay groups found"
            />
          )}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 6 — Bank Details
// ---------------------------------------------------------------------------

function Step6BankDetails({ form }) {
  const { control } = form;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Bank Name</Label>
          <Controller name="bank_name" control={control} render={({ field }) => <Input placeholder="e.g. Stanbic Bank" {...field} />} />
        </div>
        <div className="space-y-2">
          <Label>Bank Branch</Label>
          <Controller name="bank_branch" control={control} render={({ field }) => <Input placeholder="e.g. Kampala Main" {...field} />} />
        </div>
        <div className="space-y-2">
          <Label>Account Number</Label>
          <Controller name="account_number" control={control} render={({ field }) => <Input placeholder="Account number" {...field} />} />
        </div>
        <div className="space-y-2">
          <Label>Account Type</Label>
          <Controller
            name="account_type"
            control={control}
            render={({ field }) => (
              <Select value={field.value || ""} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Savings">Savings</SelectItem>
                  <SelectItem value="Current">Current</SelectItem>
                  <SelectItem value="Mobile Money">Mobile Money</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">All bank fields are optional.</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 7 — Review & Submit
// ---------------------------------------------------------------------------

function Step7Review({ values, projects, companies, companyUnits, filteredPayGroups }) {
  const projectLabel = projects.find((p) => p.id === values.project_id)?.name || values.project_id || "—";
  const companyLabel = companies.find((c) => c.id === values.company_id)?.name || "—";
  const unitLabel = companyUnits.find((u) => u.id === values.company_unit_id)?.name || "—";
  const payGroupLabel = filteredPayGroups.find((pg) => pg.id === values.pay_group_id)?.name || "—";
  const countryLabel = ALL_COUNTRIES.find((c) => c.code === values.country)?.name || values.country || "—";
  const currencyLabel = CURRENCIES.find((c) => c.code === values.currency)?.name || values.currency || "—";

  const sections = [
    {
      title: "Project & Role",
      rows: [
        { label: "Project", value: projectLabel },
        { label: "Employee Type", value: values.employee_type || "—" },
        { label: "Company", value: companyLabel },
        { label: "Company Unit", value: unitLabel },
        { label: "Date Joined", value: values.date_joined || "—" },
        { label: "Designation", value: values.designation || "—" },
      ],
    },
    {
      title: "Personal Info",
      rows: [
        { label: "Full Name", value: [values.first_name, values.middle_name, values.last_name].filter(Boolean).join(" ") || "—" },
        { label: "Gender", value: values.gender || "—" },
        { label: "Date of Birth", value: values.date_of_birth || "—" },
        { label: "Nationality", value: values.nationality || "—" },
        { label: "Citizenship", value: values.citizenship || "—" },
        { label: "Marital Status", value: values.marital_status || "—" },
      ],
    },
    {
      title: "ID & Compliance",
      rows: [
        { label: "National ID", value: values.national_id || "—" },
        { label: "TIN", value: values.tin || "—" },
        { label: "NSSF Number", value: values.nssf_number || "—" },
        { label: "Passport Number", value: values.passport_number || "—" },
      ],
    },
    {
      title: "Contact",
      rows: [
        { label: "Phone", value: values.phone ? `${values.phone_country_code || "+256"}${values.phone}` : "—" },
        { label: "Personal Email", value: values.personal_email || "—" },
      ],
    },
    {
      title: "Compensation",
      rows: [
        { label: "Pay Type", value: values.pay_type || "—" },
        { label: "Pay Frequency", value: values.pay_frequency || "—" },
        { label: "Pay Rate", value: values.pay_rate ? `${values.pay_rate} ${values.currency || ""}` : "—" },
        { label: "Country", value: countryLabel },
        { label: "Currency", value: currencyLabel },
        { label: "Pay Group", value: payGroupLabel },
      ],
    },
    {
      title: "Bank Details",
      rows: [
        { label: "Bank Name", value: values.bank_name || "—" },
        { label: "Bank Branch", value: values.bank_branch || "—" },
        { label: "Account Number", value: values.account_number || "—" },
        { label: "Account Type", value: values.account_type || "—" },
      ],
    },
  ];

  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <Card key={section.title}>
          <CardHeader className="pb-3 pt-4 px-5">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {section.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {section.rows.map((row) => (
                <div key={row.label}>
                  <dt className="text-xs text-muted-foreground">{row.label}</dt>
                  <dd className="font-medium mt-0.5">{row.value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      ))}
      <p className="text-xs text-muted-foreground text-center pt-2">
        Please review all details before submitting. Click <strong>Submit</strong> below.
      </p>
    </div>
  );
}
