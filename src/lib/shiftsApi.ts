import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

// Use the database types for better type safety
export type Shift = Database['public']['Tables']['shifts']['Row'];
export type CreateShiftData = Database['public']['Tables']['shifts']['Insert'];
export type UpdateShiftData = Database['public']['Tables']['shifts']['Update'];

// Shift CRUD Operations
export const shiftsApi = {
  // Create a new shift
  async createShift(shiftData: CreateShiftData) {
    const { data, error } = await supabase
      .from('shifts')
      .insert(shiftData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Get all shifts
  async getAllShifts() {
    const { data, error } = await supabase
      .from('shifts')
      .select(`
        *,
        sites (
          site_name
        ),
        guards (
          name,
          badge_number,
          status
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Get shifts by site ID
  async getShiftsBySite(siteId: string) {
    const { data, error } = await supabase
      .from('shifts')
      .select(`
        *,
        guards (
          name,
          badge_number,
          status
        )
      `)
      .eq('site_id', siteId)
      .order('type');

    if (error) throw error;
    return data;
  },

  // Get shifts by guard ID
  async getShiftsByGuard(guardId: string) {
    const { data, error } = await supabase
      .from('shifts')
      .select(`
        *,
        sites (
          site_name,
          address
        )
      `)
      .eq('guard_id', guardId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Get shift by ID
  async getShiftById(id: string) {
    const { data, error } = await supabase
      .from('shifts')
      .select(`
        *,
        sites (
          site_name,
          address
        ),
        guards (
          name,
          badge_number,
          status
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  // Update shift
  async updateShift(id: string, shiftData: UpdateShiftData) {
    const { data, error } = await supabase
      .from('shifts')
      .update(shiftData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete shift
  async deleteShift(id: string) {
    const { error } = await supabase
      .from('shifts')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },

  // Delete all shifts for a site (useful when deallocating all guards)
  async deleteShiftsBySite(siteId: string) {
    const { error } = await supabase
      .from('shifts')
      .delete()
      .eq('site_id', siteId);

    if (error) throw error;
    return true;
  },

  // Delete all shifts for a guard (useful when removing a guard)
  async deleteShiftsByGuard(guardId: string) {
    const { error } = await supabase
      .from('shifts')
      .delete()
      .eq('guard_id', guardId);

    if (error) throw error;
    return true;
  },

  // Bulk create shifts
  async createShifts(shiftsData: CreateShiftData[]) {
    const { data, error } = await supabase
      .from('shifts')
      .insert(shiftsData)
      .select();

    if (error) throw error;
    return data;
  },

  // Bulk update shifts
  async bulkUpdateShifts(updates: { id: string; data: UpdateShiftData }[]) {
    const promises = updates.map(({ id, data }) => 
      supabase
        .from('shifts')
        .update(data)
        .eq('id', id)
        .select()
        .single()
    );

    const results = await Promise.all(promises);
    
    // Check for errors
    const errors = results.filter(result => result.error);
    if (errors.length > 0) {
      throw new Error(`Failed to update ${errors.length} shifts`);
    }

    return results.map(result => result.data);
  },

  // Get shifts with staff allocation summary for a site
  async getSiteShiftSummary(siteId: string) {
    const { data: shifts, error } = await supabase
      .from('shifts')
      .select(`
        *,
        guards (
          name,
          badge_number,
          status
        )
      `)
      .eq('site_id', siteId);

    if (error) throw error;

    // Get site details including staffing requirements
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select(`
        *,
        staffing_requirements (*)
      `)
      .eq('id', siteId)
      .single();

    if (siteError) throw siteError;

    // Calculate staffing summary
    const dayShifts = shifts?.filter(shift => shift.type === 'day') || [];
    const nightShifts = shifts?.filter(shift => shift.type === 'night') || [];
    
    // Get total slots from staffing requirements
    const totalDaySlots = site?.staffing_requirements?.reduce((sum, req) => sum + req.day_slots, 0) || 0;
    const totalNightSlots = site?.staffing_requirements?.reduce((sum, req) => sum + req.night_slots, 0) || 0;

    return {
      siteId,
      siteName: site?.site_name,
      dayShifts,
      nightShifts,
      daySlotsFilled: dayShifts.filter(shift => shift.guard_id).length,
      nightSlotsFilled: nightShifts.filter(shift => shift.guard_id).length,
      totalDaySlots,
      totalNightSlots,
      dayPercentage: totalDaySlots > 0 ? (dayShifts.filter(shift => shift.guard_id).length / totalDaySlots) * 100 : 0,
      nightPercentage: totalNightSlots > 0 ? (nightShifts.filter(shift => shift.guard_id).length / totalNightSlots) * 100 : 0
    };
  },

  // Reassign guard from one shift to another
  async reassignGuard(fromShiftId: string, toShiftId: string) {
    const { data: fromShift, error: fromError } = await supabase
      .from('shifts')
      .select('guard_id')
      .eq('id', fromShiftId)
      .single();

    if (fromError) throw fromError;

    // Start transaction-like operations
    const { error: updateToError } = await supabase
      .from('shifts')
      .update({ guard_id: fromShift.guard_id })
      .eq('id', toShiftId);

    if (updateToError) throw updateToError;

    const { error: updateFromError } = await supabase
      .from('shifts')
      .update({ guard_id: null })
      .eq('id', fromShiftId);

    if (updateFromError) throw updateFromError;

    return true;
  },

  // Get shifts by site ID and date (including temporary slots)
  async getShiftsBySiteAndDate(siteId: string, date: string) {
    const { data, error } = await supabase
      .from('shifts')
      .select(`
        *,
        guards (
          name,
          badge_number,
          status
        )
      `)
      .eq('site_id', siteId)
      .or(`is_temporary.eq.false,created_for_date.eq.${date}`)
      .order('type');

    if (error) throw error;
    return data;
  },

  // Copy temporary slots from one date to another
  async copyTemporarySlots(siteId: string, fromDate: string, toDate: string) {
    // Get temporary slots from the source date
    const { data: temporarySlots, error: fetchError } = await supabase
      .from('shifts')
      .select('*')
      .eq('site_id', siteId)
      .eq('is_temporary', true)
      .eq('created_for_date', fromDate);

    if (fetchError) throw fetchError;
    
    if (!temporarySlots || temporarySlots.length === 0) {
      return { copied: 0 };
    }

    // Create new temporary slots for the target date
    const newSlots = temporarySlots.map(slot => ({
      site_id: slot.site_id,
      guard_id: null, // Reset guard assignment
      type: slot.type,
      is_temporary: true,
      temporary_pay_rate: slot.temporary_pay_rate,
      created_for_date: toDate
    }));

    const { data, error: insertError } = await supabase
      .from('shifts')
      .insert(newSlots);

    if (insertError) throw insertError;
    
    return { copied: temporarySlots.length };
  }
};

// Utility functions for shift management
export const shiftUtils = {
  // Format shift type for display
  formatShiftType(type: string): string {
    return type.charAt(0).toUpperCase() + type.slice(1);
  },

  // Get shift time display
  getShiftTime(type: string): string {
    switch (type) {
      case 'day':
        return '8:00 AM - 8:00 PM';
      case 'night':
        return '8:00 PM - 8:00 AM';
      default:
        return 'Unknown';
    }
  },

  // Check if shifts conflict (same guard, same time)
  hasShiftConflict(shifts: Shift[], guardId: string, shiftType: string): boolean {
    return shifts.some(shift => 
      shift.guard_id === guardId && 
      shift.type === shiftType
    );
  },

  // Group shifts by site
  groupShiftsBySite(shifts: Shift[]): Record<string, Shift[]> {
    return shifts.reduce((groups, shift) => {
      const siteId = shift.site_id;
      if (!groups[siteId]) {
        groups[siteId] = [];
      }
      groups[siteId].push(shift);
      return groups;
    }, {} as Record<string, Shift[]>);
  },

  // Group shifts by guard
  groupShiftsByGuard(shifts: Shift[]): Record<string, Shift[]> {
    return shifts.reduce((groups, shift) => {
      const guardId = shift.guard_id;
      if (guardId) {
        if (!groups[guardId]) {
          groups[guardId] = [];
        }
        groups[guardId].push(shift);
      }
      return groups;
    }, {} as Record<string, Shift[]>);
  }
};