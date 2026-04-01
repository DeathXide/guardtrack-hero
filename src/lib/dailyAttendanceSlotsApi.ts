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
  guard_pay_override: number | null;
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

export interface ConflictInfo {
  guardId: string;
  guardName: string;
  badgeNumber: string;
  shiftType: 'day' | 'night';
  slots: {
    slotId: string;
    siteId: string;
    siteName: string;
  }[];
}

export interface SiteAttendanceSummary {
  siteId: string;
  siteName: string;
  organizationName: string;
  address: string;
  status: string;
  gstType: string | null;
  totalSlots: number;
  assignedSlots: number;
  presentGuards: number;
  absentGuards: number;
  pendingSlots: number;
  unfilledSlots: number;
  hasStaffingRequirements: boolean;
  slots: (DailyAttendanceSlot & { guards: { id: string; name: string; badge_number: string } | null })[];
}

export interface BulkStartDayResult {
  sitesProcessed: number;
  totalSlotsGenerated: number;
  guardsAssigned: number;
  guardsMarkedPresent: number;
  conflicts: ConflictInfo[];
  newSites: { siteId: string; siteName: string }[];
  skippedInactive: { guardId: string; guardName: string; siteName: string }[];
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

    // Insert the new slots (upsert to handle race conditions where slots already exist)
    const { data: newSlots, error: insertError } = await supabase
      .from('daily_attendance_slots')
      .upsert(slotsToCreate, {
        onConflict: 'site_id,attendance_date,shift_type,role_type,slot_number',
        ignoreDuplicates: true,
      })
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
  // Now checks cross-site conflicts and skips inactive guards
  async autoAssignFromPreviousDay(
    newSlots: any[],
    siteId: string,
    currentDate: string,
    alreadyAssignedGuardIds?: Set<string>,
    activeGuardIds?: Set<string>
  ) {
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

    // If no pre-fetched sets provided, fetch them (backward compatibility)
    if (!alreadyAssignedGuardIds) {
      const assigned = await this.getGuardIdsAssignedForDate(currentDate);
      alreadyAssignedGuardIds = assigned;
    }
    if (!activeGuardIds) {
      const { data: activeGuards } = await supabase
        .from('guards')
        .select('id')
        .eq('status', 'active');
      activeGuardIds = new Set((activeGuards || []).map(g => g.id));
    }

    const updates = [];
    // Track guard IDs assigned in this batch to prevent intra-batch conflicts
    const batchAssigned = new Set<string>();

    for (const newSlot of newSlots) {
      const matchingPreviousSlot = previousSlots.find(prevSlot =>
        prevSlot.role_type === newSlot.role_type &&
        prevSlot.slot_number === newSlot.slot_number &&
        prevSlot.shift_type === newSlot.shift_type
      );

      if (matchingPreviousSlot && matchingPreviousSlot.assigned_guard_id) {
        const guardId = matchingPreviousSlot.assigned_guard_id;
        const shiftKey = `${guardId}_${newSlot.shift_type}`;

        // Skip inactive guards
        if (!activeGuardIds.has(guardId)) continue;

        // Skip if guard already assigned elsewhere for this shift today
        if (alreadyAssignedGuardIds.has(shiftKey)) continue;

        // Skip if guard already assigned in this batch for same shift
        if (batchAssigned.has(shiftKey)) continue;

        updates.push({
          id: newSlot.id,
          assigned_guard_id: guardId,
          pay_rate: matchingPreviousSlot.pay_rate || newSlot.pay_rate,
          is_temporary: matchingPreviousSlot.is_temporary || false
        });

        batchAssigned.add(shiftKey);
        alreadyAssignedGuardIds.add(shiftKey);
      }
    }

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

  // Assign guard to slot (with race condition protection)
  async assignGuardToSlot(slotId: string, guardId: string) {
    // Verify slot exists and is still unassigned
    const { data: slot, error: slotError } = await supabase
      .from('daily_attendance_slots')
      .select('attendance_date, shift_type, assigned_guard_id')
      .eq('id', slotId)
      .single();

    if (slotError || !slot) {
      throw new Error('Slot not found — it may have been deleted or is no longer available');
    }

    if (slot.assigned_guard_id) {
      throw new Error('This slot was already assigned by another user. Please refresh and try again.');
    }

    // Check if guard is active before assigning
    const { data: guardData, error: guardError } = await supabase
      .from('guards')
      .select('status, name')
      .eq('id', guardId)
      .single();

    if (guardError || !guardData) {
      throw new Error('Guard not found');
    }

    if (guardData.status !== 'active') {
      throw new Error(`Cannot assign ${guardData.name} — guard is currently ${guardData.status}`);
    }

    // Check if guard is already assigned to another slot for the same date and shift
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

    // Atomic update: only assign if slot is still empty (prevents race condition)
    const { data, error } = await supabase
      .from('daily_attendance_slots')
      .update({ assigned_guard_id: guardId })
      .eq('id', slotId)
      .is('assigned_guard_id', null)
      .select()
      .single();

    if (error) {
      // If no rows matched, another admin assigned this slot between our check and update
      if (error.code === 'PGRST116') {
        throw new Error('This slot was just assigned by another user. Please refresh and try again.');
      }
      throw error;
    }
    return data;
  },

  // Replace guard in slot (resets attendance status, with race condition protection)
  async replaceGuardInSlot(slotId: string, guardId: string) {
    // Fetch slot with current guard to verify state hasn't changed
    const { data: slot, error: slotError } = await supabase
      .from('daily_attendance_slots')
      .select('attendance_date, shift_type, assigned_guard_id')
      .eq('id', slotId)
      .single();

    if (slotError || !slot) {
      throw new Error('Slot not found — it may have been deleted or is no longer available');
    }

    const currentGuardId = slot.assigned_guard_id;

    // Check if replacement guard is active
    const { data: guardData, error: guardError } = await supabase
      .from('guards')
      .select('status, name')
      .eq('id', guardId)
      .single();

    if (guardError || !guardData) {
      throw new Error('Guard not found');
    }

    if (guardData.status !== 'active') {
      throw new Error(`Cannot assign ${guardData.name} — guard is currently ${guardData.status}`);
    }

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

    // Replace guard with optimistic locking: verify the guard we're replacing is still there
    const updateQuery = supabase
      .from('daily_attendance_slots')
      .update({
        assigned_guard_id: guardId,
        is_present: null // Reset attendance status for new guard
      })
      .eq('id', slotId);

    // If there was a guard, verify they're still assigned (prevents race with another admin)
    if (currentGuardId) {
      updateQuery.eq('assigned_guard_id', currentGuardId);
    }

    const { data, error } = await updateQuery.select().single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('This slot was just modified by another user. Please refresh and try again.');
      }
      throw error;
    }
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
      .upsert(newSlots, {
        onConflict: 'site_id,attendance_date,shift_type,role_type,slot_number',
      })
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
  },

  // ============================================================
  // BULK OPERATIONS — Cross-site attendance management
  // ============================================================

  // Get a Set of "guardId_shiftType" keys for all guards assigned on a given date
  async getGuardIdsAssignedForDate(date: string): Promise<Set<string>> {
    const { data, error } = await supabase
      .from('daily_attendance_slots')
      .select('assigned_guard_id, shift_type')
      .eq('attendance_date', date)
      .not('assigned_guard_id', 'is', null);

    if (error) throw error;
    return new Set((data || []).map(s => `${s.assigned_guard_id}_${s.shift_type}`));
  },

  // Get guard IDs assigned for a specific date and shift (used by guard selection modal)
  async getGuardIdsAssignedForShift(date: string, shiftType: 'day' | 'night'): Promise<Map<string, string>> {
    const { data, error } = await supabase
      .from('daily_attendance_slots')
      .select(`
        assigned_guard_id,
        sites:site_id (
          site_name
        )
      `)
      .eq('attendance_date', date)
      .eq('shift_type', shiftType)
      .not('assigned_guard_id', 'is', null);

    if (error) throw error;

    // Map of guardId -> siteName where they're assigned
    const result = new Map<string, string>();
    for (const slot of data || []) {
      if (slot.assigned_guard_id && slot.sites) {
        result.set(slot.assigned_guard_id, (slot.sites as any).site_name);
      }
    }
    return result;
  },

  // Detect guards assigned to multiple sites for the same shift on a given date
  async detectConflicts(date: string): Promise<ConflictInfo[]> {
    const { data: allSlots, error } = await supabase
      .from('daily_attendance_slots')
      .select(`
        id,
        site_id,
        shift_type,
        assigned_guard_id,
        sites:site_id ( site_name ),
        guards:assigned_guard_id ( id, name, badge_number )
      `)
      .eq('attendance_date', date)
      .not('assigned_guard_id', 'is', null);

    if (error) throw error;
    if (!allSlots || allSlots.length === 0) return [];

    // Group by guardId + shiftType
    const guardShiftMap = new Map<string, typeof allSlots>();
    for (const slot of allSlots) {
      const key = `${slot.assigned_guard_id}_${slot.shift_type}`;
      if (!guardShiftMap.has(key)) {
        guardShiftMap.set(key, []);
      }
      guardShiftMap.get(key)!.push(slot);
    }

    // Find entries with count > 1 (conflicts)
    const conflicts: ConflictInfo[] = [];
    for (const [, slots] of Array.from(guardShiftMap)) {
      if (slots.length > 1) {
        const guard = slots[0].guards as any;
        conflicts.push({
          guardId: guard.id,
          guardName: guard.name,
          badgeNumber: guard.badge_number,
          shiftType: slots[0].shift_type as 'day' | 'night',
          slots: slots.map(s => ({
            slotId: s.id,
            siteId: s.site_id,
            siteName: (s.sites as any).site_name,
          }))
        });
      }
    }

    return conflicts;
  },

  // Get attendance summary for ALL sites on a given date
  async getAllSitesAttendanceSummary(date: string, shiftType?: 'day' | 'night'): Promise<SiteAttendanceSummary[]> {
    // Fetch all active sites
    const { data: sites, error: sitesError } = await supabase
      .from('sites')
      .select('id, site_name, organization_name, address, status, gst_type')
      .in('status', ['active', 'temp'])
      .order('site_name');

    if (sitesError) throw sitesError;

    // Fetch all staffing requirements
    const { data: allStaffingReqs, error: staffingError } = await supabase
      .from('staffing_requirements')
      .select('site_id');

    if (staffingError) throw staffingError;

    const sitesWithRequirements = new Set((allStaffingReqs || []).map(r => r.site_id));

    // Fetch all slots for the date with guard info
    let slotsQuery = supabase
      .from('daily_attendance_slots')
      .select(`
        *,
        guards:assigned_guard_id (
          id,
          name,
          badge_number
        )
      `)
      .eq('attendance_date', date);

    if (shiftType) {
      slotsQuery = slotsQuery.eq('shift_type', shiftType);
    }

    const { data: allSlots, error: slotsError } = await slotsQuery
      .order('shift_type')
      .order('role_type')
      .order('slot_number');

    if (slotsError) throw slotsError;

    // Group slots by site_id
    const slotsBySite = new Map<string, typeof allSlots>();
    for (const slot of allSlots || []) {
      if (!slotsBySite.has(slot.site_id)) {
        slotsBySite.set(slot.site_id, []);
      }
      slotsBySite.get(slot.site_id)!.push(slot);
    }

    // Build summaries
    const summaries: SiteAttendanceSummary[] = (sites || []).map(site => {
      const siteSlots = slotsBySite.get(site.id) || [];
      const totalSlots = siteSlots.length;
      const assignedSlots = siteSlots.filter(s => s.assigned_guard_id).length;
      const presentGuards = siteSlots.filter(s => s.is_present === true).length;
      const absentGuards = siteSlots.filter(s => s.is_present === false).length;
      const pendingSlots = assignedSlots - presentGuards - absentGuards;
      const unfilledSlots = totalSlots - assignedSlots;

      return {
        siteId: site.id,
        siteName: site.site_name,
        organizationName: site.organization_name,
        address: site.address || '',
        status: site.status,
        gstType: site.gst_type || null,
        totalSlots,
        assignedSlots,
        presentGuards,
        absentGuards,
        pendingSlots,
        unfilledSlots,
        hasStaffingRequirements: sitesWithRequirements.has(site.id),
        slots: siteSlots as any,
      };
    });

    // Sort: needs attention first (pending > 0 or absent > 0 or unfilled > 0), then all-good
    summaries.sort((a, b) => {
      const aNeedsAttention = a.pendingSlots > 0 || a.absentGuards > 0 || a.unfilledSlots > 0 ? 1 : 0;
      const bNeedsAttention = b.pendingSlots > 0 || b.absentGuards > 0 || b.unfilledSlots > 0 ? 1 : 0;
      if (aNeedsAttention !== bNeedsAttention) return bNeedsAttention - aNeedsAttention;
      return a.siteName.localeCompare(b.siteName);
    });

    return summaries;
  },

  // Bulk "Start Day": generate slots for all sites, copy yesterday, mark all present
  async bulkStartDay(date: string): Promise<BulkStartDayResult> {
    const result: BulkStartDayResult = {
      sitesProcessed: 0,
      totalSlotsGenerated: 0,
      guardsAssigned: 0,
      guardsMarkedPresent: 0,
      conflicts: [],
      newSites: [],
      skippedInactive: [],
    };

    // Get all active sites
    const { data: sites, error: sitesError } = await supabase
      .from('sites')
      .select('id, site_name')
      .in('status', ['active', 'temp']);

    if (sitesError) throw sitesError;
    if (!sites || sites.length === 0) return result;

    // Get all active guard IDs
    const { data: activeGuards, error: guardsError } = await supabase
      .from('guards')
      .select('id')
      .eq('status', 'active');

    if (guardsError) throw guardsError;
    const activeGuardIds = new Set((activeGuards || []).map(g => g.id));

    // Calculate previous day
    const currentDateObj = new Date(date);
    const previousDateObj = new Date(currentDateObj);
    previousDateObj.setDate(previousDateObj.getDate() - 1);
    const previousDate = previousDateObj.toISOString().split('T')[0];

    // Check which sites already have slots for today
    const { data: existingSlotsCheck } = await supabase
      .from('daily_attendance_slots')
      .select('site_id')
      .eq('attendance_date', date);

    const sitesWithExistingSlots = new Set((existingSlotsCheck || []).map(s => s.site_id));

    // Check which sites had slots yesterday (to detect new sites)
    const { data: previousDayCheck } = await supabase
      .from('daily_attendance_slots')
      .select('site_id')
      .eq('attendance_date', previousDate);

    const sitesWithPreviousDay = new Set((previousDayCheck || []).map(s => s.site_id));

    // Get all staffing requirements
    const { data: allStaffingReqs } = await supabase
      .from('staffing_requirements')
      .select('*');

    const staffingBySite = new Map<string, any[]>();
    for (const req of allStaffingReqs || []) {
      if (!staffingBySite.has(req.site_id)) {
        staffingBySite.set(req.site_id, []);
      }
      staffingBySite.get(req.site_id)!.push(req);
    }

    // Get all previous day slots
    const { data: allPreviousSlots } = await supabase
      .from('daily_attendance_slots')
      .select('*')
      .eq('attendance_date', previousDate)
      .not('assigned_guard_id', 'is', null);

    const previousSlotsBySite = new Map<string, any[]>();
    for (const slot of allPreviousSlots || []) {
      if (!previousSlotsBySite.has(slot.site_id)) {
        previousSlotsBySite.set(slot.site_id, []);
      }
      previousSlotsBySite.get(slot.site_id)!.push(slot);
    }

    // Get all inactive guards that were assigned yesterday (for skip reporting)
    const { data: inactiveGuards } = await supabase
      .from('guards')
      .select('id, name')
      .eq('status', 'inactive');

    const inactiveGuardMap = new Map<string, string>();
    for (const g of inactiveGuards || []) {
      inactiveGuardMap.set(g.id, g.name);
    }

    // Track assigned guards across all sites: Set of "guardId_shiftType"
    const globalAssigned = new Set<string>();

    // Process each site
    for (const site of sites) {
      const staffingReqs = staffingBySite.get(site.id);

      // Skip sites with no staffing requirements
      if (!staffingReqs || staffingReqs.length === 0) continue;

      // Detect new sites
      if (!sitesWithPreviousDay.has(site.id)) {
        result.newSites.push({ siteId: site.id, siteName: site.site_name });
      }

      // If slots already exist for today, just load them and track assignments
      if (sitesWithExistingSlots.has(site.id)) {
        const { data: existing } = await supabase
          .from('daily_attendance_slots')
          .select('assigned_guard_id, shift_type')
          .eq('site_id', site.id)
          .eq('attendance_date', date)
          .not('assigned_guard_id', 'is', null);

        for (const s of existing || []) {
          globalAssigned.add(`${s.assigned_guard_id}_${s.shift_type}`);
        }
        result.sitesProcessed++;
        result.totalSlotsGenerated += (existing || []).length;
        continue;
      }

      // Generate slots based on staffing requirements
      const slotsToCreate: CreateSlotData[] = [];
      for (const req of staffingReqs) {
        for (let i = 1; i <= req.day_slots; i++) {
          slotsToCreate.push({
            site_id: site.id,
            attendance_date: date,
            shift_type: 'day',
            role_type: req.role_type,
            slot_number: i,
            pay_rate: req.budget_per_slot,
          });
        }
        for (let i = 1; i <= req.night_slots; i++) {
          slotsToCreate.push({
            site_id: site.id,
            attendance_date: date,
            shift_type: 'night',
            role_type: req.role_type,
            slot_number: i,
            pay_rate: req.budget_per_slot,
          });
        }
      }

      if (slotsToCreate.length === 0) continue;

      // Insert slots (upsert to handle race conditions)
      const { data: newSlots, error: insertError } = await supabase
        .from('daily_attendance_slots')
        .upsert(slotsToCreate, {
          onConflict: 'site_id,attendance_date,shift_type,role_type,slot_number',
          ignoreDuplicates: true,
        })
        .select();

      if (insertError) throw insertError;
      if (!newSlots) continue;

      result.sitesProcessed++;
      result.totalSlotsGenerated += newSlots.length;

      // Auto-assign from previous day with conflict checking
      const previousSlots = previousSlotsBySite.get(site.id) || [];
      if (previousSlots.length > 0) {
        const updates: { id: string; assigned_guard_id: string; pay_rate: number | null; is_present: true }[] = [];

        for (const newSlot of newSlots) {
          const match = previousSlots.find(p =>
            p.role_type === newSlot.role_type &&
            p.slot_number === newSlot.slot_number &&
            p.shift_type === newSlot.shift_type
          );

          if (!match || !match.assigned_guard_id) continue;

          const guardId = match.assigned_guard_id;
          const shiftKey = `${guardId}_${newSlot.shift_type}`;

          // Skip inactive guards
          if (!activeGuardIds.has(guardId)) {
            const guardName = inactiveGuardMap.get(guardId);
            if (guardName) {
              result.skippedInactive.push({
                guardId,
                guardName,
                siteName: site.site_name,
              });
            }
            continue;
          }

          // Skip if guard already assigned elsewhere for this shift
          if (globalAssigned.has(shiftKey)) continue;

          updates.push({
            id: newSlot.id,
            assigned_guard_id: guardId,
            pay_rate: match.pay_rate || newSlot.pay_rate,
            is_present: true, // Mark present as part of Start Day
          });

          globalAssigned.add(shiftKey);
          result.guardsAssigned++;
          result.guardsMarkedPresent++;
        }

        // Apply assignments in batch
        for (const update of updates) {
          await supabase
            .from('daily_attendance_slots')
            .update({
              assigned_guard_id: update.assigned_guard_id,
              pay_rate: update.pay_rate,
              is_present: update.is_present,
            })
            .eq('id', update.id);
        }
      }
    }

    // Detect any conflicts (shouldn't happen with our logic, but safety check)
    result.conflicts = await this.detectConflicts(date);

    return result;
  },

  // Mark all assigned+pending guards as present across all sites for a date
  async markAllPresentBulk(date: string, shiftType?: 'day' | 'night'): Promise<number> {
    let query = supabase
      .from('daily_attendance_slots')
      .update({ is_present: true })
      .eq('attendance_date', date)
      .not('assigned_guard_id', 'is', null)
      .is('is_present', null);

    if (shiftType) {
      query = query.eq('shift_type', shiftType);
    }

    const { data, error } = await query.select('id');

    if (error) throw error;
    return (data || []).length;
  },

  // Mark all assigned+pending guards for a single site as present
  async markAllPresentForSite(siteId: string, date: string, shiftType?: 'day' | 'night'): Promise<number> {
    let query = supabase
      .from('daily_attendance_slots')
      .update({ is_present: true })
      .eq('site_id', siteId)
      .eq('attendance_date', date)
      .not('assigned_guard_id', 'is', null)
      .is('is_present', null);

    if (shiftType) {
      query = query.eq('shift_type', shiftType);
    }

    const { data, error } = await query.select('id');

    if (error) throw error;
    return (data || []).length;
  },

  // Resolve a conflict by keeping a guard at one site and unassigning from others
  // Uses guard ID verification to prevent race conditions with concurrent resolutions
  async resolveConflict(guardId: string, date: string, shiftType: 'day' | 'night', keepAtSiteId: string): Promise<void> {
    // Find all slots for this guard on this date+shift
    const { data: slots, error } = await supabase
      .from('daily_attendance_slots')
      .select('id, site_id')
      .eq('assigned_guard_id', guardId)
      .eq('attendance_date', date)
      .eq('shift_type', shiftType);

    if (error) throw error;

    if (!slots || slots.length === 0) {
      throw new Error('Conflict already resolved — this guard is no longer assigned to multiple sites.');
    }

    // Verify guard is still at the keep site
    const keepSlot = slots.find(s => s.site_id === keepAtSiteId);
    if (!keepSlot) {
      throw new Error('Guard is no longer assigned at the selected site. Please refresh and try again.');
    }

    // Unassign from all sites except the chosen one
    // Include assigned_guard_id check to prevent unassigning if another admin already resolved
    for (const slot of slots) {
      if (slot.site_id !== keepAtSiteId) {
        await supabase
          .from('daily_attendance_slots')
          .update({ assigned_guard_id: null, is_present: null })
          .eq('id', slot.id)
          .eq('assigned_guard_id', guardId); // Only unassign if guard is still there
      }
    }
  }
};