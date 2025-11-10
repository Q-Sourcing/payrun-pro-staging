import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { generatePayGroupId } from '@/lib/utils/generatePayGroupId';
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
  Loader2
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
import { PayGroupsService } from '@/lib/services/paygroups.service';

interface CreatePayGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  defaultType?: PayGroupType;
}

export const CreatePayGroupModal: React.FC<CreatePayGroupModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
  defaultType,
}) => {
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
  const [selectedSubType, setSelectedSubType] = useState<HeadOfficeSubType | ProjectsSubType | ''>('');
  const [selectedPayFrequency, setSelectedPayFrequency] = useState<ManpowerFrequency | ''>('');
  
  const [formData, setFormData] = useState<PayGroupFormData>({
    name: '',
    type: defaultType || 'regular',
    category: undefined,
    sub_type: undefined,
    pay_frequency: undefined,
    country: '',
    currency: 'UGX',
    status: 'active',
    notes: '',
    default_tax_percentage: 30,
    exchange_rate_to_local: 3800,
    tax_country: '',
    contract_duration: 12,
    default_hourly_rate: 25,
    internship_duration: 6,
    stipend_amount: 500,
    academic_institution: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [generatedPayGroupId, setGeneratedPayGroupId] = useState<string>('');
  const { toast } = useToast();

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      const initialType = defaultType || 'regular';
      setSelectedType(initialType);
      setSelectedCategory('');
      setSelectedSubType('');
      setSelectedPayFrequency('');
      setFormData({
        name: '',
        type: initialType,
        category: undefined,
        sub_type: undefined,
        pay_frequency: undefined,
        country: '',
        currency: initialType === 'expatriate' ? 'USD' : 'UGX',
        status: 'active',
        notes: '',
        default_tax_percentage: 30,
        exchange_rate_to_local: 3800,
        tax_country: initialType === 'expatriate' || initialType === 'contractor' ? 'UG' : '',
        contract_duration: 12,
        default_hourly_rate: 25,
        internship_duration: 6,
        stipend_amount: 500,
        academic_institution: ''
      });
      setErrors({});
      setGeneratedPayGroupId('');
    }
  }, [open, defaultType]);

  // Update formData when category/sub_type/pay_frequency changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      category: selectedCategory || undefined,
      sub_type: selectedSubType || undefined,
      pay_frequency: selectedPayFrequency || undefined
    }));
  }, [selectedCategory, selectedSubType, selectedPayFrequency]);

  // Update form data when type changes
  useEffect(() => {
    const typeToUse = defaultType || selectedType;
    setFormData(prev => ({
      ...prev,
      type: typeToUse,
      // Set default currency based on type
      currency: typeToUse === 'expatriate' ? 'USD' : 'UGX',
      // Set default tax country for expatriate/contractor
      tax_country: typeToUse === 'expatriate' || typeToUse === 'contractor' ? 'UG' : ''
    }));
  }, [selectedType, defaultType]);

  // Auto-generate PayGroup ID when name changes
  useEffect(() => {
    if (formData.name) {
      const typeCode = selectedType === 'expatriate' ? 'EXPG' : 
                      selectedType === 'contractor' ? 'CNTR' : 
                      selectedType === 'intern' ? 'INTR' : 'REGP';
      const generatedId = generatePayGroupId(typeCode as any, formData.name);
      setGeneratedPayGroupId(generatedId);
    } else {
      setGeneratedPayGroupId('');
    }
  }, [formData.name, selectedType]);

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
      else if (error.includes('duration')) errorMap.contract_duration = error;
      else if (error.includes('hourly rate')) errorMap.default_hourly_rate = error;
      else if (error.includes('stipend')) errorMap.stipend_amount = error;
    });

    setErrors(errorMap);
    return validationErrors.length === 0;
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
      await PayGroupsService.createPayGroup(formData);
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
      case 'contractor': return <Briefcase className="h-4 w-4" />;
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
          {/* Category and Sub-type Selection */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Category & Sub-type</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderField(
                'category',
                'Category',
                <Select 
                  value={selectedCategory} 
                  onValueChange={(value: PayGroupCategory) => {
                    setSelectedCategory(value);
                    setSelectedSubType(''); // Reset sub_type when category changes
                    setSelectedPayFrequency(''); // Reset pay_frequency when category changes
                  }}
                >
                  <SelectTrigger>
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
                  'sub_type',
                  'Sub-type',
                  <Select 
                    value={selectedSubType} 
                    onValueChange={(value: HeadOfficeSubType | ProjectsSubType) => {
                      setSelectedSubType(value);
                      if (value !== 'manpower') {
                        setSelectedPayFrequency(''); // Reset pay_frequency if not manpower
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select sub-type" />
                    </SelectTrigger>
                    <SelectContent>
                      {getSubTypesForCategory(selectedCategory).map(subType => (
                        <SelectItem key={subType} value={subType}>
                          {subType === 'regular' ? 'Regular' :
                           subType === 'expatriate' ? 'Expatriate' :
                           subType === 'interns' ? 'Interns' :
                           subType === 'manpower' ? 'Manpower' :
                           subType === 'ippms' ? 'IPPMS' :
                           subType}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )
              )}

              {requiresPayFrequency(selectedCategory, selectedSubType) && (
                renderField(
                  'pay_frequency',
                  'Pay Frequency',
                  <Select 
                    value={selectedPayFrequency} 
                    onValueChange={(value: ManpowerFrequency) => setSelectedPayFrequency(value)}
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
                )
              )}
            </div>
          </div>

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
                      className={`cursor-pointer transition-all ${
                        selectedType === type.id 
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
                                <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
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

                      {type.id === 'contractor' && (
                        <motion.div
                          key="contractor"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className="space-y-4"
                        >
                          {renderField(
                            'contract_duration',
                            'Contract Duration (months)',
                            <Input
                              id="contract_duration"
                              type="number"
                              min="1"
                              max="60"
                              value={formData.contract_duration || ''}
                              onChange={(e) => handleInputChange('contract_duration', parseInt(e.target.value) || 0)}
                              placeholder="e.g., 12"
                            />
                          )}

                          {renderField(
                            'default_hourly_rate',
                            'Default Hourly Rate',
                            <Input
                              id="default_hourly_rate"
                              type="number"
                              min="0"
                              step="0.01"
                              value={formData.default_hourly_rate || ''}
                              onChange={(e) => handleInputChange('default_hourly_rate', parseFloat(e.target.value) || 0)}
                              placeholder="e.g., 25"
                            />
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
