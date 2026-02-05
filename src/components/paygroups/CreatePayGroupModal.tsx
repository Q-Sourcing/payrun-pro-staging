import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { generatePayGroupId, generateProjectPayGroupId } from '@/lib/utils/generatePayGroupId';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users,
  Globe2,
  Briefcase,
  GraduationCap,
  HelpCircle,
  AlertCircle,
  CheckCircle,
  Loader2,
  Package
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import {
  PayGroupType,
  PayGroupFormData,
  PAYGROUP_TYPES,
  SUPPORTED_COUNTRIES,
  SUPPORTED_CURRENCIES,
  TAX_COUNTRIES,
  getCountryByCode,
  getCurrencyByCode,
  PayGroupCategory,
  HeadOfficeSubType,
  ProjectsSubType,
  ManpowerFrequency,
  getSubTypesForCategory,
  requiresPayFrequency
} from '@/lib/types/paygroups';
import { PIECE_RATE_TYPES } from '@/lib/constants/countries';
import { PayGroupsService } from '@/lib/services/paygroups.service';
import { ProjectsService } from '@/lib/services/projects.service';
import { supabase } from '@/integrations/supabase/client';
import { useOrg } from '@/lib/tenant/OrgContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { EmployeesService } from '@/lib/data/employees.service';
import { EmployeePayGroupsService } from '@/lib/services/employee-paygroups.service';

interface CreatePayGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  defaultType?: PayGroupType;
  defaultCategory?: PayGroupCategory;
  defaultEmployeeType?: HeadOfficeSubType | ProjectsSubType;
  defaultPayFrequency?: ManpowerFrequency;
}

