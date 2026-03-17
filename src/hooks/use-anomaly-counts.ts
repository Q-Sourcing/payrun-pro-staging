import { useQuery } from '@tanstack/react-query';
import { AnomalyService } from '@/lib/services/anomaly.service';
import { useOrg } from '@/lib/tenant/OrgContext';

export function useAnomalyCounts() {
  const { organizationId } = useOrg();

  const { data, isLoading } = useQuery({
    queryKey: ['anomaly-counts', organizationId],
    queryFn: () => AnomalyService.getAnomalyCounts(organizationId!),
    enabled: !!organizationId,
    refetchInterval: 60000, // refresh every minute
  });

  return {
    counts: data || { critical: 0, warning: 0, info: 0, total: 0 },
    isLoading,
  };
}
