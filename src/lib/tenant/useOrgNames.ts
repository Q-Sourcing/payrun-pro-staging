import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrg } from './OrgContext';

interface OrgNamesResult {
  organizationName: string | null;
  companyName: string | null;
  resolvedCompanyId: string | null;
  loading: boolean;
}

/**
 * Resolve human-readable Organization and Company names for display purposes.
 * - Organization name from organizations table by organizationId
 * - Company name by current companyId; if absent, attempt default_company_id; else first company in org
 */
export function useOrgNames(): OrgNamesResult {
  const { organizationId, companyId } = useOrg();
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [resolvedCompanyId, setResolvedCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      // Resolve an organization id aggressively to avoid blank UI
      let orgIdToUse = organizationId;
      if (!orgIdToUse && typeof window !== 'undefined') {
        const stored = localStorage.getItem('active_organization_id');
        if (stored) orgIdToUse = stored;
      }
      // If still missing, infer org from selected company
      if (!orgIdToUse && (companyId || (typeof window !== 'undefined' && localStorage.getItem('active_company_id')))) {
        const effectiveCompanyId = companyId || (typeof window !== 'undefined' ? localStorage.getItem('active_company_id') : null);
        if (effectiveCompanyId) {
          const { data: comp } = await supabase.from('companies').select('organization_id').eq('id', effectiveCompanyId).maybeSingle();
          if (comp?.organization_id) {
            orgIdToUse = comp.organization_id;
            if (typeof window !== 'undefined') localStorage.setItem('active_organization_id', orgIdToUse);
          }
        }
      }
      // Final fallback to default GWAZU org id (staging default)
      if (!orgIdToUse) {
        orgIdToUse = '00000000-0000-0000-0000-000000000001';
        if (typeof window !== 'undefined') {
          localStorage.setItem('active_organization_id', orgIdToUse);
        }
      }

      setLoading(true);
      try {
        // Load organization (with possible default company id if present)
        const { data: org, error: orgError } = await supabase
          .from('organizations')
          .select('id, name')
          .eq('id', orgIdToUse)
          .maybeSingle();

        if (cancelled) return;
        if (orgError) {
          setOrganizationName(null);
        } else {
          setOrganizationName(org?.name || null);
        }

        // Resolve company id preference
        let companyIdToUse: string | null = companyId || null;

        // If still no company id, pick first company in org
        if (!companyIdToUse) {
          const { data: firstCompany } = await supabase
            .from('companies')
            .select('id, name')
            .eq('organization_id', orgIdToUse)
            .order('name')
            .limit(1)
            .maybeSingle();
          companyIdToUse = firstCompany?.id || null;
          if (!cancelled && firstCompany) {
            setCompanyName(firstCompany.name || null);
          }
        }

        setResolvedCompanyId(companyIdToUse);

        // If we already set companyName from firstCompany above, skip fetch
        if (companyIdToUse && (!companyName || companyIdToUse !== resolvedCompanyId)) {
          const { data: comp, error: compError } = await supabase
            .from('companies')
            .select('id, name')
            .eq('id', companyIdToUse)
            .single();
          if (!cancelled) {
            if (compError) {
              setCompanyName(null);
            } else {
              setCompanyName(comp?.name || null);
            }
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [organizationId, companyId]);

  return { organizationName, companyName, resolvedCompanyId, loading };
}


