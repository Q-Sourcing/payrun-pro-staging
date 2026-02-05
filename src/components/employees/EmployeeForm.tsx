import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useToast } from "@/hooks/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { ALL_COUNTRIES, CURRENCIES, getCurrencyByCode, getCurrencyCodeFromCountryCode } from "@/lib/constants/countries";
import { PayGroupCategory, HeadOfficeSubType, ProjectsSubType, ManpowerFrequency, getSubTypesForCategory, requiresPayFrequency, getDefaultPayType } from "@/lib/types/paygroups";
import { EMPLOYEE_TYPE_TO_PROJECT_TYPE, Project } from "@/lib/types/projects";
import { ProjectsService } from "@/lib/services/projects.service";
import { PayGroupsService } from "@/lib/services/paygroups.service";
import { PayGroup } from "@/lib/types/paygroups";
import { CompaniesService, Company } from "@/lib/services/companies.service";
import { CompanyUnitsService, CompanyUnit } from '@/lib/services/company-units.service';
import { EmployeeCategoriesService, EmployeeCategory } from '@/lib/services/employee-categories.service';
import { SubDepartmentsService, SubDepartment } from '@/lib/services/sub-departments.service';
import { BanksService, Bank } from "@/lib/services/banks.service";
import { useOrg } from "@/lib/tenant/OrgContext";
import { supabase } from "@/integrations/supabase/client";
import { RBACService } from "@/lib/services/auth/rbac";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";

// Account type options
const ACCOUNT_TYPES = [
  { value: "Savings Account", label: "Savings Account" },
  { value: "Current Account", label: "Current Account" },
  { value: "Salary Account", label: "Salary Account" },
  { value: "Fixed Deposit Account", label: "Fixed Deposit Account" },
];

export type EmployeeFormValues = {
  first_name: string;
  middle_name?: string | null;
  last_name?: string | null;
  email: string;
  phone?: string | null;
  phone_country_code?: string;
  gender?: string | null;
  date_of_birth?: string | null;
  national_id?: string | null;
  tin?: string | null;
  nssf_number?: string | null;
  passport_number?: string | null;
  marital_status?: "Single" | "Married" | "Divorced" | "Widowed" | "" | null;
  pay_type: "hourly" | "salary" | "piece_rate" | "daily_rate";
  pay_rate?: number | null;
  country?: string;
  currency?: string;
  pay_group_id?: string | null;
  status?: "active" | "inactive";
  piece_type?: string;
  employment_status?: "Active" | "Terminated" | "Deceased" | "Resigned" | "Probation" | "Notice Period";
  bank_name?: string | null;
  bank_branch?: string | null;
  account_number?: string | null;
  account_type?: string | null;
  sub_department?: string | null;
  company_id?: string | null;
  company_unit_id?: string | null;
  sub_department_id?: string | null;
  date_joined?: string | null;
  employee_number?: string | null;
  employee_prefix?: string | null;
  reporting_manager_id?: string | "" | null;
  category?: PayGroupCategory | "";
  employee_type?: HeadOfficeSubType | ProjectsSubType | "";
  pay_frequency?: ManpowerFrequency | "";
  project_id?: string | "";
};

const employeeFormSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  middle_name: z.string().optional().nullable(),
  last_name: z.string().optional().nullable(),
  email: z.string().email("Invalid email"),
  phone: z.string().optional().nullable(),
  phone_country_code: z.string().optional(),
  gender: z.string().optional().nullable(),
  date_of_birth: z.string().optional().nullable(),
  national_id: z.string().optional().nullable(),
  tin: z.string().optional().nullable(),
  nssf_number: z.string().optional().nullable(),
  passport_number: z.string().optional().nullable(),
  marital_status: z.enum(["Single", "Married", "Divorced", "Widowed"]).optional().or(z.literal("")).or(z.null()),
  pay_type: z.enum(["hourly", "salary", "piece_rate", "daily_rate"]),
  pay_rate: z.number().nullable().optional(),
  country: z.string().optional(),
  currency: z.string().optional(),
  pay_group_id: z.string().optional().nullable(),
  status: z.enum(["active", "inactive"]).optional(),
  piece_type: z.string().optional(),
  employment_status: z.enum(["Active", "Terminated", "Deceased", "Resigned", "Probation", "Notice Period"]).optional(),
  bank_name: z.string().optional().nullable(),
  bank_branch: z.string().optional().nullable(),
  account_number: z.string().optional().nullable(),
  account_type: z.string().optional().nullable(),
  sub_department: z.string().optional().nullable(),
  company_id: z.string().optional().nullable(),
  company_unit_id: z.string().optional().nullable(),
  sub_department_id: z.string().optional().nullable(),
  date_joined: z.string().optional().nullable(),
  employee_number: z.string().optional().nullable(),
  employee_prefix: z.string().optional().nullable(),
  reporting_manager_id: z.string().optional().or(z.literal("")).or(z.null()),
  category: z.enum(["head_office", "projects"], { required_error: "Category is required" }),
  employee_type: z.string({ required_error: "Employee Type is required" }).min(1, "Employee Type is required"),
  pay_frequency: z.enum(["daily", "bi_weekly", "monthly"]).optional().or(z.literal("")),
  project_id: z.string().optional().or(z.literal("")),
}).superRefine((data, ctx) => {
  if (data.employee_type === "manpower" && !data.pay_frequency) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Pay Frequency is required for Manpower",
      path: ["pay_frequency"],
    });
  }
  if (data.category === "projects" && !data.project_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Project is required for Projects category",
      path: ["project_id"],
    });
  }
});

export type EmployeeFormProps = {
  mode: "create" | "edit";
  defaultValues?: Partial<EmployeeFormValues>;
  onSubmit: (data: EmployeeFormValues) => Promise<void> | void;
};

type PayGroupOption = { id: string; name: string };

