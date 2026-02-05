import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { log, warn, error, debug } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PayRunsService } from "@/lib/data/payruns.service";
import { PayrollCalculationService, CalculationInput } from "@/lib/types/payroll-calculations";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useOrg } from '@/lib/tenant/OrgContext';
import { ProjectsService } from '@/lib/services/projects.service';
import { PayGroupsService } from '@/lib/services/paygroups.service';
import { useQuery } from '@tanstack/react-query';

// Function to generate payrun ID
const generatePayrunId = (payGroupName: string): string => {
  // Extract first letters of each word in the pay group name
  const prefix = payGroupName
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .join('');

  // Get current date and time
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  // Format: [Prefix]-[YYYYMMDD]-[HHMMSS]
  return `${prefix}-${year}${month}${day}-${hours}${minutes}${seconds}`;
};

import { PayGroup } from '@/lib/types/paygroups';

interface CreatePayRunDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPayRunCreated: () => void;
  payrollType?: string; // Optional prop to fix type when opened from a specific page
  defaultCategory?: string; // New: category filter
  defaultEmployeeType?: string; // New: employee_type filter
  defaultPayFrequency?: string; // New: pay_frequency filter
  onSuccess?: () => void; // Alias for onPayRunCreated
  initialIppmsPayType?: 'piece_rate' | 'daily_rate'; // New: preferred IPPMS pay type
}

