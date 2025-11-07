import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/hooks/use-supabase-auth';

interface OrgContextValue {
  organizationId: string | null;
  role: 'super_admin' | 'org_admin' | 'user' | null;
  companyId: string | null;
  orgUnitId: string | null;
  setCompanyId: (companyId: string|null) => void;
  setOrgUnitId: (orgUnitId: string|null) => void;
}

const OrgContext = createContext<OrgContextValue | undefined>(undefined);

export const OrgProvider = ({ children }: { children: ReactNode }) => {
  const { user, session, profile, isLoading } = useSupabaseAuth();
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [role, setRole] = useState<'super_admin' | 'org_admin' | 'user' | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [orgUnitId, setOrgUnitId] = useState<string | null>(null);

  // Attempt to derive org from multiple sources
  useEffect(() => {
    async function resolveOrg() {
      // 1) localStorage (persisted selection)
      const stored = typeof window !== 'undefined' ? localStorage.getItem('active_organization_id') : null;
      if (!organizationId && stored) {
        setOrganizationId(stored);
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
  }, [profile, session, user, isLoading]);

  const value: OrgContextValue = {
    organizationId,
    role,
    companyId,
    orgUnitId,
    setCompanyId,
    setOrgUnitId,
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
