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
}

export interface UpdateSlotData {
  assigned_guard_id?: string | null;
  is_present?: boolean | null;
  pay_rate?: number | null;
}

export const dailyAttendanceSlotsApi = {
  // Generate slots for a specific site and date
  async generateSlotsForDate(siteId: string, date: string) {
    // First check if slots already exist for this date
    const { data: existingSlots } = await supabase
      .from('daily_attendance_slots')
      .select('*')
      .eq('site_id', siteId)
      .eq('attendance_date', date);

    if (existingSlots && existingSlots.length > 0) {
      return existingSlots;
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

  // Copy slots from previous day
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

    // Check if current date already has slots
    const { data: existingSlots } = await supabase
      .from('daily_attendance_slots')
      .select('id')
      .eq('site_id', siteId)
      .eq('attendance_date', currentDate);

    if (existingSlots && existingSlots.length > 0) {
      throw new Error('Slots already exist for this date');
    }

    // Create new slots for current date (without attendance marking)
    const newSlots = previousSlots.map(slot => ({
      site_id: slot.site_id,
      attendance_date: currentDate,
      shift_type: slot.shift_type,
      role_type: slot.role_type,
      slot_number: slot.slot_number,
      assigned_guard_id: slot.assigned_guard_id,
      pay_rate: slot.pay_rate
      // Don't copy is_present - it should be null for new day
    }));

    const { data: createdSlots, error: createError } = await supabase
      .from('daily_attendance_slots')
      .insert(newSlots)
      .select();

    if (createError) throw createError;
    return createdSlots;
  },

  // Get slots by guard and date range
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
  }
};