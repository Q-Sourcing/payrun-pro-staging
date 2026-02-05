import React, { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

import { CreateCompanyUnitDialog } from '@/components/company-units/CreateCompanyUnitDialog';
import { CreateSubDepartmentDialog } from '@/components/departments/CreateSubDepartmentDialog';
import { CompanyUnitsService } from '@/lib/services/company-units.service';
import { EmployeeCategoriesService } from '@/lib/services/employee-categories.service';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { ALL_COUNTRIES } from '@/lib/constants/countries';
import { useOrg } from '@/lib/tenant/OrgContext';

export interface CascadingSelectorValue {
  countryId?: string;
  companyId?: string;
  categoryId?: string;
  companyUnitId?: string;
  subDepartmentId?: string;
  employeeTypeId?: string;
  payGroupId?: string;
}

export type SelectorMode = 'employee' | 'paygroup' | 'payrun';

interface CascadingOrgSelectorsProps {
  value: CascadingSelectorValue;
  onChange: (val: Partial<CascadingSelectorValue>) => void;
  mode: SelectorMode;
  showCategory?: boolean;
  disabledFields?: (keyof CascadingSelectorValue)[];
  requiredFields?: (keyof CascadingSelectorValue)[];
  className?: string;
}

export const CascadingOrgSelectors: React.FC<CascadingOrgSelectorsProps> = ({
  value, onChange, mode, showCategory = false, disabledFields = [], requiredFields = [], className = ''
}) => {
  // Data
  const [countries, setCountries] = useState<Array<{ id: string; name: string }>>([]);
  const [companies, setCompanies] = useState<Array<{ id: string; name: string; country_id: string }>>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; key: string }>>([]);
  const [companyUnits, setCompanyUnits] = useState<Array<{ id: string; name: string; company_id: string }>>([]);
  const [subDepartments, setSubDepartments] = useState<Array<{ id: string; name: string; company_unit_id: string }>>([]);
  const [employeeTypes, setEmployeeTypes] = useState<Array<{ id: string; name: string }>>([]);
  const [payGroups, setPayGroups] = useState<Array<{ id: string; name: string }>>([]);
  const { organizationId } = useOrg();

  // Loading
  const [loading, setLoading] = useState<{ [k: string]: boolean }>({});
  const [showCreateCompanyUnit, setShowCreateCompanyUnit] = useState(false);
  const [showCreateSubDepartment, setShowCreateSubDepartment] = useState(false);

  // Load global countries & employee types once
  useEffect(() => {
    let cancelled = false;
    async function loadGlobals() {
      setLoading(l => ({ ...l, countries: true, employeeTypes: true }));
      try {
        const [countryRes, typeRes] = await Promise.all([
          supabase.from('countries' as any).select('id, name').order('name'),
          supabase.from('employee_types' as any).select('id, name').order('name')
        ]);
        if (!cancelled) {
          // Handle countries - use fallback if table doesn't exist or is empty
          if (countryRes.error || !countryRes.data || countryRes.data.length === 0) {
            console.log('Countries table not found or empty, using fallback');
            // Use constant countries as fallback, mapping code to id
            const fallbackCountries = ALL_COUNTRIES.map(c => ({
              id: c.code,
              name: c.name
            }));
            setCountries(fallbackCountries);
          } else {
            setCountries(countryRes.data as any[]);
          }
          setEmployeeTypes((typeRes.data || []) as any[]);
          setLoading(l => ({ ...l, countries: false, employeeTypes: false }));
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Error loading globals:', error);
          // Use fallback countries
          const fallbackCountries = ALL_COUNTRIES.map(c => ({
            id: c.code,
            name: c.name
          }));
          setCountries(fallbackCountries);
          setEmployeeTypes([]);
          setLoading(l => ({ ...l, countries: false, employeeTypes: false }));
        }
      }
    }
    loadGlobals();
    return () => { cancelled = true };
  }, []);

  // Load companies and auto-select default company
  useEffect(() => {
    let cancelled = false;
    setLoading(l => ({ ...l, companies: true }));

    async function loadCompaniesAndDefault() {
      try {
        console.log('Loading companies - querying companies table');
        // Load companies for current organization if available
        let query = supabase
          .from('companies')
          .select('id, name, country_id')
          .order('name') as any;
        if (organizationId) {
          query = query.eq('organization_id', organizationId);
        }
        const { data: companiesData, error: companiesError } = await query;

        if (cancelled) return;

        if (companiesError) {
          console.error('Error loading companies - details:', {
            message: companiesError.message,
            code: companiesError.code,
            details: companiesError.details,
            hint: companiesError.hint,
            fullError: companiesError
          });

          // Log specific error types
          if (companiesError.code === 'PGRST301' || companiesError.message?.includes('permission denied')) {
            console.error('RLS Policy Error: Companies table may have RLS enabled without proper policies');
          } else if (companiesError.code === '42P01') {
            console.error('Table Not Found Error: Companies table does not exist');
          } else if (companiesError.code === 'PGRST116') {
            console.error('Schema Error: Companies table schema mismatch');
          }

          setCompanies([]);
          setLoading(l => ({ ...l, companies: false }));
          return;
        }

        console.log('Companies query result:', {
          count: companiesData?.length || 0,
          data: companiesData,
          hasData: !!companiesData,
          isArray: Array.isArray(companiesData)
        });

        // Prefer active company, then organization's default company if available
        if (companiesData && companiesData.length > 0) {
          let companyToSelect = companiesData[0];
          const storedActive = typeof window !== 'undefined' ? localStorage.getItem('active_company_id') : null;
          if (storedActive) {
            const active = companiesData.find(c => c.id === storedActive);
            if (active) companyToSelect = active;
          }
          // if (organizationId) {
          //   const { data: orgMeta, error: orgError } = await supabase
          //     .from('organizations')
          //     .select('default_company_id')
          //     .eq('id', organizationId)
          //     .single();
          //   if (!orgError && orgMeta?.default_company_id) {
          //     const preferred = companiesData.find(c => c.id === orgMeta.default_company_id);
          //     if (preferred) {
          //       companyToSelect = preferred;
          //     }
          //   }
          // }

          // Auto-select preferred company if not already selected
          if (!value.companyId && companyToSelect) {
            console.log('Auto-selecting company:', companyToSelect.name, companyToSelect.id);
            onChange({ companyId: companyToSelect.id });
          } else if (value.companyId) {
            console.log('Company already selected:', value.companyId);
          } else {
            console.log('No company to select, companies available:', companiesData.length);
          }
        } else {
          console.warn('No companies found in database. This may indicate:', {
            issue: 'Companies table is empty or migrations have not been run',
            suggestion: 'Check if GWAZU company migration has been executed',
            migrationFiles: [
              '20250112000006_create_gwazu_company.sql',
              '20250119174630_ensure_gwazu_company_and_org_units.sql',
              '20250120000000_fix_companies_rls.sql'
            ],
            troubleshooting: 'Run verify_companies_migration.sql in Supabase Dashboard to diagnose the issue'
          });

          // If user is authenticated and no companies found, this might be an RLS issue
          // Log additional context for debugging
          console.warn('Additional context:', {
            userAuthenticated: !!supabase.auth.getSession(),
            tableExists: 'Check Supabase Dashboard',
            rlsEnabled: 'Check verify_companies_migration.sql results'
          });
        }

        setCompanies(companiesData || []);
      } catch (error) {
        if (!cancelled) {
          console.error('Exception loading companies:', error);
          console.error('Exception details:', {
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
          });
          setCompanies([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(l => ({ ...l, companies: false }));
        }
      }
    }

    loadCompaniesAndDefault();
    return () => { cancelled = true };
  }, [value.companyId, onChange, organizationId]);

  // Load categories
  useEffect(() => {
    let cancelled = false;
    if (organizationId && showCategory) {
      setLoading(l => ({ ...l, categories: true }));
      EmployeeCategoriesService.getCategoriesByOrg(organizationId)
        .then(data => {
          if (!cancelled) {
            setCategories(data.map(c => ({ id: c.id, name: c.label, key: c.key })));
            setLoading(l => ({ ...l, categories: false }));
          }
        })
        .catch(err => {
          console.error('Error loading categories:', err);
          if (!cancelled) setLoading(l => ({ ...l, categories: false }));
        });
    }
    return () => { cancelled = true };
  }, [organizationId, showCategory]);

  // Load company units when companyId or categoryId changes
  useEffect(() => {
    let cancelled = false;

    // Get companyId - use selected or first available
    const companyIdToUse = value.companyId || companies[0]?.id;

    console.log('Company units effect - companyIdToUse:', companyIdToUse, 'value.companyId:', value.companyId, 'companies:', companies.length);

    if (!companyIdToUse) {
      console.log('No company ID found, clearing company units');
      setCompanyUnits([]);
      setLoading(l => ({ ...l, companyUnits: false }));
      return;
    }

    setLoading(l => ({ ...l, companyUnits: true }));

    (async () => {
      try {
        console.log('Fetching company units for company:', companyIdToUse, 'category:', value.categoryId);

        let data, error;

        // Use service to fetch filtered units if service is available, otherwise fallback to direct query (though we imported service)
        // Since we imported CompanyUnitsService, we should use it, but existing code used direct supabase
        // We will switch to using the service for consistency with the new filtering logic
        try {
          // If categoryId is present (or even if not), we can use the service which supports filtering
          // However, the service method signature might be different from what we need if we want *all* units when no category is selected.
          // let's check: getCompanyUnitsByCompanyAndCategory(companyId, categoryId, options)
          // If categoryId is undefined, it should return all? need to verify service.
          // Actually, let's keep it simple. If we have a categoryId, we filter.

          if (value.categoryId) {
            data = await CompanyUnitsService.getCompanyUnitsByCompanyAndCategory(companyIdToUse, value.categoryId);
            // Mapper to match expected shape if needed (Service returns CompanyUnit[], we need id, name, company_id)
            // CompanyUnit has these fields.
          } else {
            // Fallback to fetching all for the company
            const res = await supabase
              .from('company_units')
              .select('id, name, company_id')
              .eq('company_id', companyIdToUse)
              .order('name');
            data = res.data;
            error = res.error;
          }
        } catch (e) {
          error = e;
        }

        if (!cancelled) {
          if (error) {
            console.error('Error loading company units:', error);
            console.error('Error details:', {
              message: error.message,
              code: error.code,
              details: error.details,
              hint: error.hint,
              fullError: error
            });

            // Log specific error types
            if (error.code === 'PGRST301' || error.message?.includes('permission denied')) {
              console.error('RLS Policy Error: Company units table may have RLS enabled without proper policies');
            } else if (error.code === '42P01') {
              console.error('Table Not Found Error: Company units table does not exist. Run migration: 20250119200000_rename_org_units_to_company_units.sql');
            } else if (error.code === 'PGRST116') {
              console.error('Schema Error: Company units table schema mismatch');
            }

            setCompanyUnits([]);
          } else {
            console.log('Successfully loaded company units:', data?.length || 0, 'units:', data);
            setCompanyUnits(data || []);
          }
          setLoading(l => ({ ...l, companyUnits: false }));
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Exception loading company units:', err);
          setCompanyUnits([]);
          setLoading(l => ({ ...l, companyUnits: false }));
        }
      }
    })();
    return () => { cancelled = true };
  }, [value.companyId, value.categoryId, companies]);

  // Load sub-departments when companyUnitId changes
  useEffect(() => {
    let cancelled = false;

    if (!value.companyUnitId) {
      setSubDepartments([]);
      setLoading(l => ({ ...l, subDepartments: false }));
      return;
    }

    setLoading(l => ({ ...l, subDepartments: true }));

    (async () => {
      try {
        const { data, error } = await (supabase
          .from('sub_departments' as any) as any)
          .select('id, name, company_unit_id')
          .eq('company_unit_id', value.companyUnitId)
          .order('name');

        if (!cancelled) {
          if (error) {
            console.error('Error loading sub-departments:', error);
            setSubDepartments([]);
          } else {
            setSubDepartments(data as any[] || []);
          }
          setLoading(l => ({ ...l, subDepartments: false }));
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Exception loading sub-departments:', err);
          setSubDepartments([]);
          setLoading(l => ({ ...l, subDepartments: false }));
        }
      }
    })();
    return () => { cancelled = true };
  }, [value.companyUnitId]);

  // Load pay groups: filterable by companyUnit and/or employeeType
  useEffect(() => {
    let cancelled = false;
    setLoading(l => ({ ...l, payGroups: true }));

    (async () => {
      try {
        // Only select columns that exist - company_unit_id and employee_type_id may not exist
        let query: any = supabase.from('pay_groups' as any).select('id, name');

        // Try to filter by company_unit_id if it exists and is provided
        if (value.companyUnitId) {
          query = query.eq('company_unit_id', value.companyUnitId);
        }

        // Try to filter by employee_type_id if it exists and is provided
        if (value.employeeTypeId) {
          query = query.eq('employee_type_id', value.employeeTypeId);
        }

        const { data, error } = await query.order('name');

        if (!cancelled) {
          if (error) {
            console.error('Error loading pay groups:', error);
            setPayGroups([]);
          } else {
            setPayGroups(data || []);
          }
          setLoading(l => ({ ...l, payGroups: false }));
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Exception loading pay groups:', err);
          setPayGroups([]);
          setLoading(l => ({ ...l, payGroups: false }));
        }
      }
    })();

    return () => { cancelled = true };
  }, [value.companyUnitId, value.employeeTypeId]);

  // State-resets: when upstream selector changes, reset downstreams
  useEffect(() => {
    // If companyId is cleared, also clear companyUnitId, subDepartmentId, and payGroupId
    if (!value.companyId && (value.companyUnitId || value.subDepartmentId || value.payGroupId || value.categoryId)) {
      onChange({ companyUnitId: undefined, subDepartmentId: undefined, payGroupId: undefined, categoryId: undefined });
    }
    // If categoryId changes/cleared, clear companyUnitId?
    // If category changes, the available units change. So we probably should clear unit.
    // BUT we need to be careful not to loop. logic below handles clearing.

    // If companyUnitId is cleared, also clear subDepartmentId and payGroupId
    if (!value.companyUnitId && (value.subDepartmentId || value.payGroupId)) {
      onChange({ subDepartmentId: undefined, payGroupId: undefined });
    }
    // If employeeTypeId is cleared, reset payGroupId
    if (!value.employeeTypeId && value.payGroupId) {
      onChange({ payGroupId: undefined });
    }
  }, [value.companyId, value.companyUnitId, value.subDepartmentId, value.employeeTypeId]);

  // When category changes, clear company unit if it's no longer valid? 
  // For now let's just let the user re-select if they want.
  useEffect(() => {
    if (value.categoryId && value.companyUnitId) {
      // potentially check if current unit is valid for new category?
      // For simplicity, we might just leave it or clear it. 
      // Safe default: Clear unit when category changes to ensure consistency?
      // But this effect runs on value change, so if we clear, we trigger another change.
      // We'll rely on the user to pick a new unit if the list changes.
      // onChange({ companyUnitId: undefined }); 
      // Actually, standard behavior is usually to clear downstream.
      onChange({ companyUnitId: undefined });
    }
  }, [value.categoryId]);

  // Render helpers
  const showCountry = mode === 'employee' || mode === 'paygroup';
  const showCompany = true;
  const showCompanyUnit = true;
  const showEmployeeType = mode !== 'employee'; // Hide Employee Type field in employee mode (handled in Employment Information section)
  const showPayGroup = (mode === 'employee' || mode === 'payrun') && !disabledFields.includes('payGroupId'); // Hide if disabled or in employee mode (handled separately)
  // Required states
  const isRequired = (field: keyof CascadingSelectorValue) => requiredFields.includes(field);
  const isDisabled = (field: keyof CascadingSelectorValue) => disabledFields.includes(field);

  // Department ID is now Sub-Department ID
  const subDepartmentRequired = isRequired('subDepartmentId' as any);
  const subDepartmentDisabled = isDisabled('subDepartmentId' as any);

  // Company is optional by default unless explicitly required
  const companyRequired = isRequired('companyId');

  return (
    <div className={`grid gap-4 sm:grid-cols-2 w-full ${className}`}>
      {showCountry && (
        <div>
          <label className="block text-sm font-medium">Country{isRequired('countryId') && ' *'}</label>
          <Select
            value={value.countryId || ''}
            onValueChange={v => onChange({ countryId: v || undefined })}
            disabled={isDisabled('countryId') || loading.countries}
            aria-required={isRequired('countryId')}
          >
            <SelectTrigger aria-label="Select country">
              <SelectValue placeholder={loading.countries ? 'Loading countries…' : 'Select country'} />
            </SelectTrigger>
            <SelectContent
              allowClear={!isRequired('countryId') && !!value.countryId}
              onClear={() => onChange({ countryId: undefined })}
              currentValue={value.countryId}
            >
              {countries.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
              {!loading.countries && countries.length === 0 && (
                <div className="px-3 text-xs text-muted">No countries found</div>
              )}
            </SelectContent>
          </Select>
        </div>
      )}
      {showCompany && (() => {
        // Get company name - prefer selected company, else first company
        const selectedCompany = companies.find(c => c.id === value.companyId);
        const companyName = selectedCompany?.name || companies[0]?.name || '';
        const hasCompanyId = !!value.companyId || !!companies[0]?.id;

        return (
          <div>
            <label className="block text-sm font-medium">Company{companyRequired && ' *'}</label>
            <Input
              value={companyName}
              disabled={true}
              readOnly={true}
              className="h-10 bg-muted cursor-not-allowed"
              aria-label="Company name"
            />
            {/* Only show error if we truly have no companies AND no company ID is set */}
            {companies.length === 0 && !loading.companies && !hasCompanyId && (
              <p className="mt-1 text-xs text-muted-foreground">
                No companies found. Please ensure database migrations have been run:
                <br />• 20250112000006_create_gwazu_company.sql
                <br />• 20250119174630_ensure_gwazu_company_and_org_units.sql
                <br />• 20250120000000_fix_companies_rls.sql (for RLS policies)
              </p>
            )}
          </div>
        );
      })()}


      {showCategory && (
        <div>
          <label className="block text-sm font-medium">Employee Category{isRequired('categoryId') && ' *'}</label>
          <Select
            value={value.categoryId || ''}
            onValueChange={v => onChange({ categoryId: v || undefined })}
            disabled={isDisabled('categoryId') || loading.categories || !value.companyId}
            aria-required={isRequired('categoryId')}
          >
            <SelectTrigger aria-label="Select category">
              <SelectValue placeholder={loading.categories ? 'Loading categories...' : 'All Categories'} />
            </SelectTrigger>
            <SelectContent
              allowClear={true}
              onClear={() => onChange({ categoryId: undefined })}
              currentValue={value.categoryId}
            >
              {categories.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
              {!loading.categories && categories.length === 0 && (
                <div className="px-3 text-xs text-muted">No categories found</div>
              )}
            </SelectContent>
          </Select>
        </div>
      )}

      {showCompanyUnit && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium">Company Unit{isRequired('companyUnitId') && ' *'}</label>
            {(value.companyId || companies[0]?.id) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowCreateCompanyUnit(true)}
                className="h-6 text-xs text-primary hover:text-primary-dark p-1"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            )}
          </div>
          {(() => {
            const storedActive = typeof window !== 'undefined' ? localStorage.getItem('active_company_id') : null;
            const companyIdToUse = value.companyId || storedActive || companies[0]?.id;
            const hasNoCompanies = companies.length === 0 && !loading.companies;
            const hasCompanyId = !!companyIdToUse;

            return (
              <>
                <SearchableSelect
                  options={companyUnits.map(u => ({ value: u.id, label: u.name }))}
                  value={value.companyUnitId || ''}
                  onValueChange={(v) => onChange({ companyUnitId: v || undefined })}
                  placeholder={
                    hasNoCompanies
                      ? 'No companies available'
                      : loading.companyUnits
                        ? 'Loading company units…'
                        : !companyIdToUse
                          ? 'Select company first'
                          : companyUnits.length === 0
                            ? 'No company units found'
                            : 'Select company unit'
                  }
                  searchPlaceholder="Search company units..."
                  emptyMessage="No company units found"
                  disabled={isDisabled('companyUnitId') || loading.companyUnits || !companyIdToUse || hasNoCompanies}
                  allowCreate={!!companyIdToUse && !hasNoCompanies}
                  onCreateNew={() => setShowCreateCompanyUnit(true)}
                  className="h-10"
                />
                {hasNoCompanies && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Company units require a company to be selected. Please ensure database migrations have been run.
                  </p>
                )}
                {companyIdToUse && companyUnits.length === 0 && !loading.companyUnits && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    No company units found for this company. Click "Add" to create one.
                  </p>
                )}
              </>
            );
          })()}
        </div>
      )}
      {showEmployeeType && (
        <div>
          <label className="block text-sm font-medium">Employee Type{isRequired('employeeTypeId') && ' *'}</label>
          <Select
            value={value.employeeTypeId || ''}
            onValueChange={v => onChange({ employeeTypeId: v || undefined })}
            disabled={isDisabled('employeeTypeId') || loading.employeeTypes}
            aria-required={isRequired('employeeTypeId')}
          >
            <SelectTrigger aria-label="Select employee type">
              <SelectValue placeholder={loading.employeeTypes ? 'Loading types…' : 'Select type'} />
            </SelectTrigger>
            <SelectContent
              allowClear={!isRequired('employeeTypeId') && !!value.employeeTypeId}
              onClear={() => onChange({ employeeTypeId: undefined })}
              currentValue={value.employeeTypeId}
            >
              {employeeTypes.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
              {!loading.employeeTypes && employeeTypes.length === 0 && (
                <div className="px-3 text-xs text-muted">No types found</div>
              )}
            </SelectContent>
          </Select>
        </div>
      )}
      {mode === 'employee' && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium">Sub-Department{isRequired('subDepartmentId' as any) && ' *'}</label>
            {value.companyUnitId && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowCreateSubDepartment(true)}
                className="h-6 text-xs text-primary hover:text-primary-dark p-1"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            )}
          </div>
          <SearchableSelect
            options={subDepartments.map(d => ({ value: d.id, label: d.name }))}
            value={value.subDepartmentId || ''}
            onValueChange={(v) => onChange({ subDepartmentId: v || undefined })}
            placeholder={
              loading.subDepartments
                ? 'Loading sub-departments…'
                : !value.companyUnitId
                  ? 'Select a company unit first'
                  : subDepartments.length === 0
                    ? 'No sub-departments found'
                    : 'Select sub-department'
            }
            searchPlaceholder="Search sub-departments..."
            emptyMessage={
              !value.companyUnitId
                ? 'Select a company unit first'
                : 'No sub-departments found'
            }
            disabled={isDisabled('subDepartmentId' as any) || loading.subDepartments || !value.companyUnitId}
            allowCreate={!!value.companyUnitId}
            onCreateNew={() => setShowCreateSubDepartment(true)}
            className="h-10"
          />
          {value.companyUnitId && subDepartments.length === 0 && !loading.subDepartments && (
            <p className="mt-1 text-xs text-muted-foreground">
              No sub-departments found for this company unit. Click "Add" to create one.
            </p>
          )}
        </div>
      )}
      {showPayGroup && (
        <div>
          <label className="block text-sm font-medium">Pay Group{isRequired('payGroupId') && ' *'}</label>
          <Select
            value={value.payGroupId || ''}
            onValueChange={v => onChange({ payGroupId: v || undefined })}
            disabled={isDisabled('payGroupId') || loading.payGroups}
            aria-required={isRequired('payGroupId')}
          >
            <SelectTrigger aria-label="Select pay group">
              <SelectValue placeholder={loading.payGroups ? 'Loading pay groups…' : 'Select pay group'} />
            </SelectTrigger>
            <SelectContent
              allowClear={!isRequired('payGroupId') && !!value.payGroupId}
              onClear={() => onChange({ payGroupId: undefined })}
              currentValue={value.payGroupId}
            >
              {payGroups.map(g => (
                <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
              ))}
              {!loading.payGroups && payGroups.length === 0 && (
                <div className="px-3 text-xs text-muted">No pay groups found</div>
              )}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Create Company Unit Dialog */}
      <CreateCompanyUnitDialog
        open={showCreateCompanyUnit}
        onOpenChange={setShowCreateCompanyUnit}
        onSuccess={(companyUnit) => {
          onChange({ companyUnitId: companyUnit.id });
          // Reload company units
          if (value.companyId) {
            supabase.from('company_units' as any)
              .select('id, name, company_id')
              .eq('company_id', value.companyId)
              .order('name')
              .then((r: any) => {
                setCompanyUnits(r.data || []);
              });
          }
        }}
        defaultCompanyId={value.companyId}
      />

      {/* Create Sub-Department Dialog */}
      <CreateSubDepartmentDialog
        open={showCreateSubDepartment}
        onOpenChange={setShowCreateSubDepartment}
        onSuccess={(subDepartment) => {
          onChange({ subDepartmentId: subDepartment.id });
          // Reload sub-departments
          if (value.companyUnitId) {
            (supabase.from('sub_departments' as any) as any)
              .select('id, name, company_unit_id')
              .eq('company_unit_id', value.companyUnitId)
              .order('name')
              .then((r: any) => {
                setSubDepartments(r.data || []);
              });
          }
        }}
        defaultCompanyUnitId={value.companyUnitId}
      />
    </div>
  );
};
