import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/hooks/use-supabase-auth';
import { UserRole } from '@/lib/types/roles';
import { queryClient } from '@/lib/data/query-client';

interface OrgContextValue {
  organizationId: string | null;
  role: UserRole | null;
  companyId: string | null;
  companyUnitId: string | null;
  isPlatformAdmin: boolean;
  needsCompanySelection: boolean;
  selectedOrganizationId: string | null;
  setCompanyId: (companyId: string | null) => void;
  setCompanyUnitId: (companyUnitId: string | null) => void;
  setSelectedOrganizationId: (orgId: string | null) => void;
}

const OrgContext = createContext<OrgContextValue | undefined>(undefined);

const PLATFORM_ADMIN_EMAIL = 'nalungukevin@gmail.com';

export const OrgProvider = ({ children }: { children: ReactNode }) => {
  const { user, session, profile, isLoading } = useSupabaseAuth();
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [companyId, setCompanyIdState] = useState<string | null>(null);
  const [companyUnitId, setCompanyUnitId] = useState<string | null>(null);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
  const [needsCompanySelection, setNeedsCompanySelection] = useState(false);

  const isPlatformAdmin = user?.email?.toLowerCase() === PLATFORM_ADMIN_EMAIL.toLowerCase() ||
    localStorage.getItem('login_mode') === 'platform_admin';

  // When companyId changes, re-derive organizationId from the company + invalidate all caches
  const setCompanyId = useCallback(async (newCompanyId: string | null) => {
    setCompanyIdState(newCompanyId);
    setNeedsCompanySelection(false);
    
    // Invalidate ALL query caches so every page refetches with new company scope
    queryClient.clear();
    
    if (newCompanyId) {
      if (typeof window !== 'undefined') localStorage.setItem('active_company_id', newCompanyId);
      try {
        const { data: comp } = await supabase
          .from('companies')
          .select('organization_id')
          .eq('id', newCompanyId)
          .single();
        if (comp?.organization_id) {
          setOrganizationId(comp.organization_id);
          if (typeof window !== 'undefined') localStorage.setItem('active_organization_id', comp.organization_id);
        }
      } catch { }
    }
  }, []);

  useEffect(() => {
    async function resolveOrg() {
      // Restore company from localStorage
      const storedCompany = typeof window !== 'undefined' ? localStorage.getItem('active_company_id') : null;
      if (!companyId && storedCompany) {
        setCompanyIdState(storedCompany);
      }

      // If no company stored, check memberships
      if (!storedCompany && user?.id) {
        try {
          const { data, error } = await supabase
            .from('user_company_memberships')
            .select('company_id')
            .eq('user_id', user.id);
          if (!error && data) {
            if (data.length === 1) {
              const cid = data[0].company_id;
              setCompanyIdState(cid);
              if (typeof window !== 'undefined') localStorage.setItem('active_company_id', cid);
              const { data: comp } = await supabase
                .from('companies')
                .select('organization_id')
                .eq('id', cid)
                .single();
              if (comp?.organization_id) {
                setOrganizationId(comp.organization_id);
                if (typeof window !== 'undefined') localStorage.setItem('active_organization_id', comp.organization_id);
              }
              setNeedsCompanySelection(false);
              return;
            } else if (data.length > 1) {
              setNeedsCompanySelection(true);
              return;
            }
          }
        } catch { }
      }

      // Platform admin mode
      if (isPlatformAdmin) {
        const selectedOrg = selectedOrganizationId ||
          (typeof window !== 'undefined' ? localStorage.getItem('active_organization_id') : null);
        if (selectedOrg) {
          setOrganizationId(selectedOrg);
          if (typeof window !== 'undefined') localStorage.setItem('active_organization_id', selectedOrg);
          return;
        }
        try {
          const orgs = await supabase.from('organizations').select('id').limit(1);
          if (!orgs.error && orgs.data && orgs.data.length > 0) {
            setOrganizationId(orgs.data[0].id);
            setSelectedOrganizationId(orgs.data[0].id);
            if (typeof window !== 'undefined') localStorage.setItem('active_organization_id', orgs.data[0].id);
          }
        } catch { }
        return;
      }

      // Regular user: derive org from stored company
      const effectiveCompanyId = companyId || storedCompany;
      if (effectiveCompanyId && !organizationId) {
        try {
          const { data: comp } = await supabase
            .from('companies')
            .select('organization_id')
            .eq('id', effectiveCompanyId)
            .single();
          if (comp?.organization_id) {
            setOrganizationId(comp.organization_id);
            if (typeof window !== 'undefined') localStorage.setItem('active_organization_id', comp.organization_id);
            return;
          }
        } catch { }
      }

      // Stored org
      const stored = typeof window !== 'undefined' ? localStorage.getItem('active_organization_id') : null;
      if (!organizationId && stored) {
        setOrganizationId(stored);
        return;
      }

      // Profile fallback
      if (profile?.organization_id) {
        setOrganizationId(profile.organization_id);
        if (typeof window !== 'undefined') localStorage.setItem('active_organization_id', profile.organization_id);
        setRole((profile.role || 'SELF_USER') as any);
        return;
      }

      // JWT claims
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
      } catch { }

      // Query user_profiles
      try {
        if (user?.id) {
          const up = await supabase.from('user_profiles').select('organization_id, role').eq('id', user.id).single();
          if (!up.error && up.data?.organization_id) {
            setOrganizationId(up.data.organization_id);
            if (typeof window !== 'undefined') localStorage.setItem('active_organization_id', up.data.organization_id);
            setRole((up.data.role || 'SELF_USER') as any);
            return;
          }
        }
      } catch { }

      // Heuristic fallbacks
      try {
        const orgs = await supabase.from('organizations').select('id').limit(1);
        if (!orgs.error && orgs.data && orgs.data.length > 0) {
          setOrganizationId(orgs.data[0].id);
          if (typeof window !== 'undefined') localStorage.setItem('active_organization_id', orgs.data[0].id);
          return;
        }
      } catch { }
    }

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
    needsCompanySelection,
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