export const CreatePayGroupModal: React.FC<CreatePayGroupModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
  defaultType,
  defaultCategory,
  defaultEmployeeType,
  defaultPayFrequency,
}) => {
  // Simple project shape for dropdown
  type Project = {
    id: string;
    name: string;
    code?: string;
    project_type?: 'manpower' | 'ippms' | 'expatriate';
    project_subtype?: 'daily' | 'bi_weekly' | 'monthly' | null;
    status?: string;
  };
  // Lock selectedType to defaultType if provided and valid, otherwise use 'regular'
  const getInitialType = (): PayGroupType => {
    try {
      if (defaultType && PAYGROUP_TYPES && typeof PAYGROUP_TYPES === 'object' && PAYGROUP_TYPES[defaultType]) {
        return defaultType;
      }
    } catch (e) {
      console.error('Error getting initial type:', e);
    }
    return 'regular';
  };

  const [selectedType, setSelectedType] = useState<PayGroupType>(() => {
    try {
      return getInitialType();
    } catch (e) {
      console.error('Error initializing selectedType:', e);
      return 'regular';
    }
  });

  // Ensure selectedType stays locked to defaultType when provided and valid
  useEffect(() => {
    try {
      if (defaultType && typeof PAYGROUP_TYPES !== 'undefined' && PAYGROUP_TYPES[defaultType] && selectedType !== defaultType) {
        setSelectedType(defaultType);
      }
    } catch (e) {
      console.error('Error in useEffect for defaultType:', e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultType]); // Removed selectedType from dependencies to prevent infinite loop
  const [selectedCategory, setSelectedCategory] = useState<PayGroupCategory | ''>('');
  const [selectedEmployeeType, setSelectedEmployeeType] = useState<HeadOfficeSubType | ProjectsSubType | ''>('');
  const [selectedPayFrequency, setSelectedPayFrequency] = useState<ManpowerFrequency | ''>('');

  const [formData, setFormData] = useState<PayGroupFormData>({
    name: '',
    type: defaultType || 'regular',
    category: undefined,
    employee_type: undefined,
    pay_frequency: undefined,
    country: '',
    currency: 'UGX',
    status: 'active',
    notes: '',
    default_tax_percentage: 30,
    exchange_rate_to_local: 3800,
    tax_country: '',
    internship_duration: 6,
    stipend_amount: 500,
    academic_institution: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [generatedPayGroupId, setGeneratedPayGroupId] = useState<string>('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [allowedPayTypes, setAllowedPayTypes] = useState<string[]>([]);
  const { toast } = useToast();
  const { organizationId } = useOrg();
  const queryClient = useQueryClient();
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      const initialType = defaultType || 'regular';
      setSelectedType(initialType);
      // Fetch active projects for selection
      void (async () => {
        try {
          const { data, error } = await supabase
            .from('projects')
            .select('id, name, code, project_type, project_subtype, status')
            .eq('status', 'active')
            .order('name');
          if (error) throw error;
          setProjects(data || []);
        } catch (err) {
          console.error('Error fetching projects:', err);
        }
      })();

      // Set context defaults if provided
      const initialCategory = defaultCategory || '';
      const initialEmployeeType = defaultEmployeeType || '';
      const initialPayFrequency = defaultPayFrequency || '';

      // Auto-set IPPMS fields when defaultType is 'piece_rate'
      if (initialType === 'piece_rate') {
        setSelectedCategory('projects');
        setSelectedEmployeeType('ippms');
        setSelectedPayFrequency('');
        setSelectedProjectId('');
        setFormData({
          name: '',
          type: initialType,
          category: 'projects',
          employee_type: 'ippms',
          pay_type: 'daily_rate',
          pay_frequency: undefined,
          country: '',
          currency: 'UGX',
          status: 'active',
          notes: '',
          default_tax_percentage: 30,
          exchange_rate_to_local: 3800,
          tax_country: 'UG',
          piece_type: undefined,
          default_piece_rate: undefined,
          minimum_pieces: undefined,
          maximum_pieces: undefined,
          internship_duration: 6,
          stipend_amount: 500,
          academic_institution: ''
        });
      } else {
        setSelectedCategory(initialCategory as PayGroupCategory | '');
        setSelectedEmployeeType(initialEmployeeType as HeadOfficeSubType | ProjectsSubType | '');
        setSelectedPayFrequency(initialPayFrequency as ManpowerFrequency | '');
        setSelectedProjectId('');
        setFormData({
          name: '',
          type: initialType,
          category: initialCategory || undefined,
          employee_type: initialEmployeeType || undefined,
          pay_frequency: initialPayFrequency || undefined,
          country: '',
          currency: initialType === 'expatriate' ? 'USD' : 'UGX',
          status: 'active',
          notes: '',
          default_tax_percentage: 30,
          exchange_rate_to_local: 3800,
          tax_country: initialType === 'expatriate' ? 'UG' : '',
          piece_type: 'units',
          default_piece_rate: 0,
          minimum_pieces: undefined,
          maximum_pieces: undefined,
          internship_duration: 6,
          stipend_amount: 500,
          academic_institution: ''
        });
      }
      setErrors({});
      setGeneratedPayGroupId('');
    }
  }, [open, defaultType, defaultCategory, defaultEmployeeType, defaultPayFrequency]);

  // Update formData when category/employee_type/pay_frequency changes
  // Skip for IPPMS (piece_rate) as those are auto-set
  useEffect(() => {
    if (defaultType === 'piece_rate') {
      // Keep IPPMS values - don't override
      return;
    }
    setFormData(prev => ({
      ...prev,
      category: selectedCategory || undefined,
      employee_type: selectedEmployeeType || undefined,
      pay_frequency: selectedPayFrequency || undefined
    }));
  }, [selectedCategory, selectedEmployeeType, selectedPayFrequency, defaultType]);

  // Handle project selection → infer type and frequency, fix category/employee_type
  const handleProjectSelection = (projectId: string) => {
    setSelectedProjectId(projectId);
    const p = projects.find(pr => pr.id === projectId);
    if (!p) return;
    // Always a projects category when a project is chosen
    setSelectedCategory('projects');
    let inferredEmployeeType: ProjectsSubType | '' = '';
    let inferredPayFrequency: ManpowerFrequency | '' = '';
    if (p.project_type === 'manpower') {
      inferredEmployeeType = 'manpower';
      if (p.project_subtype === 'daily') inferredPayFrequency = 'daily';
      else if (p.project_subtype === 'bi_weekly') inferredPayFrequency = 'bi_weekly';
      else if (p.project_subtype === 'monthly') inferredPayFrequency = 'monthly';
    } else if (p.project_type === 'ippms') {
      inferredEmployeeType = 'ippms';
    } else if (p.project_type === 'expatriate') {
      inferredEmployeeType = 'expatriate';
    }
    setSelectedEmployeeType(inferredEmployeeType);
    setSelectedPayFrequency(inferredPayFrequency);
    // Persist into formData for create
    setFormData(prev => ({
      ...prev,
      category: 'projects',
      employee_type: inferredEmployeeType || prev.employee_type,
      pay_frequency: inferredPayFrequency || undefined,
      project_id: projectId
    }));
  };

  // Filter projects by selected type context to simplify choices
  const filteredProjects = projects.filter(p => {
    const t = defaultType || selectedType;
    if (t === 'piece_rate') return p.project_type === 'ippms';
    if (t === 'regular') return p.project_type === 'manpower';
    if (t === 'expatriate') return p.project_type === 'expatriate';
    return true;
  });

  // Update form data when type changes
  useEffect(() => {
    const typeToUse = defaultType || selectedType;
    setFormData(prev => ({
      ...prev,
      type: typeToUse,
      // Set default currency based on type
      currency: typeToUse === 'expatriate' ? 'USD' : 'UGX',
      // Set default tax country for expatriate/piece_rate
      tax_country: typeToUse === 'expatriate' || typeToUse === 'piece_rate' ? 'UG' : ''
    }));
  }, [selectedType, defaultType]);

  // Load allowed pay types when a project is selected (used for IPPMS pay groups)
  useEffect(() => {
    const load = async () => {
      try {
        if (selectedProjectId) {
          const types = await ProjectsService.getAllowedPayTypes(selectedProjectId);
          // Map project pay types (e.g., daily -> daily_rate) for IPPMS/daily flows
          const mapped = (types || []).map((t: string) => (t === 'daily' ? 'daily_rate' : t));
          setAllowedPayTypes(mapped);
          // If defaulting IPPMS daily-rate, preselect daily_rate when available
          if ((defaultType === 'piece_rate' || selectedType === 'piece_rate') && mapped.includes('daily_rate')) {
            setFormData(prev => ({ ...prev, pay_type: 'daily_rate' }));
          }
        } else {
          setAllowedPayTypes([]);
        }
      } catch (e) {
        console.error('Error loading allowed pay types:', e);
        setAllowedPayTypes([]);
      }
    };
    void load();
  }, [selectedProjectId]);

  // Auto-generate PayGroup ID when name or project changes
  useEffect(() => {
    if (formData.name) {
      // If a project is selected (projects category), use project-based format
      const project = projects.find(p => p.id === selectedProjectId);
      if ((selectedCategory === 'projects' || defaultType === 'piece_rate') && project) {
        setGeneratedPayGroupId(generateProjectPayGroupId(project.name, formData.name));
      } else {
        const typeCode = selectedType === 'expatriate' ? 'EXPG' :
          selectedType === 'piece_rate' ? 'PCE' :
            selectedType === 'intern' ? 'INTR' : 'REGP';
        setGeneratedPayGroupId(generatePayGroupId(typeCode as any, formData.name));
      }
    } else {
      setGeneratedPayGroupId('');
    }
  }, [formData.name, selectedType, selectedCategory, selectedProjectId, projects, defaultType]);

  // Eligible employees for project pay groups when project and pay_type are selected
  const derivedEmployeeTypeForThisPayGroup = selectedEmployeeType || (formData.employee_type as any) || '';
  const projectAndPayTypeSelected = !!selectedProjectId && !!formData.pay_type && (selectedCategory === 'projects' || defaultType === 'piece_rate');
  const { data: eligibleEmployees = [], isLoading: loadingEligible } = useQuery({
    queryKey: ['eligible-paygroup-employees', selectedProjectId, formData.pay_type, derivedEmployeeTypeForThisPayGroup, organizationId],
    queryFn: () => EmployeesService.getEligibleEmployeesForProjectPayGroup({
      organizationId: organizationId || undefined,
      projectId: selectedProjectId,
      payType: formData.pay_type as string,
      employeeType: derivedEmployeeTypeForThisPayGroup ? String(derivedEmployeeTypeForThisPayGroup) : undefined,
    }),
    enabled: projectAndPayTypeSelected,
  });

  // Default select all eligible employees when list changes
  useEffect(() => {
    // Only update selection when both project and pay type are chosen
    if (!projectAndPayTypeSelected) {
      if (selectedEmployeeIds.length > 0) {
        setSelectedEmployeeIds([]);
      }
      return;
    }
    if (!eligibleEmployees) return;
    const newIds = eligibleEmployees.map((e: any) => e.id);
    // Compare as sets to avoid re-selecting on every render
    const prevSet = new Set(selectedEmployeeIds);
    const nextSet = new Set(newIds);
    let changed = prevSet.size !== nextSet.size;
    if (!changed) {
      for (const id of nextSet) {
        if (!prevSet.has(id)) {
          changed = true;
          break;
        }
      }
    }
    if (changed) {
      setSelectedEmployeeIds(newIds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectAndPayTypeSelected, eligibleEmployees]);

  const toggleEmployee = (id: string) => {
    setSelectedEmployeeIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // Handle input changes
  const handleInputChange = (field: keyof PayGroupFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const validationErrors = PayGroupsService.validatePayGroupData(formData);
    const errorMap: Record<string, string> = {};

    validationErrors.forEach(error => {
      // Map generic errors to specific fields
      if (error.includes('name')) errorMap.name = error;
      else if (error.includes('country')) errorMap.country = error;
      else if (error.includes('currency')) errorMap.currency = error;
      else if (error.includes('frequency')) errorMap.pay_frequency = error;
      else if (error.includes('tax percentage')) errorMap.default_tax_percentage = error;
      else if (error.includes('exchange rate')) errorMap.exchange_rate_to_local = error;
      else if (error.includes('daily rate')) errorMap.default_daily_rate = error;
      else if (error.includes('tax country')) errorMap.tax_country = error;
      else if (error.includes('piece type')) errorMap.piece_type = error;
      else if (error.includes('piece rate')) errorMap.default_piece_rate = error;
      else if (error.includes('minimum pieces')) errorMap.minimum_pieces = error;
      else if (error.includes('maximum pieces')) errorMap.maximum_pieces = error;
      else if (error.includes('stipend')) errorMap.stipend_amount = error;
    });

    setErrors(errorMap);
    // Additional validation: require project for project-based groups
    if ((selectedCategory === 'projects' || defaultType === 'piece_rate') && !selectedProjectId) {
      errorMap['project'] = 'Project selection is required for project-based pay groups';
      setErrors(errorMap);
      return false;
    }
    return Object.keys(errorMap).length === 0;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors below before submitting.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      let payGroup: any;

      // Route to appropriate service based on category
      if (formData.category === 'head_office') {
        // Use HeadOfficePayGroupsService for head office paygroups
        const { HeadOfficePayGroupsService } = await import('@/lib/services/headOfficePayGroups.service');

        // Map employee_type to HeadOfficePayGroupRefType
        const typeMap: Record<string, 'regular' | 'intern' | 'expatriate'> = {
          'regular': 'regular',
          'interns': 'intern',
          'expatriate': 'expatriate'
        };
        const headOfficeType = typeMap[formData.employee_type as string] || 'regular';

        // Create via HeadOfficePayGroupsService
        payGroup = await HeadOfficePayGroupsService.createPayGroup(headOfficeType, {
          name: formData.name,
          pay_frequency: formData.pay_frequency as any,
          country: formData.country,
          currency: formData.currency,
          default_tax_percentage: formData.default_tax_percentage,
          notes: formData.notes,
          organization_id: organizationId,
          status: 'active'
        });

        // Assign employees if selected
        if (payGroup?.id && selectedEmployeeIds.length > 0) {
          await HeadOfficePayGroupsService.addMembers(payGroup.id, headOfficeType, selectedEmployeeIds);
        }
      } else {
        // Use PayGroupsService for project-based paygroups
        payGroup = await PayGroupsService.createPayGroup(formData, organizationId || undefined);

        // Assign selected employees if any
        if (payGroup?.id && selectedEmployeeIds.length > 0 && projectAndPayTypeSelected) {
          await EmployeePayGroupsService.assignEmployeesToPayGroup({
            organizationId: organizationId || undefined,
            payGroupId: payGroup.id,
            employeeIds: selectedEmployeeIds,
          });
        }
      }

      // Invalidate caches that may reference employees/pay groups
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['project-employees', selectedProjectId] });
      queryClient.invalidateQueries({ queryKey: ['project-paygroups', selectedProjectId] });
      queryClient.invalidateQueries({ queryKey: ['paygroups'] });

      onSuccess();
    } catch (error) {
      console.error('Error creating pay group:', error);
      toast({
        title: 'Error',
        description: `Failed to create pay group: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Get icon for pay group type
  const getTypeIcon = (type?: PayGroupType) => {
    if (!type) return <HelpCircle className="h-4 w-4" />;
    switch (type) {
      case 'regular': return <Users className="h-4 w-4" />;
      case 'expatriate': return <Globe2 className="h-4 w-4" />;
      case 'piece_rate': return <Package className="h-4 w-4" />;
      case 'intern': return <GraduationCap className="h-4 w-4" />;
      default: return <HelpCircle className="h-4 w-4" />;
    }
  };

  // Render field with error state
  const renderField = (
    id: string,
    label: string,
    children: React.ReactNode,
    helpText?: string
  ) => (
    <div className="space-y-2">
      <Label htmlFor={id} className="flex items-center gap-1">
        {label}
        {helpText && (
          <HelpCircle className="h-3 w-3 text-muted-foreground" />
        )}
      </Label>
      {children}
      {errors[id] && (
        <div className="flex items-center gap-1 text-sm text-red-600">
          <AlertCircle className="h-3 w-3" />
          {errors[id]}
        </div>
      )}
      {helpText && !errors[id] && (
        <p className="text-xs text-muted-foreground">{helpText}</p>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {defaultType && typeof PAYGROUP_TYPES !== 'undefined' && PAYGROUP_TYPES[defaultType] ? (
              <>
                {getTypeIcon(defaultType)}
                Create {PAYGROUP_TYPES[defaultType]?.name || 'Pay Group'}
              </>
            ) : (
              'Create New Pay Group'
            )}
          </DialogTitle>
          <DialogDescription>
            {defaultType && typeof PAYGROUP_TYPES !== 'undefined' && PAYGROUP_TYPES[defaultType]
              ? `Set up a new ${PAYGROUP_TYPES[defaultType]?.name?.toLowerCase() || 'pay group'} for your organization.`
              : 'Set up a new pay group for your organization. Choose the type that best fits your needs.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Category and Employee Type Selection - Hide for IPPMS (piece_rate) */}
          {defaultType !== 'piece_rate' && (
            <div className="space-y-4">
              <Label className="text-base font-medium">Category & Employee Type</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderField(
                  'category',
                  'Category',
                  <Select
                    value={selectedCategory}
                    onValueChange={(value: PayGroupCategory) => {
                      setSelectedCategory(value);
                      setSelectedEmployeeType(''); // Reset employee_type when category changes
                      setSelectedPayFrequency(''); // Reset pay_frequency when category changes
                    }}
                    disabled={!!defaultCategory}
                  >
                    <SelectTrigger className={defaultCategory ? 'opacity-70 cursor-not-allowed' : ''}>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="head_office">Head Office</SelectItem>
                      <SelectItem value="projects">Projects</SelectItem>
                    </SelectContent>
                  </Select>
                )}

                {selectedCategory && (
                  renderField(
                    'employee_type',
                    'Employee Type',
                    <Select
                      value={selectedEmployeeType}
                      onValueChange={(value: HeadOfficeSubType | ProjectsSubType) => {
                        setSelectedEmployeeType(value);
                        if (value !== 'manpower') {
                          setSelectedPayFrequency(''); // Reset pay_frequency if not manpower
                        }
                      }}
                      disabled={!!defaultEmployeeType}
                    >
                      <SelectTrigger className={defaultEmployeeType ? 'opacity-70 cursor-not-allowed' : ''}>
                        <SelectValue placeholder="Select employee type" />
                      </SelectTrigger>
                      <SelectContent>
                        {getSubTypesForCategory(selectedCategory).map(empType => (
                          <SelectItem key={empType} value={empType}>
                            {empType === 'regular' ? 'Regular' :
                              empType === 'expatriate' ? 'Expatriate' :
                                empType === 'interns' ? 'Interns' :
                                  empType === 'manpower' ? 'Manpower' :
                                    empType === 'ippms' ? 'IPPMS' :
                                      empType}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )
                )}

                {selectedCategory && requiresPayFrequency(selectedCategory as PayGroupCategory, selectedEmployeeType) && (
                  renderField(
                    'pay_frequency',
                    'Pay Frequency',
                    <Select
                      value={selectedPayFrequency}
                      onValueChange={(value: ManpowerFrequency) => setSelectedPayFrequency(value)}
                      disabled={!!defaultPayFrequency}
                    >
                      <SelectTrigger className={defaultPayFrequency ? 'opacity-70 cursor-not-allowed' : ''}>
                        <SelectValue placeholder="Select pay frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="bi_weekly">Bi-weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  )
                )}
              </div>
            </div>
          )}

          {/* Pay Group Type Selection - Only show if defaultType is not provided or invalid */}
          {!defaultType || typeof PAYGROUP_TYPES === 'undefined' || !PAYGROUP_TYPES[defaultType] ? (
            <div className="space-y-4">
              <Label className="text-base font-medium">Pay Group Type</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {PAYGROUP_TYPES && Object.values(PAYGROUP_TYPES).map((type) => (
                  <motion.div
                    key={type.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Card
                      className={`cursor-pointer transition-all ${selectedType === type.id
                        ? 'ring-2 ring-blue-500 bg-blue-50'
                        : 'hover:bg-gray-50'
                        }`}
                      onClick={() => setSelectedType(type.id)}
                    >
                      <CardContent className="p-4 text-center">
                        <div className="mb-2">
                          {getTypeIcon(type.id)}
                        </div>
                        <h3 className="font-medium text-sm">{type.name.split(' ')[0]}</h3>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {type.description}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <Label className="text-base font-medium">Pay Group Type</Label>
              <div className="flex items-center gap-2 mt-2">
                {getTypeIcon(defaultType)}
                <span className="text-sm text-gray-700 font-semibold">
                  {PAYGROUP_TYPES[defaultType]?.name || defaultType}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {PAYGROUP_TYPES[defaultType]?.description || ''}
              </p>
            </div>
          )}

          {/* Form Fields */}
          <Tabs value={selectedType} className="w-full">
            {/* Hide TabsList when defaultType is provided and valid - only show the selected type */}
            {(!defaultType || typeof PAYGROUP_TYPES === 'undefined' || !PAYGROUP_TYPES[defaultType]) && (
              <TabsList className="grid w-full grid-cols-4">
                {PAYGROUP_TYPES && Object.values(PAYGROUP_TYPES).map((type) => (
                  <TabsTrigger key={type.id} value={type.id} className="flex items-center gap-2">
                    {getTypeIcon(type.id)}
                    <span className="hidden sm:inline">{type.name.split(' ')[0]}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            )}

            {PAYGROUP_TYPES && Object.values(PAYGROUP_TYPES).map((type) => (
              <TabsContent key={type.id} value={type.id} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h3 className="font-medium flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Basic Information
                    </h3>

                    {/* Project selection for project-based groups */}
                    {(selectedCategory === 'projects' || defaultType === 'piece_rate') && renderField(
                      'project',
                      'Project',
                      <Select value={selectedProjectId} onValueChange={(v) => handleProjectSelection(v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select project" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredProjects.map(p => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name} {p.project_type ? `(${p.project_type}${p.project_subtype ? ` • ${p.project_subtype}` : ''})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {renderField(
                      'name',
                      'Pay Group Name',
                      <div>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                          placeholder="Enter pay group name"
                        />
                        {generatedPayGroupId && (
                          <p className="text-xs text-muted-foreground mt-1">
                            PayGroup ID Preview: <span className="font-mono bg-gray-100 px-1 rounded">{generatedPayGroupId}</span>
                          </p>
                        )}
                      </div>
                    )}

                    {renderField(
                      'country',
                      'Country',
                      <Select value={formData.country} onValueChange={(value) => handleInputChange('country', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent>
                          {SUPPORTED_COUNTRIES.map((country) => (
                            <SelectItem key={country.code} value={country.code}>
                              <div className="flex items-center gap-2">
                                <span>{country.flag}</span>
                                <span>{country.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {renderField(
                      'currency',
                      'Currency',
                      <Select value={formData.currency} onValueChange={(value) => handleInputChange('currency', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                        <SelectContent>
                          {SUPPORTED_CURRENCIES.map((currency) => (
                            <SelectItem key={currency.code} value={currency.code}>
                              <div className="flex items-center gap-2">
                                <span>{currency.symbol}</span>
                                <span>{currency.code} - {currency.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {renderField(
                      'notes',
                      'Notes',
                      <Textarea
                        id="notes"
                        value={formData.notes || ''}
                        onChange={(e) => handleInputChange('notes', e.target.value)}
                        placeholder="Optional notes about this pay group"
                        rows={3}
                      />
                    )}
                  </div>

                  {/* Type-specific Fields */}
                  <div className="space-y-4">
                    <h3 className="font-medium flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-blue-600" />
                      {type.name} Settings
                    </h3>

                    <AnimatePresence mode="wait">
                      {type.id === 'regular' && (
                        <motion.div
                          key="regular"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className="space-y-4"
                        >
                          {renderField(
                            'pay_frequency',
                            'Pay Frequency',
                            <Select value={formData.pay_frequency || ''} onValueChange={(value) => handleInputChange('pay_frequency', value)}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select frequency" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="weekly">Weekly</SelectItem>
                                <SelectItem value="bi_weekly">Bi-weekly</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                                <SelectItem value="quarterly">Quarterly</SelectItem>
                              </SelectContent>
                            </Select>
                          )}

                          {renderField(
                            'default_tax_percentage',
                            'Default Tax Percentage',
                            <Input
                              id="default_tax_percentage"
                              type="number"
                              min="0"
                              max="100"
                              value={formData.default_tax_percentage || ''}
                              onChange={(e) => handleInputChange('default_tax_percentage', parseFloat(e.target.value) || 0)}
                              placeholder="e.g., 30"
                            />
                          )}

                          {renderField(
                            'tax_country',
                            'Tax Country *',
                            <Select value={formData.tax_country || ''} onValueChange={(value) => handleInputChange('tax_country', value)}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select tax country" />
                              </SelectTrigger>
                              <SelectContent>
                                {TAX_COUNTRIES.map((country) => (
                                  <SelectItem key={country.code} value={country.code}>
                                    <div className="flex items-center gap-2">
                                      <span>{country.flag}</span>
                                      <span>{country.name}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>,
                            'The tax country determines which country\'s tax regulations apply to this pay group'
                          )}
                        </motion.div>
                      )}

                      {type.id === 'expatriate' && (
                        <motion.div
                          key="expatriate"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className="space-y-4"
                        >
                          {renderField(
                            'exchange_rate_to_local',
                            'Exchange Rate to Local',
                            <Input
                              id="exchange_rate_to_local"
                              type="number"
                              min="0"
                              step="0.01"
                              value={formData.exchange_rate_to_local || ''}
                              onChange={(e) => handleInputChange('exchange_rate_to_local', parseFloat(e.target.value) || 0)}
                              placeholder="e.g., 3800"
                            />,
                            'Exchange rate from foreign currency to local currency'
                          )}

                          {renderField(
                            'tax_country',
                            'Tax Country',
                            <Select value={formData.tax_country || ''} onValueChange={(value) => handleInputChange('tax_country', value)}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select tax country" />
                              </SelectTrigger>
                              <SelectContent>
                                {TAX_COUNTRIES.map((country) => (
                                  <SelectItem key={country.code} value={country.code}>
                                    <div className="flex items-center gap-2">
                                      <span>{country.flag}</span>
                                      <span>{country.name}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>,
                            'The tax country determines which country\'s tax regulations apply to this pay group'
                          )}
                        </motion.div>
                      )}

                      {type.id === 'piece_rate' && (
                        <motion.div
                          key="piece_rate"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className="space-y-4"
                        >
                          {renderField(
                            'pay_type',
                            'IPPMS Pay Type *',
                            <Select
                              value={formData.pay_type || 'piece_rate'}
                              onValueChange={(value) => {
                                // Update pay_type and clear piece-specific fields when switching to daily_rate
                                if (value === 'daily_rate') {
                                  setFormData(prev => ({
                                    ...prev,
                                    pay_type: 'daily_rate',
                                    piece_type: undefined,
                                    minimum_pieces: undefined,
                                    maximum_pieces: undefined,
                                  }));
                                } else {
                                  setFormData(prev => ({
                                    ...prev,
                                    pay_type: 'piece_rate',
                                    piece_type: prev.piece_type || 'units'
                                  }));
                                }
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select pay type" />
                              </SelectTrigger>
                              <SelectContent>
                                {(['piece_rate', 'daily_rate'] as const)
                                  .filter(pt => allowedPayTypes.length === 0 || allowedPayTypes.includes(pt))
                                  .map(pt => (
                                    <SelectItem key={pt} value={pt}>
                                      {pt === 'piece_rate' ? 'Piece Rate' : 'Daily Rate'}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>,
                            'Choose how IPPMS employees are paid'
                          )}

                          {formData.pay_type === 'piece_rate' && renderField(
                            'piece_type',
                            'Piece Type *',
                            <Select value={formData.piece_type || 'units'} onValueChange={(value) => handleInputChange('piece_type', value)}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select piece type" />
                              </SelectTrigger>
                              <SelectContent>
                                {PIECE_RATE_TYPES.map((pt) => (
                                  <SelectItem key={pt.value} value={pt.value}>
                                    {pt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>,
                            'Unit of measurement for piece rate calculations'
                          )}

                          {/* Hide defaults to simplify creation per current direction */}

                          {renderField(
                            'tax_country',
                            'Tax Country *',
                            <Select value={formData.tax_country || ''} onValueChange={(value) => handleInputChange('tax_country', value)}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select tax country" />
                              </SelectTrigger>
                              <SelectContent>
                                {TAX_COUNTRIES.map((country) => (
                                  <SelectItem key={country.code} value={country.code}>
                                    <div className="flex items-center gap-2">
                                      <span>{country.flag}</span>
                                      <span>{country.name}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>,
                            'The tax country determines which country\'s tax regulations apply to this pay group (work location)'
                          )}

                          {formData.pay_type === 'piece_rate' && renderField(
                            'minimum_pieces',
                            'Minimum Pieces',
                            <Input
                              id="minimum_pieces"
                              type="number"
                              min="0"
                              value={formData.minimum_pieces || ''}
                              onChange={(e) => handleInputChange('minimum_pieces', parseInt(e.target.value) || undefined)}
                              placeholder="Optional"
                            />,
                            'Minimum pieces required per pay period (optional, for validation)'
                          )}

                          {formData.pay_type === 'piece_rate' && renderField(
                            'maximum_pieces',
                            'Maximum Pieces',
                            <Input
                              id="maximum_pieces"
                              type="number"
                              min="1"
                              value={formData.maximum_pieces || ''}
                              onChange={(e) => handleInputChange('maximum_pieces', parseInt(e.target.value) || undefined)}
                              placeholder="Optional"
                            />,
                            'Maximum pieces allowed per pay period (optional, for validation)'
                          )}

                          {renderField(
                            'pay_frequency',
                            'Pay Frequency',
                            <Select value={formData.pay_frequency || ''} onValueChange={(value) => handleInputChange('pay_frequency', value)}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select pay frequency (optional)" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="weekly">Weekly</SelectItem>
                                <SelectItem value="bi_weekly">Bi-weekly</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                              </SelectContent>
                            </Select>,
                            'Pay frequency for reporting (optional)'
                          )}
                        </motion.div>
                      )}

                      {type.id === 'intern' && (
                        <motion.div
                          key="intern"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className="space-y-4"
                        >
                          {renderField(
                            'internship_duration',
                            'Internship Duration (months)',
                            <Input
                              id="internship_duration"
                              type="number"
                              min="1"
                              max="12"
                              value={formData.internship_duration || ''}
                              onChange={(e) => handleInputChange('internship_duration', parseInt(e.target.value) || 0)}
                              placeholder="e.g., 6"
                            />
                          )}

                          {renderField(
                            'stipend_amount',
                            'Stipend Amount',
                            <Input
                              id="stipend_amount"
                              type="number"
                              min="0"
                              step="0.01"
                              value={formData.stipend_amount || ''}
                              onChange={(e) => handleInputChange('stipend_amount', parseFloat(e.target.value) || 0)}
                              placeholder="e.g., 500"
                            />
                          )}

                          {renderField(
                            'tax_country',
                            'Tax Country *',
                            <Select value={formData.tax_country || ''} onValueChange={(value) => handleInputChange('tax_country', value)}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select tax country" />
                              </SelectTrigger>
                              <SelectContent>
                                {TAX_COUNTRIES.map((country) => (
                                  <SelectItem key={country.code} value={country.code}>
                                    <div className="flex items-center gap-2">
                                      <span>{country.flag}</span>
                                      <span>{country.name}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>,
                            'The tax country determines which country\'s tax regulations apply to this pay group'
                          )}

                          {renderField(
                            'academic_institution',
                            'Academic Institution',
                            <Input
                              id="academic_institution"
                              value={formData.academic_institution || ''}
                              onChange={(e) => handleInputChange('academic_institution', e.target.value)}
                              placeholder="University or college name"
                            />
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>

          {/* Members (Project-based) */}
          {(selectedCategory === 'projects' || defaultType === 'piece_rate') && (
            <div className="space-y-3 border rounded-md p-4">
              <h3 className="font-medium">Members</h3>
              <p className="text-xs text-muted-foreground">
                Employees in this project with this pay type. You can deselect any employees you don’t want in this pay group.
              </p>
              {!projectAndPayTypeSelected ? (
                <div className="text-sm text-muted-foreground">
                  Select both a Project and Pay Type to load eligible employees.
                </div>
              ) : loadingEligible ? (
                <div className="text-sm text-muted-foreground">Loading eligible employees…</div>
              ) : eligibleEmployees.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No employees found in this project with the selected pay type. You can still create this pay group and assign employees later.
                </div>
              ) : (
                <div className="border rounded-md max-h-64 overflow-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted-foreground">
                        <th className="px-3 py-2">Select</th>
                        <th className="px-3 py-2">Employee</th>
                        <th className="px-3 py-2">Employee ID</th>
                        <th className="px-3 py-2">Pay Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {eligibleEmployees.map((emp: any) => {
                        const name = [emp.first_name, emp.middle_name, emp.last_name].filter(Boolean).join(' ');
                        const checked = selectedEmployeeIds.includes(emp.id);
                        return (
                          <tr key={emp.id} className="border-t">
                            <td className="px-3 py-2">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleEmployee(emp.id)}
                              />
                            </td>
                            <td className="px-3 py-2">{name}</td>
                            <td className="px-3 py-2">{emp.employee_number || '—'}</td>
                            <td className="px-3 py-2">{emp.pay_type}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Pay Group
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