export const EmployeeForm = ({ mode, defaultValues, onSubmit }: EmployeeFormProps) => {
  const { toast } = useToast();
  const { organizationId, companyId } = useOrg();
  const { userContext, profile } = useSupabaseAuth(); // Use auth context for roles

  // Get user role from JWT claims or fall back to profile.role from database
  const userRole = (userContext?.roles && userContext.roles.length > 0 ? userContext.roles[0] : null) || profile?.role;
  const userRoleCode = (typeof userRole === 'object' && userRole !== null) ? (userRole as any).role : userRole;

  // RBAC Permission Checks - Simplified to always allow both categories
  // TODO: Re-enable proper RBAC once user_roles table RLS is fixed
  const canCreateHeadOffice = true;
  const canCreateProject = true;

  // Helper function to get allowed pay types based on employee type and frequency
  const getAllowedPayTypes = (employeeType?: string, payFrequency?: string): string[] => {
    if (!employeeType) return ["hourly", "salary", "piece_rate", "daily_rate"];

    switch (employeeType) {
      case "regular":
        return ["salary"];
      case "expatriate":
        return ["daily_rate", "salary"];
      case "interns":
        return ["salary"];
      case "manpower":
        if (payFrequency === "daily") return ["daily_rate"];
        return ["salary", "daily_rate"];
      case "ippms":
        return ["piece_rate", "daily_rate"];
      default:
        return ["hourly", "salary", "piece_rate", "daily_rate"];
    }
  };

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
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
      pay_rate: undefined,
      country: "",
      currency: "",
      pay_group_id: "",
      status: "active",
      piece_type: "units",
      employment_status: "Active",
      bank_name: "",
      bank_branch: "",
      account_number: "",
      account_type: "",
      sub_department: "",
      company_id: "",
      company_unit_id: "",
      sub_department_id: "",
      date_joined: "",
      employee_number: "",
      employee_prefix: "",
      reporting_manager_id: "",
      marital_status: "",
      category: "" as PayGroupCategory | "",
      employee_type: "" as HeadOfficeSubType | ProjectsSubType | "",
      pay_frequency: "" as ManpowerFrequency | "",
      project_id: "",
      ...defaultValues,
    },
  });

  const watchCategory = form.watch("category");
  const watchEmployeeType = form.watch("employee_type");
  const watchProjectId = form.watch("project_id");
  const watchPayType = form.watch("pay_type");
  const watchPayFrequency = form.watch("pay_frequency");
  const watchCountry = form.watch("country");
  const watchCompanyId = form.watch("company_id");
  const watchCompanyUnitId = form.watch("company_unit_id");
  const watchSubDepartmentId = form.watch("sub_department_id");
  const watchEmployeePrefix = form.watch("employee_prefix");
  const watchGender = form.watch("gender");
  const watchMaritalStatus = form.watch("marital_status");
  const watchEmploymentStatus = form.watch("employment_status");
  const watchBankName = form.watch("bank_name");
  const watchAccountType = form.watch("account_type");
  const watchReportingManagerId = form.watch("reporting_manager_id");

  const watchDateJoined = form.watch("date_joined");
  const watchPayRate = form.watch("pay_rate");

  const [projects, setProjects] = useState<Project[]>([]);
  const [activeCompanyName, setActiveCompanyName] = useState<string>("");
  const [activeCompanyShortCode, setActiveCompanyShortCode] = useState<string>("");
  const [companyUnits, setCompanyUnits] = useState<CompanyUnit[]>([]);
  const [categories, setCategories] = useState<EmployeeCategory[]>([]);
  const [subDepartments, setSubDepartments] = useState<SubDepartment[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [allowedPayTypes, setAllowedPayTypes] = useState<string[]>(["hourly", "salary", "piece_rate", "daily_rate"]);
  const [payGroups, setPayGroups] = useState<PayGroupOption[]>([]);
  const [reportingManagers, setReportingManagers] = useState<Array<{ value: string; label: string }>>([]);
  const [addingSubDept, setAddingSubDept] = useState(false);
  const [newSubDeptName, setNewSubDeptName] = useState("");

  // Enforce Category Defaulting & Locking based on Permissions (Create Mode)
  useEffect(() => {
    if (mode === "create") {
      // If user can ONLY create head office, force it
      if (canCreateHeadOffice && !canCreateProject) {
        if (watchCategory !== "head_office") {
          form.setValue("category", "head_office");
        }
      }
      // If user can ONLY create projects, force it
      else if (!canCreateHeadOffice && canCreateProject) {
        if (watchCategory !== "projects") {
          form.setValue("category", "projects");
        }
      }
      // If user can do both, do nothing (allow selection)
      // If user can do neither, form will effectively be disabled/empty
    }
  }, [mode, canCreateHeadOffice, canCreateProject, watchCategory, form]); // eslint-disable-line react-hooks/exhaustive-deps


  // When country changes, derive default currency
  useEffect(() => {
    if (watchCountry) {
      const code = getCurrencyCodeFromCountryCode(watchCountry) || getCurrencyByCode(watchCountry)?.code;
      if (code) form.setValue("currency", code, { shouldDirty: true });
    }
  }, [watchCountry]);

  // Experience calculator
  const calculateExperienceFromDateJoined = (dateJoined?: string | null): string => {
    if (!dateJoined) return "";
    const start = new Date(dateJoined);
    const now = new Date();
    if (isNaN(start.getTime())) return "";
    let years = now.getFullYear() - start.getFullYear();
    let months = now.getMonth() - start.getMonth();
    if (months < 0) {
      years -= 1;
      months += 12;
    }
    if (years < 0) return "";
    const parts: string[] = [];
    if (years > 0) parts.push(`${years} year${years === 1 ? "" : "s"}`);
    if (months > 0) parts.push(`${months} month${months === 1 ? "" : "s"}`);
    return parts.join(", ") || "0 months";
  };
  const experienceText = useMemo(() => calculateExperienceFromDateJoined(watchDateJoined), [watchDateJoined]);

  // Auto-populate company from active company in OrgContext
  useEffect(() => {
    const loadActiveCompany = async () => {
      if (companyId) {
        // Set company_id from active company
        form.setValue("company_id", companyId, { shouldDirty: false });

        // Load company name for display
        try {
          const { data } = await supabase
            .from('companies')
            .select('name')
            .eq('id', companyId)
            .single();
          if (data) {
            setActiveCompanyName(data.name);
            setActiveCompanyShortCode(""); // short_code doesn't exist
          }
        } catch (error) {
          console.error('Error loading company name:', error);
          setActiveCompanyName('Unknown Company');
          setActiveCompanyShortCode('');
        }
      } else {
        setActiveCompanyName('');
        setActiveCompanyShortCode('');
      }
    };
    void loadActiveCompany();
  }, [companyId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      if (organizationId) {
        try {
          const list = await EmployeeCategoriesService.getCategoriesByOrg(organizationId);
          setCategories(list);
        } catch (error) {
          console.error('Error loading categories:', error);
        }
      }
    };
    void loadCategories();
  }, [organizationId]);

  // Load company units when company or category changes
  useEffect(() => {
    const load = async () => {
      if (watchCompanyId) {
        try {
          // Find the category ID if the watchCategory is a key (for backward compatibility or if using keys internally)
          // or if it's already the ID.
          let categoryId: string | undefined;
          if (watchCategory) {
            const cat = categories.find(c => c.id === watchCategory || c.key === watchCategory);
            categoryId = cat?.id;
          }

          const filtered = await CompanyUnitsService.getCompanyUnitsByCompanyAndCategory(
            watchCompanyId,
            categoryId,
            { includeUnclassified: true }
          );

          setCompanyUnits(filtered);
        } catch (error) {
          console.error('Error loading company units:', error);
          setCompanyUnits([]);
        }
      } else {
        setCompanyUnits([]);
        // Clear dependent fields
        form.setValue("company_unit_id", "");
        form.setValue("sub_department_id", "");
      }
    };
    void load();
  }, [watchCompanyId, watchCategory, categories]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load sub-departments when company unit changes
  useEffect(() => {
    const load = async () => {
      if (watchCompanyUnitId) {
        try {
          const list = await SubDepartmentsService.getSubDepartmentsByCompanyUnit(watchCompanyUnitId);
          setSubDepartments(list);
        } catch (error) {
          console.error('Error loading sub-departments:', error);
          setSubDepartments([]);
        }
      } else {
        setSubDepartments([]);
        // Clear dependent field
        form.setValue("sub_department_id", "");
      }
    };
    void load();
  }, [watchCompanyUnitId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load reporting managers (active employees in same org/company)
  useEffect(() => {
    const load = async () => {
      try {
        let query = supabase
          .from('employees')
          .select('id, first_name, last_name, employee_number, status, organization_id, company_id')
          .order('first_name');
        if (organizationId) {
          query = (query as any).eq('organization_id', organizationId);
        }
        if (companyId) {
          query = (query as any).eq('company_id', companyId);
        }
        query = (query as any).eq('status', 'active');
        const { data } = await query;
        const options: Array<{ value: string; label: string }> = (data || []).map((e: any) => {
          const name = [e.first_name, e.last_name].filter(Boolean).join(" ").trim();
          const num = e.employee_number ? `${e.employee_number} - ` : "";
          return { value: e.id, label: `${num}${name}` };
        });
        setReportingManagers(options);
      } catch {
        setReportingManagers([]);
      }
    };
    void load();
  }, [organizationId, companyId]);

  // Load banks when country changes
  useEffect(() => {
    const load = async () => {
      if (watchCountry) {
        try {
          const list = await BanksService.getBanksByCountry(watchCountry);
          setBanks(list);
        } catch (error) {
          console.error('Error loading banks:', error);
          setBanks([]);
        }
      } else {
        setBanks([]);
      }
    };
    void load();
  }, [watchCountry]);

  // Employee Type + Pay Frequency -> update allowed pay types and auto-select default
  useEffect(() => {
    const allowed = getAllowedPayTypes(watchEmployeeType, watchPayFrequency);
    setAllowedPayTypes(allowed);

    // Auto-select default pay type if current is not allowed
    const currentPayType = form.getValues("pay_type");
    if (!allowed.includes(currentPayType)) {
      const defaultPay = getDefaultPayType(watchCategory as PayGroupCategory, watchEmployeeType, watchPayFrequency as ManpowerFrequency);
      if (defaultPay && allowed.includes(defaultPay)) {
        form.setValue("pay_type", defaultPay as any, { shouldDirty: true });
      } else if (allowed.length > 0) {
        form.setValue("pay_type", allowed[0] as any, { shouldDirty: true });
      }
    }
  }, [watchEmployeeType, watchPayFrequency, watchCategory]); // eslint-disable-line react-hooks/exhaustive-deps

  // Category/Employee Type -> load projects
  useEffect(() => {
    const load = async () => {
      if (watchCategory === "projects" && watchEmployeeType) {
        const projectType = EMPLOYEE_TYPE_TO_PROJECT_TYPE[watchEmployeeType as keyof typeof EMPLOYEE_TYPE_TO_PROJECT_TYPE];
        if (projectType) {
          try {
            const list = await ProjectsService.getProjectsByType(projectType, organizationId || "");
            setProjects(list);
          } catch {
            setProjects([]);
          }
        } else {
          setProjects([]);
        }
      } else {
        setProjects([]);
      }
    };
    void load();
  }, [watchCategory, watchEmployeeType, organizationId]);

  // Project -> load allowed pay types
  useEffect(() => {
    const load = async () => {
      if (watchProjectId) {
        try {
          const list = await ProjectsService.getAllowedPayTypes(watchProjectId);
          // Map project pay types to form pay types (e.g., daily -> daily_rate)
          const mapped = list.map((t: string) => (t === "daily" ? "daily_rate" : t));
          setAllowedPayTypes(mapped);
          // If current pay_type not allowed, set default
          if (mapped.length > 0 && !mapped.includes(watchPayType)) {
            form.setValue("pay_type", mapped[0] as any, { shouldDirty: true });
          }
        } catch {
          setAllowedPayTypes([]);
        }
      } else {
        setAllowedPayTypes([]);
      }
    };
    void load();
  }, [watchProjectId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Derive default pay_type for category/employee_type/frequency when not project-based
  useEffect(() => {
    if (!watchProjectId && watchCategory && watchEmployeeType) {
      const def = getDefaultPayType(watchCategory as PayGroupCategory, watchEmployeeType, watchPayFrequency as ManpowerFrequency);
      if (def && def !== watchPayType) {
        form.setValue("pay_type", def as any, { shouldDirty: true });
      }
    }
  }, [watchCategory, watchEmployeeType, watchPayFrequency]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pay group filtering for projects
  useEffect(() => {
    const load = async () => {
      if (watchCategory === "projects" && watchEmployeeType && watchPayType) {
        const mapping: Record<string, "manpower" | "ippms" | "expatriate"> = {
          regular: "manpower",
          manpower: "manpower",
          ippms: "ippms",
          expatriate: "expatriate",
          interns: "manpower",
        };
        const pt = mapping[String(watchEmployeeType)] || (watchEmployeeType as any);
        try {
          const list = await PayGroupsService.getFilteredProjectPayGroups(pt, watchPayType, watchProjectId || undefined);
          setPayGroups(list.map(pg => ({ id: pg.id, name: pg.name })));
        } catch {
          setPayGroups([]);
        }
      } else {
        setPayGroups([]);
      }
    };
    void load();
  }, [watchCategory, watchEmployeeType, watchPayType, watchProjectId]);

  // Build prefix options from active company's short code and category default
  const prefixOptions = useMemo(() => {
    const base = activeCompanyShortCode || "QSS";
    return [`${base}-HO`, `${base}-PR`];
  }, [activeCompanyShortCode]);

  // When category changes, default the employee_prefix accordingly
  useEffect(() => {
    const base = activeCompanyShortCode || "QSS";
    if (watchCategory === "head_office") {
      form.setValue("employee_prefix", `${base}-HO`, { shouldDirty: true });
    } else if (watchCategory === "projects") {
      form.setValue("employee_prefix", `${base}-PR`, { shouldDirty: true });
    }
  }, [watchCategory, activeCompanyShortCode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Edit-mode default bootstrapping
  useEffect(() => {
    if (mode === "edit" && defaultValues) {
      // Ensure projects load, then apply project default, then allowed pay types then pay groups
      const bootstrap = async () => {
        if (defaultValues.category === "projects" && defaultValues.employee_type) {
          const mapping: Record<string, "manpower" | "ippms" | "expatriate"> = {
            regular: "manpower",
            manpower: "manpower",
            ippms: "ippms",
            expatriate: "expatriate",
            interns: "manpower",
          };
          const projectType = mapping[String(defaultValues.employee_type)] || (defaultValues.employee_type as any);
          try {
            const list = await ProjectsService.getProjectsByType(projectType, organizationId || "");
            setProjects(list);
          } catch {
            setProjects([]);
          }
          if (defaultValues.project_id) {
            try {
              const types = await ProjectsService.getAllowedPayTypes(defaultValues.project_id);
              setAllowedPayTypes(types);
            } catch {
              setAllowedPayTypes([]);
            }
          }
          if (defaultValues.employee_type && defaultValues.pay_type) {
            try {
              const list = await PayGroupsService.getFilteredProjectPayGroups(
                projectType,
                defaultValues.pay_type,
                defaultValues.project_id || undefined
              );
              setPayGroups(list.map(pg => ({ id: pg.id, name: pg.name })));
            } catch {
              setPayGroups([]);
            }
          }
        }
      };
      void bootstrap();
    }
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedCurrency = useMemo(
    () => (form.getValues("currency") ? getCurrencyByCode(form.getValues("currency")!) : null),
    [form.watch("currency")]
  );

  const submit = async (values: EmployeeFormValues) => {
    try {
      await onSubmit(values);
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message || "Failed to save employee",
        variant: "destructive",
      });
    }
  };

  return (
    <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
      <Accordion type="multiple" defaultValue={["personal", "employment", "pay"]} className="w-full">
        <AccordionItem value="personal">
          <AccordionTrigger>
            <div className="font-medium">Personal Information</div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-6">
              {/* Row 1: First Name, Last Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input id="first_name" {...form.register("first_name")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name *</Label>
                  <Input id="last_name" {...form.register("last_name")} />
                </div>
              </div>
              {/* Row 2: Middle Name, Email */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="middle_name">Middle Name</Label>
                  <Input id="middle_name" {...form.register("middle_name")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" type="email" {...form.register("email")} />
                </div>
              </div>
              {/* Row 3: Phone, Country */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone *</Label>
                  <div className="flex gap-2">
                    <Select
                      value={form.getValues("phone_country_code") || "+256"}
                      onValueChange={(value) => form.setValue("phone_country_code", value)}
                    >
                      <SelectTrigger className="w-24">
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
                      placeholder="752 123 456"
                      className="flex-1"
                      {...form.register("phone")}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country *</Label>
                  <SearchableSelect
                    options={ALL_COUNTRIES.map((c) => ({ value: c.code, label: c.name }))}
                    value={String(form.getValues("country") || "")}
                    onValueChange={(value) => form.setValue("country", value)}
                    placeholder="Select country"
                    searchPlaceholder="Search country..."
                    emptyMessage="No country found"
                  />
                </div>
              </div>
              {/* Row 4: Gender, Date of Birth */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select value={String(watchGender || "")} onValueChange={(value) => form.setValue("gender", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date_of_birth">Date of Birth</Label>
                  <Input id="date_of_birth" type="date" {...form.register("date_of_birth")} />
                </div>
              </div>
              {/* Row 5: National ID, Passport Number */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="national_id">National ID</Label>
                  <Input id="national_id" {...form.register("national_id")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="passport_number">Passport Number</Label>
                  <Input id="passport_number" {...form.register("passport_number")} />
                </div>
              </div>
              {/* Row 6: NSSF Number, TIN */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nssf_number">NSSF Number</Label>
                  <Input id="nssf_number" {...form.register("nssf_number")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tin">TIN</Label>
                  <Input id="tin" {...form.register("tin")} />
                </div>
              </div>
              {/* Row 7: Marital Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="marital_status">Marital Status</Label>
                  <Select
                    value={String(watchMaritalStatus || "")}
                    onValueChange={(value) => form.setValue("marital_status", value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select marital status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Single">Single</SelectItem>
                      <SelectItem value="Married">Married</SelectItem>
                      <SelectItem value="Divorced">Divorced</SelectItem>
                      <SelectItem value="Widowed">Widowed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="employment">
          <AccordionTrigger>
            <div className="font-medium">Employment Information</div>
          </AccordionTrigger>
          <AccordionContent>
            {/* Row 1: Company, Company Unit */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  value={activeCompanyName || "No company selected"}
                  disabled
                  className="bg-gray-100 cursor-not-allowed"
                  title="Company is automatically set from your active company"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company_unit">Company Unit</Label>
                <SearchableSelect
                  options={companyUnits.map((cu) => ({ value: cu.id, label: cu.name }))}
                  value={String(watchCompanyUnitId || "")}
                  onValueChange={(value) => form.setValue("company_unit_id", value)}
                  placeholder={companyUnits.length ? "Select company unit..." : "No company units available"}
                  searchPlaceholder="Search company units..."
                  emptyMessage="No company units found"
                  disabled={!watchCompanyId || companyUnits.length === 0}
                />
              </div>
            </div>

            {/* Row 2: Category, Employment Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  disabled={categories.length === 0}
                  onValueChange={(value: PayGroupCategory) => {
                    form.setValue("category", value || "");
                    form.setValue("employee_type", "");
                    form.setValue("pay_frequency", "");
                    form.setValue("project_id", "");
                  }}
                  value={watchCategory || ""}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.key}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="employment_status">Employment Status</Label>
                <Select value={String(watchEmploymentStatus || "")} onValueChange={(value) => form.setValue("employment_status", value as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Terminated">Terminated</SelectItem>
                    <SelectItem value="Deceased">Deceased</SelectItem>
                    <SelectItem value="Resigned">Resigned</SelectItem>
                    <SelectItem value="Probation">Probation</SelectItem>
                    <SelectItem value="Notice Period">Notice Period</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Employee Type selector (kept for logic), Pay Frequency when required */}
            {watchCategory && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="employee_type">Employee Type *</Label>
                  <Select
                    value={String(watchEmployeeType || "")}
                    onValueChange={(value: HeadOfficeSubType | ProjectsSubType) => {
                      form.setValue("employee_type", value || "");
                      if (value !== "manpower") {
                        form.setValue("pay_frequency", "");
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee type" />
                    </SelectTrigger>
                    <SelectContent>
                      {getSubTypesForCategory(watchCategory as PayGroupCategory).map((empType) => (
                        <SelectItem key={empType} value={empType}>
                          {empType === "regular"
                            ? "Regular"
                            : empType === "expatriate"
                              ? "Expatriate"
                              : empType === "interns"
                                ? "Interns"
                                : empType === "manpower"
                                  ? "Manpower"
                                  : empType === "ippms"
                                    ? "IPPMS"
                                    : empType}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {watchCategory && requiresPayFrequency(watchCategory as PayGroupCategory, watchEmployeeType) && (
                  <div className="space-y-2">
                    <Label htmlFor="pay_frequency">Pay Frequency</Label>
                    <Select
                      value={String(watchPayFrequency || "")}
                      onValueChange={(value: ManpowerFrequency) => form.setValue("pay_frequency", value || "")}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select pay frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="bi_weekly">Bi-weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            {watchCategory === "projects" && watchEmployeeType && (
              <div className="space-y-2 mt-4">
                <Label>Project *</Label>
                <SearchableSelect
                  options={projects.map((p) => ({ value: p.id, label: `${p.name} (${p.code})` }))}
                  value={String(watchProjectId || "")}
                  onValueChange={(value) => form.setValue("project_id", value)}
                  placeholder={projects.length ? "Search or select project..." : `No ${watchEmployeeType} projects available`}
                  searchPlaceholder="Search projects..."
                  emptyMessage="No projects found"
                  disabled={projects.length === 0}
                />
              </div>
            )}

            {/* Row 3: Date Joined, Current Experience */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="date_joined">Date Joined</Label>
                <Input id="date_joined" type="date" {...form.register("date_joined")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="current_experience">Current Experience</Label>
                <Input id="current_experience" value={experienceText} disabled className="bg-gray-100 cursor-not-allowed" />
              </div>
            </div>

            {/* Row 4: Sub-Department (with Quick Add), Reporting Manager */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="sub_department">Sub-Department</Label>
                <SearchableSelect
                  options={[
                    ...subDepartments.map((d) => ({ value: d.id, label: d.name })),
                    { value: "__add__", label: "Add new…" },
                  ]}
                  value={String(watchSubDepartmentId || "")}
                  onValueChange={async (value) => {
                    if (value === "__add__") {
                      setAddingSubDept(true);
                      return;
                    }
                    form.setValue("sub_department_id", value);
                  }}
                  placeholder={subDepartments.length ? "Select sub-department..." : "No sub-departments available"}
                  searchPlaceholder="Search sub-departments..."
                  emptyMessage="No sub-departments found"
                  disabled={!watchCompanyUnitId}
                />
                {addingSubDept && (
                  <div className="flex gap-2 mt-2">
                    <Input value={newSubDeptName} onChange={(e) => setNewSubDeptName(e.target.value)} placeholder="New sub-department name" />
                    <Button
                      size="sm"
                      onClick={async () => {
                        if (!watchCompanyUnitId || !newSubDeptName.trim()) return;
                        try {
                          const created = await SubDepartmentsService.createSubDepartment({ name: newSubDeptName.trim(), company_unit_id: watchCompanyUnitId });
                          const list = await SubDepartmentsService.getSubDepartmentsByCompanyUnit(watchCompanyUnitId);
                          setSubDepartments(list);
                          form.setValue("sub_department_id", created.id, { shouldDirty: true });
                          setNewSubDeptName("");
                          setAddingSubDept(false);
                        } catch {
                          // ignore
                        }
                      }}
                    >
                      Add
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { setAddingSubDept(false); setNewSubDeptName(""); }}>
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="reporting_manager_id">Reporting Manager</Label>
                <SearchableSelect
                  options={reportingManagers}
                  value={String(watchReportingManagerId || "")}
                  onValueChange={(value) => form.setValue("reporting_manager_id", value)}
                  placeholder={reportingManagers.length ? "Select reporting manager..." : "No employees found"}
                  searchPlaceholder="Search employees..."
                  emptyMessage="No employees found"
                />
              </div>
            </div>

            {/* Row 5: Employee Number Prefix, Employee Number */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="employee_prefix">Employee Number Prefix</Label>
                <SearchableSelect
                  options={prefixOptions.map((p) => ({ value: p, label: p }))}
                  value={String(watchEmployeePrefix || "")}
                  onValueChange={(value) => form.setValue("employee_prefix", value)}
                  placeholder="Select prefix"
                  searchPlaceholder="Search prefix..."
                  emptyMessage="No prefixes"
                  disabled={prefixOptions.length === 0}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="employee_number">Employee Number</Label>
                <Input
                  id="employee_number"
                  value={(mode === "edit" ? (form.getValues("employee_number") || "") : "")}
                  placeholder={mode === "create" ? "Will be generated on save" : ""}
                  disabled
                  className="bg-gray-100 cursor-not-allowed"
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="pay">
          <AccordionTrigger>
            <div className="font-medium">Pay Information</div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pay_type">Pay Type *</Label>
                <Select value={watchPayType || ""} onValueChange={(value) => form.setValue("pay_type", value as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["hourly", "salary", "piece_rate", "daily_rate"] as const)
                      .filter((pt) => allowedPayTypes.length === 0 || allowedPayTypes.includes(pt))
                      .map((pt) => (
                        <SelectItem key={pt} value={pt}>
                          {pt === "hourly"
                            ? "Hourly"
                            : pt === "salary"
                              ? "Salary (Monthly)"
                              : pt === "piece_rate"
                                ? "Piece Rate"
                                : "Daily Rate"}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pay_rate">Pay Rate *</Label>
                <Input
                  id="pay_rate"
                  type="number"
                  step={selectedCurrency?.decimalPlaces === 0 ? "1" : "0.01"}
                  value={watchPayRate ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    form.setValue("pay_rate", val === "" ? null : Number(val));
                  }}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="currency">Currency *</Label>
                <SearchableSelect
                  options={CURRENCIES.map((c) => ({ value: c.code, label: `${c.code} - ${c.symbol}` }))}
                  value={String(form.getValues("currency") || "")}
                  onValueChange={(value) => form.setValue("currency", value)}
                  placeholder="Select currency"
                  searchPlaceholder="Search currency..."
                  emptyMessage="No currency found"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pay_group_id">Pay Group (optional)</Label>
                <SearchableSelect
                  options={[{ value: "__none__", label: "No pay group" }, ...payGroups.map((pg) => ({ value: pg.id, label: pg.name }))]}
                  value={String(form.getValues("pay_group_id") || "__none__")}
                  onValueChange={(value) => form.setValue("pay_group_id", value === "__none__" ? "" : value)}
                  placeholder="Select pay group (optional)"
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="bank">
          <AccordionTrigger>
            <div className="font-medium">Bank Details</div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bank_name">Bank Name</Label>
                <SearchableSelect
                  options={banks.map((b) => ({ value: b.name, label: b.name }))}
                  value={String(watchBankName || "")}
                  onValueChange={(value) => form.setValue("bank_name", value)}
                  placeholder={banks.length ? "Select bank..." : watchCountry ? "No banks available" : "Select country first"}
                  searchPlaceholder="Search banks..."
                  emptyMessage="No banks found"
                  disabled={!watchCountry || banks.length === 0}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank_branch">Bank Branch</Label>
                <Input id="bank_branch" {...form.register("bank_branch")} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="account_number">Account Number</Label>
                <Input id="account_number" {...form.register("account_number")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account_type">Account Type</Label>
                <Select
                  value={String(watchAccountType || "")}
                  onValueChange={(value) => form.setValue("account_type", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select account type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Separator className="my-2" />

      <div className="flex justify-end gap-3">
        <Button type="submit" className="min-w-[120px]">
          {mode === "create" ? "Create Employee" : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}


