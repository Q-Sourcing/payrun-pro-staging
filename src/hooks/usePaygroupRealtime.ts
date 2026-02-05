import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface PaygroupRealtimePayload {
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  employee_id: string;
  pay_group_id: string;
  active: boolean;
  timestamp: string;
}

interface UsePaygroupRealtimeOptions {
  onEmployeeAdded?: (payload: PaygroupRealtimePayload) => void;
  onEmployeeRemoved?: (payload: PaygroupRealtimePayload) => void;
  onEmployeeUpdated?: (payload: PaygroupRealtimePayload) => void;
  onAnyChange?: (payload: PaygroupRealtimePayload) => void;
  refetch?: () => void;
  enabled?: boolean;
  tableName?: 'paygroup_employees' | 'head_office_pay_group_members';
}

/**
 * Hook for realtime PayGroup employee updates
 * 
 * @param options Configuration options for the realtime subscription
 * @returns Object with connection status and manual controls
 */
export function usePaygroupRealtime(options: UsePaygroupRealtimeOptions = {}) {
  const {
    onEmployeeAdded,
    onEmployeeRemoved,
    onEmployeeUpdated,
    onAnyChange,
    refetch,
    enabled = true,
    tableName = 'paygroup_employees'
  } = options;

  const channelRef = useRef<RealtimeChannel | null>(null);
  const isConnectedRef = useRef(false);

  const handleRealtimeChange = useCallback((payload: any) => {
    console.log('🔄 PayGroup Realtime Change:', payload);

    const realtimePayload: PaygroupRealtimePayload = {
      operation: payload.eventType,
      employee_id: payload.new?.employee_id || payload.old?.employee_id,
      pay_group_id: payload.new?.pay_group_id || payload.old?.pay_group_id,
      active: payload.new?.active ?? payload.old?.active ?? false,
      timestamp: new Date().toISOString()
    };

    // Call specific handlers based on operation
    switch (payload.eventType) {
      case 'INSERT':
        onEmployeeAdded?.(realtimePayload);
        break;
      case 'UPDATE':
        onEmployeeUpdated?.(realtimePayload);
        break;
      case 'DELETE':
        onEmployeeRemoved?.(realtimePayload);
        break;
    }

    // Call general change handler
    onAnyChange?.(realtimePayload);

    // Call refetch if provided
    refetch?.();
  }, [onEmployeeAdded, onEmployeeRemoved, onEmployeeUpdated, onAnyChange, refetch]);

  const connect = useCallback(() => {
    if (!enabled || channelRef.current) {
      return;
    }

    console.log('🔌 Connecting to PayGroup realtime...');

    const channel = supabase
      .channel('paygroup-employees-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName
        },
        handleRealtimeChange
      )
      .subscribe((status) => {
        console.log('📡 PayGroup Realtime Status:', status);
        isConnectedRef.current = status === 'SUBSCRIBED';
      });

    channelRef.current = channel;
  }, [enabled, handleRealtimeChange]);

  const disconnect = useCallback(() => {
    if (channelRef.current) {
      console.log('🔌 Disconnecting from PayGroup realtime...');
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      isConnectedRef.current = false;
    }
  }, []);

  // Connect on mount and when dependencies change
  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []); // Remove disconnect from dependencies to prevent unnecessary re-renders

  return {
    isConnected: isConnectedRef.current,
    connect,
    disconnect
  };
}

/**
 * Simplified hook for basic PayGroup realtime updates
 * Just calls refetch when any change occurs
 */
export function usePaygroupRealtimeRefetch(refetch: () => void, enabled: boolean = true) {
  return usePaygroupRealtime({
    refetch,
    enabled,
    onAnyChange: (payload) => {
      console.log('🔄 PayGroup change detected, refetching...', payload);
    }
  });
}

/**
 * Hook for PayGroup-specific realtime updates
 * Only listens to changes for a specific pay group
 */
export function usePaygroupRealtimeForGroup(
  payGroupId: string,
  options: UsePaygroupRealtimeOptions = {}
) {
  const {
    onEmployeeAdded,
    onEmployeeRemoved,
    onEmployeeUpdated,
    onAnyChange,
    refetch,
    enabled = true,
    tableName = 'paygroup_employees'
  } = options;

  const channelRef = useRef<RealtimeChannel | null>(null);
  const isConnectedRef = useRef(false);

  const handleRealtimeChange = useCallback((payload: any) => {
    // Only process changes for the specific pay group
    const changedPayGroupId = payload.new?.pay_group_id || payload.old?.pay_group_id;
    if (changedPayGroupId !== payGroupId) {
      return;
    }

    console.log(`🔄 PayGroup ${payGroupId} Realtime Change:`, payload);

    const realtimePayload: PaygroupRealtimePayload = {
      operation: payload.eventType,
      employee_id: payload.new?.employee_id || payload.old?.employee_id,
      pay_group_id: changedPayGroupId,
      active: payload.new?.active ?? payload.old?.active ?? false,
      timestamp: new Date().toISOString()
    };

    // Call specific handlers based on operation
    switch (payload.eventType) {
      case 'INSERT':
        onEmployeeAdded?.(realtimePayload);
        break;
      case 'UPDATE':
        onEmployeeUpdated?.(realtimePayload);
        break;
      case 'DELETE':
        onEmployeeRemoved?.(realtimePayload);
        break;
    }

    // Call general change handler
    onAnyChange?.(realtimePayload);

    // Call refetch if provided
    refetch?.();
  }, [payGroupId, onEmployeeAdded, onEmployeeRemoved, onEmployeeUpdated, onAnyChange, refetch]);

  const connect = useCallback(() => {
    if (!enabled || !payGroupId || channelRef.current) {
      return;
    }

    console.log(`🔌 Connecting to PayGroup ${payGroupId} realtime...`);

    const channel = supabase
      .channel(`paygroup-${payGroupId}-realtime`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName,
          filter: `pay_group_id=eq.${payGroupId}`
        },
        handleRealtimeChange
      )
      .subscribe((status) => {
        console.log(`📡 PayGroup ${payGroupId} Realtime Status:`, status);
        isConnectedRef.current = status === 'SUBSCRIBED';
      });

    channelRef.current = channel;
  }, [enabled, payGroupId, handleRealtimeChange]);

  const disconnect = useCallback(() => {
    if (channelRef.current) {
      console.log(`🔌 Disconnecting from PayGroup ${payGroupId} realtime...`);
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      isConnectedRef.current = false;
    }
  }, [payGroupId]);

  // Connect on mount and when dependencies change
  useEffect(() => {
    if (enabled && payGroupId) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, payGroupId]); // Removed connect and disconnect from dependencies to prevent infinite loops

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []); // Remove disconnect from dependencies to prevent unnecessary re-renders

  return {
    isConnected: isConnectedRef.current,
    connect,
    disconnect
  };
}
