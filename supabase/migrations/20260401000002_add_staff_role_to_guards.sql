-- =============================================================
-- Add staff_role column to guards table
-- Tracks the primary role of each staff member
-- (Security Guard, Supervisor, Housekeeping, etc.)
-- =============================================================

ALTER TABLE guards
  ADD COLUMN IF NOT EXISTS staff_role TEXT NOT NULL DEFAULT 'Security Guard';

-- Validate against known role types
ALTER TABLE guards
  ADD CONSTRAINT chk_staff_role
  CHECK (
    staff_role IN (
      'Security Guard',
      'Supervisor',
      'Housekeeping',
      'Receptionist',
      'Maintenance',
      'Office Boy',
      'Other'
    )
  );

-- Index for filtering by role
CREATE INDEX IF NOT EXISTS idx_guards_staff_role ON guards (staff_role);
