import { supabase } from "@/integrations/supabase/client";

export interface DailyAttendanceSlot {
  id: string;
  site_id: string;
  attendance_date: string;
  shift_type: 'day' | 'night';
  role_type: string;
  slot_number: number;
  assigned_guard_id: string | null;
  is_present: boolean | null;
  pay_rate: number | null;
  is_temporary: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateSlotData {
  site_id: string;
  attendance_date: string;
  shift_type: 'day' | 'night';
  role_type: string;
  slot_number: number;
  assigned_guard_id?: string;
  pay_rate?: number;
  is_temporary?: boolean;
}

export interface UpdateSlotData {
  assigned_guard_id?: string | null;
  is_present?: boolean | null;
  pay_rate?: number | null;
}

export const dailyAttendanceSlotsApi = {
  // Generate slots for a specific site and date (force regeneration option)
  async generateSlotsForDate(siteId: string, date: string, forceRegenerate = false) {
    // Check if slots already exist for this date
    const { data: existingSlots } = await supabase
      .from('daily_attendance_slots')
      .select('*')
      .eq('site_id', siteId)
      .eq('attendance_date', date);

    if (existingSlots && existingSlots.length > 0 && !forceRegenerate) {
      return existingSlots;
    }

    // If force regenerate, delete existing slots first (but preserve attendance data)
    if (forceRegenerate && existingSlots && existingSlots.length > 0) {
      // Store existing assignments and attendance before deletion
      const existingAssignments = existingSlots.map(slot => ({
        role_type: slot.role_type,
        slot_number: slot.slot_number,
        shift_type: slot.shift_type,
        assigned_guard_id: slot.assigned_guard_id,
        is_present: slot.is_present,
        pay_rate: slot.pay_rate
      }));

      // Delete existing slots
      const { error: deleteError } = await supabase
        .from('daily_attendance_slots')
        .delete()
        .eq('site_id', siteId)
        .eq('attendance_date', date);

      if (deleteError) throw deleteError;
    }

    // Get site staffing requirements
    const { data: staffingReqs, error: staffingError } = await supabase
      .from('staffing_requirements')
      .select('*')
      .eq('site_id', siteId);

    if (staffingError) throw staffingError;

    if (!staffingReqs || staffingReqs.length === 0) {
      return [];
    }

    // Generate slots based on staffing requirements
    const slotsToCreate: CreateSlotData[] = [];

    for (const req of staffingReqs) {
      // Create day slots
      for (let i = 1; i <= req.day_slots; i++) {
        slotsToCreate.push({
          site_id: siteId,
          attendance_date: date,
          shift_type: 'day',
          role_type: req.role_type,
          slot_number: i,
          pay_rate: req.budget_per_slot
        });
      }

      // Create night slots
      for (let i = 1; i <= req.night_slots; i++) {
        slotsToCreate.push({
          site_id: siteId,
          attendance_date: date,
          shift_type: 'night',
          role_type: req.role_type,
          slot_number: i,
          pay_rate: req.budget_per_slot
        });
      }
    }

    if (slotsToCreate.length === 0) {
      return [];
    }

    // Insert the new slots
    const { data: newSlots, error: insertError } = await supabase
      .from('daily_attendance_slots')
      .insert(slotsToCreate)
      .select();

    if (insertError) throw insertError;

    if (!newSlots) return [];

    // If we had existing assignments and this is a regeneration, try to restore them
    if (forceRegenerate && existingSlots && existingSlots.length > 0) {
      const restoredSlots = await this.restoreAssignments(newSlots, existingSlots);
      return restoredSlots;
    }

    // If this is a new day (not regeneration), automatically assign guards from previous day
    if (!forceRegenerate) {
      const autoAssignedSlots = await this.autoAssignFromPreviousDay(newSlots, siteId, date);
      return autoAssignedSlots;
    }

    return newSlots;
  },

  // Helper function to restore assignments after regeneration
  async restoreAssignments(newSlots: any[], existingSlots: any[]) {
    const updates = [];

    for (const newSlot of newSlots) {
      // Find matching slot from previous generation
      const matchingOldSlot = existingSlots.find(oldSlot => 
        oldSlot.role_type === newSlot.role_type &&
        oldSlot.slot_number === newSlot.slot_number &&
        oldSlot.shift_type === newSlot.shift_type
      );

      if (matchingOldSlot && matchingOldSlot.assigned_guard_id) {
        updates.push({
          id: newSlot.id,
          assigned_guard_id: matchingOldSlot.assigned_guard_id,
          is_present: matchingOldSlot.is_present,
          pay_rate: matchingOldSlot.pay_rate || newSlot.pay_rate
        });
      }
    }

    // Apply updates if any
    if (updates.length > 0) {
      for (const update of updates) {
        await supabase
          .from('daily_attendance_slots')
          .update({
            assigned_guard_id: update.assigned_guard_id,
            is_present: update.is_present,
            pay_rate: update.pay_rate
          })
          .eq('id', update.id);
      }

      // Fetch and return updated slots
      const { data: updatedSlots } = await supabase
        .from('daily_attendance_slots')
        .select('*')
        .in('id', newSlots.map(s => s.id));

      return updatedSlots || newSlots;
    }

    return newSlots;
  },

  // Auto-assign guards from previous day (without marking present)
  async autoAssignFromPreviousDay(newSlots: any[], siteId: string, currentDate: string) {
    // Calculate previous day
    const currentDateObj = new Date(currentDate);
    const previousDateObj = new Date(currentDateObj);
    previousDateObj.setDate(previousDateObj.getDate() - 1);
    const previousDate = previousDateObj.toISOString().split('T')[0];

    // Get previous day's slots with assignments
    const { data: previousSlots, error: fetchError } = await supabase
      .from('daily_attendance_slots')
      .select('*')
      .eq('site_id', siteId)
      .eq('attendance_date', previousDate)
      .not('assigned_guard_id', 'is', null);

    if (fetchError || !previousSlots || previousSlots.length === 0) {
      return newSlots;
    }

    const updates = [];

    for (const newSlot of newSlots) {
      // Find matching slot from previous day
      const matchingPreviousSlot = previousSlots.find(prevSlot => 
        prevSlot.role_type === newSlot.role_type &&
        prevSlot.slot_number === newSlot.slot_number &&
        prevSlot.shift_type === newSlot.shift_type
      );

      if (matchingPreviousSlot && matchingPreviousSlot.assigned_guard_id) {
        updates.push({
          id: newSlot.id,
          assigned_guard_id: matchingPreviousSlot.assigned_guard_id,
          pay_rate: matchingPreviousSlot.pay_rate || newSlot.pay_rate,
          is_temporary: matchingPreviousSlot.is_temporary || false
          // Note: is_present remains null - guards are assigned but not marked present
        });
      }
    }

    // Apply auto-assignments if any
    if (updates.length > 0) {
      for (const update of updates) {
        await supabase
          .from('daily_attendance_slots')
          .update({
            assigned_guard_id: update.assigned_guard_id,
            pay_rate: update.pay_rate,
            is_temporary: update.is_temporary
          })
          .eq('id', update.id);
      }

      // Fetch and return updated slots
      const { data: updatedSlots } = await supabase
        .from('daily_attendance_slots')
        .select('*')
        .in('id', newSlots.map(s => s.id));

      return updatedSlots || newSlots;
    }

    return newSlots;
  },

  // Get slots for a specific site and date
  async getSlotsBySiteAndDate(siteId: string, date: string) {
    const { data, error } = await supabase
      .from('daily_attendance_slots')
      .select(`
        *,
        guards:assigned_guard_id (
          id,
          name,
          badge_number
        )
      `)
      .eq('site_id', siteId)
      .eq('attendance_date', date)
      .order('shift_type')
      .order('role_type')
      .order('slot_number');

    if (error) throw error;
    return data || [];
  },

  // Assign guard to slot
  async assignGuardToSlot(slotId: string, guardId: string) {
    // Check if guard is already assigned to another slot for the same date and shift
    const { data: slot } = await supabase
      .from('daily_attendance_slots')
      .select('attendance_date, shift_type')
      .eq('id', slotId)
      .single();

    if (slot) {
      const { data: conflictingSlots } = await supabase
        .from('daily_attendance_slots')
        .select('id')
        .eq('assigned_guard_id', guardId)
        .eq('attendance_date', slot.attendance_date)
        .eq('shift_type', slot.shift_type)
        .neq('id', slotId);

      if (conflictingSlots && conflictingSlots.length > 0) {
        throw new Error('Guard is already assigned to another slot for this date and shift');
      }
    }

    const { data, error } = await supabase
      .from('daily_attendance_slots')
      .update({ assigned_guard_id: guardId })
      .eq('id', slotId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Replace guard in slot (resets attendance status)
  async replaceGuardInSlot(slotId: string, guardId: string) {
    // Check if guard is already assigned to another slot for the same date and shift
    const { data: slot } = await supabase
      .from('daily_attendance_slots')
      .select('attendance_date, shift_type')
      .eq('id', slotId)
      .single();

    if (slot) {
      const { data: conflictingSlots } = await supabase
        .from('daily_attendance_slots')
        .select('id')
        .eq('assigned_guard_id', guardId)
        .eq('attendance_date', slot.attendance_date)
        .eq('shift_type', slot.shift_type)
        .neq('id', slotId);

      if (conflictingSlots && conflictingSlots.length > 0) {
        throw new Error('Guard is already assigned to another slot for this date and shift');
      }
    }

    // Replace guard and reset attendance status
    const { data, error } = await supabase
      .from('daily_attendance_slots')
      .update({ 
        assigned_guard_id: guardId,
        is_present: null // Reset attendance status for new guard
      })
      .eq('id', slotId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Unassign guard from slot
  async unassignGuardFromSlot(slotId: string) {
    const { data, error } = await supabase
      .from('daily_attendance_slots')
      .update({ assigned_guard_id: null, is_present: null })
      .eq('id', slotId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Mark attendance
  async markAttendance(slotId: string, isPresent: boolean) {
    const { data, error } = await supabase
      .from('daily_attendance_slots')
      .update({ is_present: isPresent })
      .eq('id', slotId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update slot
  async updateSlot(slotId: string, updateData: UpdateSlotData) {
    const { data, error } = await supabase
      .from('daily_attendance_slots')
      .update(updateData)
      .eq('id', slotId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Copy slots from previous day and mark assigned guards as present
  async copySlotsFromPreviousDay(siteId: string, currentDate: string, previousDate: string) {
    // Get previous day's slots
    const { data: previousSlots, error: fetchError } = await supabase
      .from('daily_attendance_slots')
      .select('*')
      .eq('site_id', siteId)
      .eq('attendance_date', previousDate);

    if (fetchError) throw fetchError;

    if (!previousSlots || previousSlots.length === 0) {
      return [];
    }

    // Check if current date already has slots; if so, replace them to ensure a clean copy
    const { data: existingSlots } = await supabase
      .from('daily_attendance_slots')
      .select('id')
      .eq('site_id', siteId)
      .eq('attendance_date', currentDate);

    if (existingSlots && existingSlots.length > 0) {
      const { error: deleteError } = await supabase
        .from('daily_attendance_slots')
        .delete()
        .eq('site_id', siteId)
        .eq('attendance_date', currentDate);
      if (deleteError) throw deleteError;
    }

    // Create new slots for current date with assigned guards marked as present
    const newSlots = previousSlots.map(slot => ({
      site_id: slot.site_id,
      attendance_date: currentDate,
      shift_type: slot.shift_type,
      role_type: slot.role_type,
      slot_number: slot.slot_number,
      assigned_guard_id: slot.assigned_guard_id,
      pay_rate: slot.pay_rate,
      is_temporary: slot.is_temporary, // Preserve temporary status
      // Mark as present if guard was assigned, null if no guard assigned
      is_present: slot.assigned_guard_id ? true : null
    }));

    const { data: createdSlots, error: createError } = await supabase
      .from('daily_attendance_slots')
      .insert(newSlots)
      .select();

    if (createError) throw createError;
    return createdSlots;
  },

  // Force regenerate slots for a date (useful when site requirements change)
  async regenerateSlotsForDate(siteId: string, date: string) {
    return this.generateSlotsForDate(siteId, date, true);
  },
  async getSlotsByGuardAndDateRange(guardId: string, startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from('daily_attendance_slots')
      .select(`
        *,
        sites:site_id (
          id,
          site_name
        )
      `)
      .eq('assigned_guard_id', guardId)
      .gte('attendance_date', startDate)
      .lte('attendance_date', endDate)
      .order('attendance_date');

    if (error) throw error;
    return data || [];
  },

  // Create temporary slot
  async createTemporarySlot(slotData: CreateSlotData) {
    // Get the next slot number for this shift and role
    const { data: existingSlots } = await supabase
      .from('daily_attendance_slots')
      .select('slot_number')
      .eq('site_id', slotData.site_id)
      .eq('attendance_date', slotData.attendance_date)
      .eq('shift_type', slotData.shift_type)
      .eq('role_type', slotData.role_type)
      .order('slot_number', { ascending: false })
      .limit(1);

    const nextSlotNumber = existingSlots && existingSlots.length > 0 
      ? existingSlots[0].slot_number + 1 
      : 1;

    const { data, error } = await supabase
      .from('daily_attendance_slots')
      .insert({
        ...slotData,
        slot_number: nextSlotNumber,
        is_temporary: true
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update temporary slot
  async updateTemporarySlot(slotId: string, updateData: Partial<CreateSlotData>) {
    const { data, error } = await supabase
      .from('daily_attendance_slots')
      .update(updateData)
      .eq('id', slotId)
      .eq('is_temporary', true)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete temporary slot
  async deleteTemporarySlot(slotId: string) {
    const { error } = await supabase
      .from('daily_attendance_slots')
      .delete()
      .eq('id', slotId)
      .eq('is_temporary', true);

    if (error) throw error;
  },

  // Get temporary slots for a specific site and date
  async getTemporarySlots(siteId: string, date: string) {
    const { data, error } = await supabase
      .from('daily_attendance_slots')
      .select(`
        *,
        guards:assigned_guard_id (
          id,
          name,
          badge_number
        )
      `)
      .eq('site_id', siteId)
      .eq('attendance_date', date)
      .eq('is_temporary', true)
      .order('shift_type')
      .order('role_type')
      .order('slot_number');

    if (error) throw error;
    return data || [];
  }
};