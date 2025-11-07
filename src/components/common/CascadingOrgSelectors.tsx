import React, { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOrg } from '@/lib/tenant/OrgContext';
import { supabase } from '@/integrations/supabase/client';

export interface CascadingSelectorValue {
  countryId?: string;
  companyId?: string;
  orgUnitId?: string;
  employeeTypeId?: string;
  payGroupId?: string;
}

export type SelectorMode = 'employee' | 'paygroup' | 'payrun';

interface CascadingOrgSelectorsProps {
  value: CascadingSelectorValue;
  onChange: (val: Partial<CascadingSelectorValue>) => void;
  mode: SelectorMode;
  disabledFields?: (keyof CascadingSelectorValue)[];
  requiredFields?: (keyof CascadingSelectorValue)[];
  className?: string;
}

export const CascadingOrgSelectors: React.FC<CascadingOrgSelectorsProps> = ({
  value, onChange, mode, disabledFields = [], requiredFields = [], className = ''
}) => {
  const { organizationId } = useOrg();
  // Data
  const [countries, setCountries] = useState<Array<{ id: string; name: string }>>([]);
  const [companies, setCompanies] = useState<Array<{ id: string; name: string; country_id: string }>>([]);
  const [orgUnits, setOrgUnits] = useState<Array<{ id: string; name: string; company_id: string; kind: string }>>([]);
  const [employeeTypes, setEmployeeTypes] = useState<Array<{ id: string; name: string }>>([]);
  const [payGroups, setPayGroups] = useState<Array<{ id: string; name: string }>>([]);

  // Loading
  const [loading, setLoading] = useState<{ [k: string]: boolean }>({});

  // Load global countries & employee types once
  useEffect(() => {
    let cancelled = false;
    async function loadGlobals() {
      setLoading(l => ({ ...l, countries: true, employeeTypes: true }));
      const [countryRes, typeRes] = await Promise.all([
        supabase.from('countries').select('id, name').order('name'),
        supabase.from('employee_types').select('id, name').order('name')
      ]);
      if (!cancelled) {
        setCountries(countryRes.data || []);
        setEmployeeTypes(typeRes.data || []);
        setLoading(l => ({ ...l, countries: false, employeeTypes: false }));
      }
    }
    loadGlobals();
    return () => { cancelled = true };
  }, []);

  // Load companies when org changes
  useEffect(() => {
    let cancelled = false;
    if (!organizationId) return;
    setLoading(l => ({ ...l, companies: true }));
    supabase.from('companies')
      .select('id, name, country_id')
      .eq('organization_id', organizationId)
      .order('name')
      .then(r => {
        if (!cancelled) {
          setCompanies(r.data || []);
          setLoading(l => ({ ...l, companies: false }));
        }
      });
    return () => { cancelled = true };
  }, [organizationId]);

  // Load org units when companyId changes
  useEffect(() => {
    let cancelled = false;
    if (!value.companyId) { setOrgUnits([]); return; }
    setLoading(l => ({ ...l, orgUnits: true }));
    supabase.from('org_units')
      .select('id, name, company_id, kind')
      .eq('company_id', value.companyId)
      .order('name')
      .then(r => {
        if (!cancelled) {
          setOrgUnits(r.data || []);
          setLoading(l => ({ ...l, orgUnits: false }));
        }
      });
    return () => { cancelled = true };
  }, [value.companyId]);

  // Load pay groups: org-scoped, filterable by orgUnit and/or employeeType
  useEffect(() => {
    let cancelled = false;
    if (!organizationId) { setPayGroups([]); return; }
    setLoading(l => ({ ...l, payGroups: true }));
    let query = supabase.from('pay_groups').select('id, name, org_unit_id, employee_type_id').eq('organization_id', organizationId);
    if (value.orgUnitId) query = query.eq('org_unit_id', value.orgUnitId);
    if (value.employeeTypeId) query = query.eq('employee_type_id', value.employeeTypeId);
    query.order('name').then(r => {
      if (!cancelled) {
        setPayGroups(r.data || []);
        setLoading(l => ({ ...l, payGroups: false }));
      }
    });
    return () => { cancelled = true };
  }, [organizationId, value.orgUnitId, value.employeeTypeId]);

  // State-resets: when upstream selector changes, reset downstreams
  useEffect(() => {
    // If companyId is cleared, also clear orgUnitId and payGroupId
    if (!value.companyId && (value.orgUnitId || value.payGroupId)) {
      onChange({ orgUnitId: undefined, payGroupId: undefined });
    }
    // If orgUnitId is cleared, also clear payGroupId
    if (!value.orgUnitId && value.payGroupId) {
      onChange({ payGroupId: undefined });
    }
    // If employeeTypeId is cleared, reset payGroupId
    if (!value.employeeTypeId && value.payGroupId) {
      onChange({ payGroupId: undefined });
    }
  }, [value.companyId, value.orgUnitId, value.employeeTypeId]);

  // Render helpers
  const showCountry = mode === 'employee' || mode === 'paygroup';
  const showCompany = true;
  const showOrgUnit = true;
  const showEmployeeType = true;
  const showPayGroup = mode === 'employee' || mode === 'payrun';
  // Required states
  const isRequired = (field: keyof CascadingSelectorValue) => requiredFields.includes(field);
  const isDisabled = (field: keyof CascadingSelectorValue) => disabledFields.includes(field);

  return (
    <div className={`grid gap-4 sm:grid-cols-2 w-full ${className}`}>
      {showCountry && (
        <div>
          <label className="block text-sm font-medium">Country{isRequired('countryId') && ' *'}</label>
          <Select
            value={value.countryId || ''}
            onValueChange={v => onChange({ countryId: v })}
            disabled={isDisabled('countryId') || loading.countries}
            aria-required={isRequired('countryId')}
          >
            <SelectTrigger aria-label="Select country">
              <SelectValue placeholder={loading.countries ? 'Loading countries…' : 'Select country'} />
            </SelectTrigger>
            <SelectContent>
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
      {showCompany && (
        <div>
          <label className="block text-sm font-medium">Company{isRequired('companyId') && ' *'}</label>
          <Select
            value={value.companyId || ''}
            onValueChange={v => onChange({ companyId: v, countryId: companies.find(c => c.id === v)?.country_id })}
            disabled={isDisabled('companyId') || loading.companies}
            aria-required={isRequired('companyId')}
          >
            <SelectTrigger aria-label="Select company">
              <SelectValue placeholder={loading.companies ? 'Loading companies…' : 'Select company'} />
            </SelectTrigger>
            <SelectContent>
              {companies.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
              {!loading.companies && companies.length === 0 && (
                <div className="px-3 text-xs text-muted">No companies found</div>
              )}
            </SelectContent>
          </Select>
        </div>
      )}
      {showOrgUnit && (
        <div>
          <label className="block text-sm font-medium">Org Unit{isRequired('orgUnitId') && ' *'}</label>
          <Select
            value={value.orgUnitId || ''}
            onValueChange={v => onChange({ orgUnitId: v })}
            disabled={isDisabled('orgUnitId') || loading.orgUnits || !value.companyId}
            aria-required={isRequired('orgUnitId')}
          >
            <SelectTrigger aria-label="Select org unit">
              <SelectValue placeholder={loading.orgUnits ? 'Loading org units…' : !value.companyId ? 'Select company first' : 'Select org unit'} />
            </SelectTrigger>
            <SelectContent>
              {orgUnits.map(u => (
                <SelectItem key={u.id} value={u.id}>{u.name} ({u.kind})</SelectItem>
              ))}
              {!loading.orgUnits && orgUnits.length === 0 && (
                <div className="px-3 text-xs text-muted">No org units found</div>
              )}
            </SelectContent>
          </Select>
        </div>
      )}
      {showEmployeeType && (
        <div>
          <label className="block text-sm font-medium">Employee Type{isRequired('employeeTypeId') && ' *'}</label>
          <Select
            value={value.employeeTypeId || ''}
            onValueChange={v => onChange({ employeeTypeId: v })}
            disabled={isDisabled('employeeTypeId') || loading.employeeTypes}
            aria-required={isRequired('employeeTypeId')}
          >
            <SelectTrigger aria-label="Select employee type">
              <SelectValue placeholder={loading.employeeTypes ? 'Loading types…' : 'Select type'} />
            </SelectTrigger>
            <SelectContent>
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
      {showPayGroup && (
        <div>
          <label className="block text-sm font-medium">Pay Group{isRequired('payGroupId') && ' *'}</label>
          <Select
            value={value.payGroupId || ''}
            onValueChange={v => onChange({ payGroupId: v })}
            disabled={isDisabled('payGroupId') || loading.payGroups}
            aria-required={isRequired('payGroupId')}
          >
            <SelectTrigger aria-label="Select pay group">
              <SelectValue placeholder={loading.payGroups ? 'Loading pay groups…' : 'Select pay group'} />
            </SelectTrigger>
            <SelectContent>
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
    </div>
  );
};
