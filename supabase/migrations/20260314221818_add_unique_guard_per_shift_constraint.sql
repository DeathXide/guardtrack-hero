-- Prevent a guard from being assigned to multiple slots for the same date and shift
-- across ANY site. This enforces at the database level that a guard can only work
-- one slot per shift per day, regardless of which site.
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_guard_per_shift
ON daily_attendance_slots (assigned_guard_id, attendance_date, shift_type)
WHERE assigned_guard_id IS NOT NULL;
