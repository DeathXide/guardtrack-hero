import { supabase } from './client';
import { RealtimeChannel } from '@supabase/supabase-js';

export class RealtimeService {
  private channels: Map<string, RealtimeChannel> = new Map();

  // Subscribe to table changes
  subscribeToTable<T>(
    tableName: string,
    callback: (payload: {
      eventType: 'INSERT' | 'UPDATE' | 'DELETE';
      new: T;
      old: T;
    }) => void,
    filter?: string
  ) {
    const channelName = `${tableName}${filter ? `_${filter}` : ''}`;
    
    if (this.channels.has(channelName)) {
      return this.channels.get(channelName)!;
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: tableName,
          filter: filter
        },
        callback
      )
      .subscribe();

    this.channels.set(channelName, channel);
    return channel;
  }

  // Subscribe to attendance updates for a specific site
  subscribeToSiteAttendance(
    siteId: string,
    callback: (payload: any) => void
  ) {
    return this.subscribeToTable(
      'attendance_records',
      callback,
      `site_id=eq.${siteId}`
    );
  }

  // Subscribe to guard status changes
  subscribeToGuardStatus(
    guardId: string,
    callback: (payload: any) => void
  ) {
    return this.subscribeToTable(
      'attendance_records',
      callback,
      `guard_id=eq.${guardId}`
    );
  }

  // Subscribe to shift allocations
  subscribeToShiftAllocations(
    siteId: string,
    callback: (payload: any) => void
  ) {
    return this.subscribeToTable(
      'shifts',
      callback,
      `site_id=eq.${siteId}`
    );
  }

  // Unsubscribe from a channel
  unsubscribe(channelName: string) {
    const channel = this.channels.get(channelName);
    if (channel) {
      supabase.removeChannel(channel);
      this.channels.delete(channelName);
    }
  }

  // Unsubscribe from all channels
  unsubscribeAll() {
    this.channels.forEach((channel, name) => {
      supabase.removeChannel(channel);
    });
    this.channels.clear();
  }

  // Send real-time messages
  async sendMessage(channel: string, event: string, payload: any) {
    const channelInstance = supabase.channel(channel);
    await channelInstance.send({
      type: 'broadcast',
      event,
      payload
    });
  }

  // Subscribe to custom messages
  subscribeToMessages(
    channel: string,
    event: string,
    callback: (payload: any) => void
  ) {
    return supabase
      .channel(channel)
      .on('broadcast', { event }, callback)
      .subscribe();
  }
}

export const realtimeService = new RealtimeService();