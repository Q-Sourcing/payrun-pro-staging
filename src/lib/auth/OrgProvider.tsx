/**
 * OrgProvider.tsx — Simplified org/company context
 *
 * Replaces the old OrgContext.tsx. Derives the current org from the
 * user's profile and company memberships. No hardcoded admin emails.
 * isPlatformAdmin comes from the JWT claims.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthProvider';
import { queryClient } from '@/lib/data/query-client';

interface OrgContextValue {
  organizationId: string | null;
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

export function OrgProvider({ children }: { children: ReactNode }) {
  const { user, session, profile, isLoading, userContext } = useAuth();
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [companyId, setCompanyIdState] = useState<string | null>(null);
  const [companyUnitId, setCompanyUnitId] = useState<string | null>(null);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
  const [needsCompanySelection, setNeedsCompanySelection] = useState(false);

  // Derive platform admin from JWT claims — no hardcoded email
  const isPlatformAdmin = !!userContext?.isPlatformAdmin;

  // When companyId changes, resolve org and clear query caches
  const setCompanyId = useCallback(async (newCompanyId: string | null) => {
    setCompanyIdState(newCompanyId);
    setNeedsCompanySelection(false);
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
      } catch { /* non-blocking */ }
    }
  }, []);

  // Resolve org/company on auth change
  useEffect(() => {
    if (isLoading) return;

    async function resolveOrg() {
      // Restore company from localStorage
      const storedCompany = typeof window !== 'undefined' ? localStorage.getItem('active_company_id') : null;
      if (!companyId && storedCompany) {
        setCompanyIdState(storedCompany);
      }

      // If no stored company, check memberships
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
        } catch { /* non-blocking */ }
      }

      // Platform admin mode
      if (isPlatformAdmin) {
        const selectedOrg =
          selectedOrganizationId ||
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
        } catch { /* non-blocking */ }
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
        } catch { /* non-blocking */ }
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
        return;
      }

      // JWT claims fallback
      if (userContext?.organizationId) {
        setOrganizationId(userContext.organizationId);
        if (typeof window !== 'undefined') localStorage.setItem('active_organization_id', userContext.organizationId);
        return;
      }

      // Query user_profiles fallback
      if (user?.id) {
        try {
          const up = await supabase.from('user_profiles').select('organization_id, role').eq('id', user.id).single();
          if (!up.error && up.data?.organization_id) {
            setOrganizationId(up.data.organization_id);
            if (typeof window !== 'undefined') localStorage.setItem('active_organization_id', up.data.organization_id);
            return;
          }
        } catch { /* non-blocking */ }
      }

      // Last resort: first org in table
      try {
        const orgs = await supabase.from('organizations').select('id').limit(1);
        if (!orgs.error && orgs.data && orgs.data.length > 0) {
          setOrganizationId(orgs.data[0].id);
          if (typeof window !== 'undefined') localStorage.setItem('active_organization_id', orgs.data[0].id);
        }
      } catch { /* non-blocking */ }
    }

    resolveOrg();
  }, [profile, session, user, isLoading, isPlatformAdmin, selectedOrganizationId]);

  const value: OrgContextValue = {
    organizationId: isPlatformAdmin && selectedOrganizationId ? selectedOrganizationId : organizationId,
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

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrg() {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error('useOrg must be used within an OrgProvider');
  return ctx;
}