const CreatePayRunDialog = ({
  open,
  onOpenChange,
  onPayRunCreated,
  payrollType,
  defaultCategory,
  defaultEmployeeType,
  defaultPayFrequency,
  onSuccess,
  initialIppmsPayType
}: CreatePayRunDialogProps) => {
  const [payGroups, setPayGroups] = useState<PayGroup[]>([]);
  const [loading, setLoading] = useState(false);
  // IPPMS-specific: selected pay type
  const [ippmsPayType, setIppmsPayType] = useState<'piece_rate' | 'daily_rate'>(initialIppmsPayType || 'piece_rate');

  interface FormData {
    payroll_type: string;
    project_id: string;
    pay_group_id: string;
    pay_run_date: Date;
    pay_period_start: Date;
    pay_period_end: Date;
    category: string;
    employee_type: string;
    pay_frequency: string;
    default_pieces_completed: number;
    default_piece_rate: number;
  }

  const [formData, setFormData] = useState<FormData>({
    payroll_type: payrollType || "",
    project_id: "", // NEW: Project selection for project-based pay runs
    pay_group_id: "",
    pay_run_date: new Date(),
    pay_period_start: new Date(),
    pay_period_end: new Date(),
    category: defaultCategory || "",
    employee_type: defaultEmployeeType || "",
    pay_frequency: defaultPayFrequency || "",
    default_pieces_completed: 0, // Default pieces completed for piece_rate employees
    default_piece_rate: 0, // Default rate per piece for employees without a set rate
  });
  const { toast } = useToast();
  const { organizationId } = useOrg();

  const handleSuccess = onSuccess || onPayRunCreated;

  // Determine if this is a project-based payrun
  const isProjectBased = formData.category === 'projects' || defaultCategory === 'projects';

  // Fetch projects filtered by employee type (for project-based payruns only)
  const { data: projects = [] } = useQuery({
    queryKey: ['projects', defaultEmployeeType || formData.employee_type, organizationId],
    queryFn: async () => {
      const activeEmployeeType = defaultEmployeeType || formData.employee_type;
      if (!activeEmployeeType || !isProjectBased) return [];
      const employeeTypeMap: Record<string, 'manpower' | 'ippms' | 'expatriate'> = {
        'manpower': 'manpower',
        'ippms': 'ippms',
        'expatriate': 'expatriate'
      };
      const projectType = employeeTypeMap[activeEmployeeType.toLowerCase()];
      if (!projectType) return [];
      return ProjectsService.getProjectsByType(projectType, organizationId || '');
    },
    enabled: isProjectBased && !!(defaultEmployeeType || formData.employee_type)
  });

  // Fetch pay groups filtered by selected project (for project-based payruns)
  const { data: projectPayGroups = [], refetch: refetchPayGroups } = useQuery({
    queryKey: ['project-paygroups', formData.project_id, defaultEmployeeType || formData.employee_type, ippmsPayType, defaultPayFrequency || formData.pay_frequency, organizationId],
    queryFn: async () => {
      const activeEmployeeType = defaultEmployeeType || formData.employee_type;
      const activePayFrequency = defaultPayFrequency || formData.pay_frequency;

      if (!formData.project_id || !activeEmployeeType) return [];

      const employeeTypeMap: Record<string, 'manpower' | 'ippms' | 'expatriate'> = {
        'manpower': 'manpower',
        'ippms': 'ippms',
        'expatriate': 'expatriate'
      };
      const employeeType = employeeTypeMap[activeEmployeeType.toLowerCase()];
      if (!employeeType) return [];

      return PayGroupsService.getProjectPayGroups({
        organizationId,
        projectId: formData.project_id,
        employeeType,
        payType: employeeType === 'ippms' ? ippmsPayType : undefined,
        payFrequency: employeeType === 'manpower' ? activePayFrequency : undefined
      });
    },
    enabled: isProjectBased && !!formData.project_id && !!(defaultEmployeeType || formData.employee_type)
  });


  // Clear pay group selection when project changes
  useEffect(() => {
    if (isProjectBased) {
      setFormData(prev => ({ ...prev, pay_group_id: "" }));
    }
  }, [formData.project_id, isProjectBased]);

  const selectedPayGroup = payGroups.find(group => group.id === formData.pay_group_id);
  const generatedId = selectedPayGroup ? generatePayrunId(selectedPayGroup.name) : "";

  useEffect(() => {
    if (open) {
      // Only fetch pay groups for non-project-based payruns automatically
      // or if category is already set
      if (!isProjectBased && formData.category) {
        fetchPayGroups();
      }
      // Reset form with defaults
      setFormData(prev => ({
        ...prev,
        payroll_type: payrollType || prev.payroll_type || "",
        project_id: "", // Reset project selection
        category: defaultCategory || prev.category || "",
        employee_type: defaultEmployeeType || prev.employee_type || "",
        pay_frequency: defaultPayFrequency || prev.pay_frequency || "",
        default_pieces_completed: 0,
        default_piece_rate: 0,
      }));
      // Reset IPPMS pay type
      if ((defaultEmployeeType || formData.employee_type || "").toLowerCase() === "ippms") {
        setIppmsPayType(initialIppmsPayType || 'piece_rate');
      }
    }
  }, [open, payrollType, defaultCategory, defaultEmployeeType, defaultPayFrequency, initialIppmsPayType, isProjectBased, formData.category, formData.employee_type]);

  const fetchPayGroups = async () => {
    try {
      console.log("🔍 Fetching pay groups, payrollType:", payrollType);
      setLoading(true);

      let data, error;

      // Always fetch from pay_group_master table for consistency
      let query = (supabase
        .from("pay_group_master" as any)
        .select("id, name, country, currency, code, type, source_table, source_id, category, employee_type, pay_frequency, pay_type")
        .eq("active", true)
        .order("name", { ascending: true }) as any);

      // Filter by category/employee_type/pay_frequency if provided
      const filterCategory = defaultCategory || formData.category;
      const filterEmployeeType = defaultEmployeeType || formData.employee_type;
      const filterPayFrequency = defaultPayFrequency || formData.pay_frequency;

      if (filterCategory) {
        query = query.eq("category", filterCategory);
      }

      if (filterEmployeeType) {
        if (filterEmployeeType === 'regular') {
          query = (query as any).in("employee_type", ["regular", "local"]);
        } else {
          query = (query as any).eq("employee_type", filterEmployeeType);
        }
      }

      if (filterPayFrequency) {
        query = query.eq("pay_frequency", filterPayFrequency);
      }

      // Filter by type if payrollType is provided (legacy support)
      if (payrollType) {
        const typeMapping = {
          "expatriate": "expatriate",
          "regular": "regular"
        };
        const masterType = typeMapping[payrollType.toLowerCase()] || payrollType.toLowerCase();
        console.log("🔍 Filtering by master type:", masterType);
        // For IPPMS context, skip type filtering so piece_rate groups are included
        if ((defaultEmployeeType || "").toLowerCase() !== "ippms") {
          query = query.eq("type", masterType);
        }
      }

      // Filtering for special employees types
      const activeEmployeeType = filterEmployeeType || "";
      if (activeEmployeeType.toLowerCase() === "ippms") {
        query = (query as any).eq("pay_type", ippmsPayType);
      }


      const result = await query;
      data = result.data;
      error = result.error;

      if (error) {
        console.error("❌ Error fetching pay groups:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to fetch pay groups",
          variant: "destructive",
        });
        setPayGroups([]);
      } else {
        console.log("✅ Pay groups fetched from pay_group_master:", data);
        console.table((data || []).map(({ id, name, type, code, country, currency }) => ({ id, name, type, code, country, currency })));
        setPayGroups(data || []);
      }
    } catch (err: any) {
      console.error("❌ Database connection failed:", err);
      // Check if it's a network error
      const isNetworkError = err.message?.includes("Failed to fetch") || err.name === "TypeError";

      toast({
        title: "Connection Issue",
        description: isNetworkError
          ? "Network error. Please check your internet connection."
          : (err.message || "Failed to fetch pay groups"),
        variant: "destructive",
      });
      setPayGroups([]);
    } finally {
      setLoading(false);
    }
  };


  // Filter pay groups based on payroll type and employee category
  // For project-based payruns, use projectPayGroups from React Query
  // For non-project payruns, use the legacy filtering logic
  const filteredPayGroups = isProjectBased
    ? projectPayGroups
    : payGroups;

  console.log("📊 Fetched PayGroups:", payGroups);
  console.log("📊 Filtered PayGroups for", formData.payroll_type || payrollType, ":", filteredPayGroups);
  console.log("📊 Payroll type:", payrollType || formData.payroll_type);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.payroll_type) {
      toast({
        title: "Error",
        description: "Please select a payroll type",
        variant: "destructive",
      });
      return;
    }

    // Validate project selection for project-based payruns
    if (isProjectBased && !formData.project_id) {
      toast({
        title: "Error",
        description: "Please select a project",
        variant: "destructive",
      });
      return;
    }

    if (!formData.pay_group_id) {
      toast({
        title: "Error",
        description: "Please select a pay group",
        variant: "destructive",
      });
      return;
    }

    if (formData.pay_period_start >= formData.pay_period_end) {
      toast({
        title: "Error",
        description: "Pay period end date must be after start date",
        variant: "destructive",
      });
      return;
    }


    setLoading(true);
    try {
      console.log("🚀 Starting pay run creation with DIRECT FETCH for DEBUGGING:", formData);

      const { data: { session } } = await supabase.auth.getSession();
      const functionName = formData.category === 'head_office' ? 'manage-head-office-payruns' : 'manage-payruns';

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          pay_run_date: formData.pay_run_date.toISOString().split('T')[0],
          pay_period_start: formData.pay_period_start.toISOString().split('T')[0],
          pay_period_end: formData.pay_period_end.toISOString().split('T')[0],
          pay_group_id: formData.pay_group_id,
          category: formData.category,
          employee_type: formData.employee_type,
          pay_frequency: formData.pay_frequency,
          payroll_type: formData.payroll_type,
          project_id: isProjectBased ? formData.project_id : undefined,
          status: "draft"
        }),
      });

      const result = await response.json();
      console.log('Result:', result);

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to create pay run');
      }


      const payRun = result.pay_run;

      console.log("✅ Pay run created via Edge Function:", payRun.id);

      toast({
        title: "Success",
        description: "Pay run created successfully",
      });

      // Reset form
      setFormData({
        payroll_type: payrollType || "",
        project_id: "",
        pay_group_id: "",
        pay_run_date: new Date(),
        pay_period_start: new Date(),
        pay_period_end: new Date(),
        category: defaultCategory || "",
        employee_type: defaultEmployeeType || "",
        pay_frequency: defaultPayFrequency || "",
        default_pieces_completed: 0,
        default_piece_rate: 0,
      });

      if (typeof handleSuccess === 'function') {
        handleSuccess();
      }
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error creating pay run:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create pay run.",
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
          <DialogTitle className="modern-dialog-title">Create New Pay Run</DialogTitle>
          <DialogDescription className="modern-dialog-description">
            Set up a new pay run for processing employee payments
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 modern-dialog-content">
          {/* Domain Selection */}
          {!defaultCategory ? (
            <div className="space-y-2">
              <Label htmlFor="category">Payroll Domain *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => {
                  const isExpat = value === 'expatriate'; // legacy? no, category is head_office/projects
                  setFormData({
                    ...formData,
                    category: value,
                    employee_type: "",
                    project_id: "",
                    pay_group_id: "",
                    payroll_type: value === 'projects' ? 'regular' : formData.payroll_type
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Head Office or Projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="head_office">Head Office</SelectItem>
                  <SelectItem value="projects">Projects</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="bg-muted/30 border border-border rounded-md p-3">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Payroll Domain</Label>
              <div className="text-sm font-semibold mt-1">
                {defaultCategory === 'head_office' ? 'Head Office' : 'Projects'}
              </div>
            </div>
          )}

          {/* Employee Type Selection for Head Office */}
          {formData.category === 'head_office' && !defaultEmployeeType && (
            <div className="space-y-2">
              <Label htmlFor="employee_type">Employee Type *</Label>
              <Select
                value={formData.employee_type}
                onValueChange={(value) => {
                  const payroll_type = value === 'expatriate' ? 'expatriate' : (value === 'ippms' ? 'piece_rate' : 'regular');
                  setFormData({
                    ...formData,
                    employee_type: value,
                    pay_group_id: "",
                    payroll_type: payroll_type
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">Regular</SelectItem>
                  <SelectItem value="expatriate">Expatriate</SelectItem>
                  <SelectItem value="interns">Interns</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}


          {/* Employee Type Selection for Projects (Manpower/IPPMS/Expatriate) */}
          {formData.category === 'projects' && !defaultEmployeeType && (
            <div className="space-y-2">
              <Label htmlFor="employee_type">Project Payroll Type *</Label>
              <Select
                value={formData.employee_type}
                onValueChange={(value) => {
                  setFormData({
                    ...formData,
                    employee_type: value,
                    project_id: "",
                    pay_group_id: "",
                    payroll_type: value === 'ippms' ? 'piece_rate' : (value === 'expatriate' ? 'expatriate' : 'regular')
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manpower">Manpower</SelectItem>
                  <SelectItem value="ippms">IPPMS</SelectItem>
                  <SelectItem value="expatriate">Expatriate</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Project Selection for Projects Category */}
          {formData.category === 'projects' && (
            <div className="space-y-2">
              <Label htmlFor="project_id">Select Project *</Label>
              <Select
                value={formData.project_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, project_id: value, pay_group_id: "" }))}
                disabled={projects.length === 0 || !formData.employee_type}
              >
                <SelectTrigger>
                  <SelectValue placeholder={!formData.employee_type ? "Select type first" : (projects.length === 0 ? "No projects available" : "Select project")} />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      <div className="flex flex-col">
                        <span>{project.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {project.code} - {project.project_type}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* IPPMS specific: Selection of piece_rate/daily_rate */}
          {formData.employee_type === 'ippms' && (
            <div className="space-y-2">
              <Label>IPPMS Rate Type *</Label>
              <Select
                value={ippmsPayType}
                onValueChange={(value) => {
                  setIppmsPayType(value as any);
                  setFormData(prev => ({ ...prev, pay_group_id: "" }));
                  fetchPayGroups();
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="piece_rate">Piece Rate</SelectItem>
                  <SelectItem value="daily_rate">Daily Rate</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="pay_group">Pay Group *</Label>
            <Select
              value={formData.pay_group_id}
              onValueChange={(value) => setFormData({ ...formData, pay_group_id: value })}
              disabled={filteredPayGroups.length === 0 || (isProjectBased && !formData.project_id)}
            >
              <SelectTrigger className={(filteredPayGroups.length === 0 || (isProjectBased && !formData.project_id)) ? "text-muted-foreground" : ""}>
                {selectedPayGroup ? (
                  <div className="flex flex-col items-start w-full">
                    <span className="font-medium">{selectedPayGroup.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {selectedPayGroup.country} - {selectedPayGroup.currency || 'UGX'} - {selectedPayGroup.type}
                      {selectedPayGroup.code && ` (${selectedPayGroup.code})`}
                    </span>
                  </div>
                ) : (
                  <SelectValue placeholder={filteredPayGroups.length === 0 ? "No pay groups found" : "Select pay group"} />
                )}
              </SelectTrigger>
              <SelectContent>
                {filteredPayGroups.length === 0 ? (
                  <SelectItem value="no-groups" disabled>
                    {formData.payroll_type === "Expatriate" ? "No expatriate pay groups found" : "No pay groups found"}
                  </SelectItem>
                ) : (
                  (() => {
                    // Group by category → employee_type → (for IPPMS) pay_type
                    const categoryOrder = ['head_office', 'projects'];
                    const grouped: Record<string, Record<string, PayGroup[]>> = {};
                    filteredPayGroups.forEach((g: any) => {
                      const cat = (g.category || 'other') as string;
                      const emp = (g.employee_type || 'other') as string;
                      grouped[cat] = grouped[cat] || {};
                      grouped[cat][emp] = grouped[cat][emp] || [];
                      grouped[cat][emp].push(g);
                    });
                    const sections: React.ReactNode[] = [];
                    const orderedCategories = Object.keys(grouped).sort((a, b) => {
                      const ai = categoryOrder.indexOf(a);
                      const bi = categoryOrder.indexOf(b);
                      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
                    });
                    orderedCategories.forEach(categoryKey => {
                      sections.push(
                        <div key={`cat-${categoryKey}`} className="py-1">
                          <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            {categoryKey === 'head_office' ? 'Head Office' : categoryKey === 'projects' ? 'Projects' : categoryKey}
                          </div>
                        </div>
                      );
                      const empTypes = Object.keys(grouped[categoryKey]);
                      empTypes.forEach(empKey => {
                        // Employee type header
                        sections.push(
                          <div key={`emp-${categoryKey}-${empKey}`} className="px-3 py-1 text-xs font-medium text-foreground/80">
                            {empKey === 'regular' ? 'Regular' :
                              empKey === 'expatriate' ? 'Expatriate' :
                                empKey === 'interns' ? 'Interns' :
                                  empKey === 'manpower' ? 'Manpower' :
                                    empKey === 'ippms' ? 'IPPMS' : empKey}
                          </div>
                        );
                        const items = grouped[categoryKey][empKey];
                        // If IPPMS, show pay_type sub-grouping label lines
                        const isIppms = empKey.toLowerCase() === 'ippms';
                        if (isIppms) {
                          const byPayType: Record<string, PayGroup[]> = {};
                          items.forEach((it: any) => {
                            const pt = (it.pay_type || 'piece_rate') as string;
                            if (!byPayType[pt]) byPayType[pt] = [];
                            byPayType[pt].push(it);
                          });
                          Object.keys(byPayType).forEach(ptKey => {
                            sections.push(
                              <div key={`pt-${categoryKey}-${empKey}-${ptKey}`} className="px-5 py-1 text-xs text-muted-foreground">
                                {ptKey === 'piece_rate' ? 'Piece Rate' : ptKey === 'daily_rate' ? 'Daily Rate' : ptKey}
                              </div>
                            );
                            byPayType[ptKey].forEach(g => {
                              sections.push(
                                <SelectItem key={g.id} value={g.id}>
                                  <div className="flex flex-col">
                                    <span>{g.name}</span>
                                    <span className="text-sm text-muted-foreground">
                                      {g.country} - {(g as any).currency || 'UGX'} - {g.type}{g.code ? ` (${g.code})` : ''}
                                    </span>
                                  </div>
                                </SelectItem>
                              );
                            });
                          });
                        } else {
                          items.forEach(g => {
                            sections.push(
                              <SelectItem key={g.id} value={g.id}>
                                <div className="flex flex-col">
                                  <span>{g.name}</span>
                                  <span className="text-sm text-muted-foreground">
                                    {g.country} - {(g as any).currency || 'UGX'} - {g.type}{g.code ? ` (${g.code})` : ''}
                                  </span>
                                </div>
                              </SelectItem>
                            );
                          });
                        }
                      });
                    });
                    return sections;
                  })()
                )}
              </SelectContent>
            </Select>
            {filteredPayGroups.length === 0 && (formData.payroll_type || (isProjectBased && formData.project_id)) && (
              <p className="text-sm text-muted-foreground">
                {isProjectBased
                  ? "No pay groups exist for this project. Create a pay group first."
                  : formData.payroll_type === "Expatriate"
                    ? "No expatriate pay groups are available. Please create one first."
                    : "No pay groups are available. Please create one first."}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="generated_id">Generated Pay Run ID</Label>
            <Input
              id="generated_id"
              value={generatedId}
              readOnly
              className="bg-muted"
            />
            <p className="text-sm text-muted-foreground">
              This ID is automatically generated based on the pay group name and current timestamp
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pay_run_date">Pay Run Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.pay_run_date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.pay_run_date ? format(formData.pay_run_date, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.pay_run_date}
                  onSelect={(date) => date && setFormData({ ...formData, pay_run_date: date })}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pay_period_start">Pay Period Start *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.pay_period_start && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.pay_period_start ? format(formData.pay_period_start, "MMM dd") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.pay_period_start}
                    onSelect={(date) => date && setFormData({ ...formData, pay_period_start: date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pay_period_end">Pay Period End *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.pay_period_end && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.pay_period_end ? format(formData.pay_period_end, "MMM dd") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.pay_period_end}
                    onSelect={(date) => date && setFormData({ ...formData, pay_period_end: date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Show pieces_completed and default_rate input for piece_rate pay groups */}
          {selectedPayGroup && selectedPayGroup.type === 'piece_rate' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="default_pieces_completed">
                  Default Pieces *
                </Label>
                <Input
                  id="default_pieces_completed"
                  type="number"
                  min="0"
                  step="1"
                  value={formData.default_pieces_completed}
                  onChange={(e) => setFormData({
                    ...formData,
                    default_pieces_completed: parseInt(e.target.value) || 0
                  })}
                  placeholder="0"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="default_piece_rate">
                  Default Rate per Piece
                </Label>
                <Input
                  id="default_piece_rate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.default_piece_rate}
                  onChange={(e) => setFormData({
                    ...formData,
                    default_piece_rate: parseFloat(e.target.value) || 0
                  })}
                  placeholder="0.00"
                />
              </div>
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground">
                  Default values will be applied to employees who don't have specific values set.
                </p>
              </div>
            </div>
          )}


          <div className="flex justify-end space-x-2 modern-dialog-actions">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="modern-dialog-button-secondary">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="modern-dialog-button">
              {loading ? "Creating..." : "Create Pay Run"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePayRunDialog;