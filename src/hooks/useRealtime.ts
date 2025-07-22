import { useEffect, useRef } from 'react';
import { realtimeService } from '@/lib/supabase/realtimeService';
import { RealtimeChannel } from '@supabase/supabase-js';

// Hook for subscribing to table changes
export const useRealtimeTable = <T>(
  tableName: string,
  callback: (payload: {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE';
    new: T;
    old: T;
  }) => void,
  filter?: string,
  dependencies: any[] = []
) => {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    channelRef.current = realtimeService.subscribeToTable(tableName, callback, filter);

    return () => {
      if (channelRef.current) {
        const channelName = `${tableName}${filter ? `_${filter}` : ''}`;
        realtimeService.unsubscribe(channelName);
      }
    };
  }, [tableName, filter, ...dependencies]);

  return channelRef.current;
};

// Hook for site attendance updates
export const useSiteAttendanceUpdates = (
  siteId: string | null,
  callback: (payload: any) => void
) => {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!siteId) return;

    channelRef.current = realtimeService.subscribeToSiteAttendance(siteId, callback);

    return () => {
      if (channelRef.current) {
        realtimeService.unsubscribe(`attendance_records_site_id=eq.${siteId}`);
      }
    };
  }, [siteId]);

  return channelRef.current;
};

// Hook for guard status updates
export const useGuardStatusUpdates = (
  guardId: string | null,
  callback: (payload: any) => void
) => {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!guardId) return;

    channelRef.current = realtimeService.subscribeToGuardStatus(guardId, callback);

    return () => {
      if (channelRef.current) {
        realtimeService.unsubscribe(`attendance_records_guard_id=eq.${guardId}`);
      }
    };
  }, [guardId]);

  return channelRef.current;
};

// Hook for shift allocation updates
export const useShiftAllocationUpdates = (
  siteId: string | null,
  callback: (payload: any) => void
) => {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!siteId) return;

    channelRef.current = realtimeService.subscribeToShiftAllocations(siteId, callback);

    return () => {
      if (channelRef.current) {
        realtimeService.unsubscribe(`shifts_site_id=eq.${siteId}`);
      }
    };
  }, [siteId]);

  return channelRef.current;
};

// Hook for custom message subscriptions
export const useRealtimeMessages = (
  channel: string,
  event: string,
  callback: (payload: any) => void,
  dependencies: any[] = []
) => {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    channelRef.current = realtimeService.subscribeToMessages(channel, event, callback);

    return () => {
      if (channelRef.current) {
        realtimeService.unsubscribe(channel);
      }
    };
  }, [channel, event, ...dependencies]);

  return channelRef.current;
};