import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/hooks/use-supabase-auth';

interface OrgContextValue {
  organizationId: string | null;
  role: 'super_admin' | 'org_admin' | 'user' | null;
  companyId: string | null;
  companyUnitId: string | null;
  isPlatformAdmin: boolean;
  selectedOrganizationId: string | null; // For platform admin context switching
  setCompanyId: (companyId: string|null) => void;
  setCompanyUnitId: (companyUnitId: string|null) => void;
  setSelectedOrganizationId: (orgId: string|null) => void;
}

const OrgContext = createContext<OrgContextValue | undefined>(undefined);

const PLATFORM_ADMIN_EMAIL = 'nalungukevin@gmail.com';

export const OrgProvider = ({ children }: { children: ReactNode }) => {
  const { user, session, profile, isLoading } = useSupabaseAuth();
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [role, setRole] = useState<'super_admin' | 'org_admin' | 'user' | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyUnitId, setCompanyUnitId] = useState<string | null>(null);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
  
  // Check if user is platform admin
  const isPlatformAdmin = user?.email?.toLowerCase() === PLATFORM_ADMIN_EMAIL.toLowerCase() ||
    localStorage.getItem('login_mode') === 'platform_admin';

  // Attempt to derive org from multiple sources
  useEffect(() => {
    async function resolveOrg() {
      // Ensure company context first (from picker/membership)
      try {
        const storedCompany = typeof window !== 'undefined' ? localStorage.getItem('active_company_id') : null;
        if (!companyId && storedCompany) {
          setCompanyId(storedCompany);
        }
        // If no company selected yet, try to derive from memberships
        if (!storedCompany && user?.id) {
          const { data, error } = await supabase
            .from('user_company_memberships')
            .select('company_id')
            .eq('user_id', user.id);
          if (!error && data) {
            if (data.length === 1) {
              const cid = data[0].company_id;
              setCompanyId(cid);
              if (typeof window !== 'undefined') localStorage.setItem('active_company_id', cid);
            } else if (data.length > 1) {
              // Multiple choices: let the company picker handle selection
              // Don't auto-pick here
            }
          }
        }
      } catch {}

      // Platform admin mode - use selected organization or default
      if (isPlatformAdmin) {
        const selectedOrg = selectedOrganizationId || 
          (typeof window !== 'undefined' ? localStorage.getItem('active_organization_id') : null);
        if (selectedOrg) {
          setOrganizationId(selectedOrg);
          if (typeof window !== 'undefined') {
            localStorage.setItem('active_organization_id', selectedOrg);
          }
          return;
        }
        // Platform admin without selected org - try to get first org or leave null
        try {
          const orgs = await supabase.from('organizations').select('id').limit(1);
          if (!orgs.error && orgs.data && orgs.data.length > 0) {
            setOrganizationId(orgs.data[0].id);
            setSelectedOrganizationId(orgs.data[0].id);
            if (typeof window !== 'undefined') {
              localStorage.setItem('active_organization_id', orgs.data[0].id);
            }
          }
        } catch {}
        return;
      }

      // Regular user flow
      // 1) localStorage (persisted selection)
      const stored = typeof window !== 'undefined' ? localStorage.getItem('active_organization_id') : null;
      if (!organizationId && stored) {
        setOrganizationId(stored);
      }

      // If organization is still unknown, derive it from selected company
      if (!organizationId) {
        try {
          const effectiveCompanyId = companyId || (typeof window !== 'undefined' ? localStorage.getItem('active_company_id') : null);
          if (effectiveCompanyId) {
            const { data: comp } = await supabase.from('companies').select('organization_id').eq('id', effectiveCompanyId).single();
            if (comp?.organization_id) {
              setOrganizationId(comp.organization_id);
              if (typeof window !== 'undefined') localStorage.setItem('active_organization_id', comp.organization_id);
              return;
            }
          }
        } catch {}
      }

      // 2) user_profiles via loaded profile
      if (profile?.organization_id) {
        setOrganizationId(profile.organization_id);
        if (typeof window !== 'undefined') localStorage.setItem('active_organization_id', profile.organization_id);
        setRole((profile.role || 'user') as any);
        return;
      }

      // 3) JWT claims
      try {
        const jwt = session?.access_token;
        if (jwt) {
          const claims = JSON.parse(atob(jwt.split('.')[1]));
          if (claims.organization_id) {
            setOrganizationId(claims.organization_id);
            if (typeof window !== 'undefined') localStorage.setItem('active_organization_id', claims.organization_id);
            setRole(claims.role as any);
            return;
          }
        }
      } catch {}

      // 4) Query user_profiles directly for this user (in case profile context not populated yet)
      try {
        if (user?.id) {
          const up = await supabase.from('user_profiles').select('organization_id, role').eq('id', user.id).single();
          if (!up.error && up.data?.organization_id) {
            setOrganizationId(up.data.organization_id);
            if (typeof window !== 'undefined') localStorage.setItem('active_organization_id', up.data.organization_id);
            setRole((up.data.role || 'user') as any);
            return;
          }
        }
      } catch {}

      // 5) Heuristic fallbacks: first visible organization → else infer from companies/pay_groups/employees
      try {
        const orgs = await supabase.from('organizations').select('id').limit(1);
        if (!orgs.error && orgs.data && orgs.data.length > 0) {
          setOrganizationId(orgs.data[0].id);
          if (typeof window !== 'undefined') localStorage.setItem('active_organization_id', orgs.data[0].id);
          return;
        }
      } catch {}
      try {
        const comps = await supabase.from('companies').select('organization_id').limit(1);
        if (!comps.error && comps.data && comps.data.length > 0 && comps.data[0].organization_id) {
          setOrganizationId(comps.data[0].organization_id);
          if (typeof window !== 'undefined') localStorage.setItem('active_organization_id', comps.data[0].organization_id);
          return;
        }
      } catch {}
      try {
        const pgs = await supabase.from('pay_groups').select('organization_id').limit(1);
        if (!pgs.error && pgs.data && pgs.data.length > 0 && pgs.data[0].organization_id) {
          setOrganizationId(pgs.data[0].organization_id);
          if (typeof window !== 'undefined') localStorage.setItem('active_organization_id', pgs.data[0].organization_id);
          return;
        }
      } catch {}
      try {
        const emps = await supabase.from('employees').select('organization_id').limit(1);
        if (!emps.error && emps.data && emps.data.length > 0 && emps.data[0].organization_id) {
          setOrganizationId(emps.data[0].organization_id);
          if (typeof window !== 'undefined') localStorage.setItem('active_organization_id', emps.data[0].organization_id);
          return;
        }
      } catch {}
    }

    // Avoid running while auth is still loading to reduce flicker
    if (!isLoading) {
      resolveOrg();
    }
  }, [profile, session, user, isLoading, isPlatformAdmin, selectedOrganizationId]);

  const value: OrgContextValue = {
    organizationId: isPlatformAdmin && selectedOrganizationId ? selectedOrganizationId : organizationId,
    role,
    companyId,
    companyUnitId,
    isPlatformAdmin,
    selectedOrganizationId,
    setCompanyId,
    setCompanyUnitId,
    setSelectedOrganizationId: (orgId: string | null) => {
      setSelectedOrganizationId(orgId);
      if (orgId && typeof window !== 'undefined') {
        localStorage.setItem('active_organization_id', orgId);
      }
    },
  };

  return (
    <OrgContext.Provider value={value}>
      {children}
    </OrgContext.Provider>
  );
};

export function useOrg() {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error('useOrg must be used within an OrgProvider');
  return ctx;
}
