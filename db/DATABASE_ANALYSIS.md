# Database Analysis: Security Staff Management System (SSF)

This is a **security guard staffing and management system** (Indian market — uses GST, Aadhaar, PAN, IFSC, UPI, Indian financial year April-March). It manages sites/clients, guards, shift scheduling, attendance tracking, payments, invoicing, and leave requests.

---

## Tables (14 total)

| Table | Purpose | Rows |
|---|---|---|
| `sites` | Client locations that need security coverage | 0 |
| `guards` | Security guard employee records | 0 |
| `shifts` | Recurring guard-to-site shift assignments | 0 |
| `staffing_requirements` | How many guards a site needs per role/shift | 0 |
| `daily_attendance_slots` | Materialized daily slots generated from staffing requirements | 0 |
| `attendance_records` | Actual check-in/check-out attendance data | 0 |
| `attendance_settings` | Per-site configuration (geo-fencing, shift times, grace periods) | 0 |
| `leave_requests` | Guard leave applications with approval workflow | 0 |
| `payments` | Bonus/deduction records for guards | 0 |
| `invoices` | Client-facing invoices with GST breakdown | 0 |
| `invoice_sequences` | Auto-incrementing invoice numbers per financial year | 0 |
| `site_utility_charges` | Additional recurring charges billed to sites | 0 |
| `company_settings` | Global company profile (name, logo, GST, seal image) | 0 |
| `employee_types` | Lookup table for employee type categories | 0 |
| `profiles` | User accounts linked to Supabase auth | 0 |

> All tables have 0 rows — this is a freshly-built schema with no data yet.

---

## Entity Relationship Map

```
                         auth.users
                              |
                              | 1:1 (user_id)
                              v
                          profiles
                     (admin/supervisor/guard/ca)


        sites (central hub)
       /    |     \       \          \
      /     |      \       \          \
     v      v       v       v          v
 shifts  staffing  attendance  attendance  site_utility
         requirements  settings   records     charges
   |        |                       |
   |        |                       |
   v        v                       v
 guards  (day_slots,            daily_attendance
         night_slots)              slots
   |                                |
   |                                v
   +-----> payments             (assigned_guard_id)
   |
   +-----> leave_requests

        invoices  <-->  invoice_sequences
```

---

## Foreign Key Relationships (11 total)

| Source | Column | Target | Meaning |
|---|---|---|---|
| `attendance_records` | `employee_id` | `guards.id` | Which guard the record belongs to |
| `attendance_records` | `site_id` | `sites.id` | Which site the attendance is for |
| `attendance_records` | `slot_id` | `daily_attendance_slots.id` | Links to the specific daily slot |
| `attendance_records` | `original_record_id` | `attendance_records.id` | **Self-referencing** — correction records point to the original |
| `attendance_settings` | `site_id` | `sites.id` | 1:1 settings per site |
| `daily_attendance_slots` | `site_id` | `sites.id` | Which site the slot belongs to |
| `daily_attendance_slots` | `assigned_guard_id` | `guards.id` | Which guard fills this slot |
| `shifts` | `site_id` | `sites.id` | Which site the shift is at |
| `shifts` | `guard_id` | `guards.id` | Which guard is assigned |
| `staffing_requirements` | `site_id` | `sites.id` | Which site needs staffing |
| `payments` | `guard_id` | `guards.id` | Which guard gets the payment |
| `profiles` | `user_id` | `auth.users.id` | Links profile to Supabase auth user |

---

## Custom Enum Types

| Type | Values |
|---|---|
| `gender_type` | male, female, other |
| `guard_status` | active, inactive |
| `guard_type` | permanent, contract |
| `payment_type` | bonus, deduction |

Additional check constraints act as inline enums:

- **shift_type**: `day`, `night`
- **attendance status**: `scheduled`, `present`, `absent`, `late`, `early_departure`, `on_leave`, `overtime`
- **leave_type**: `sick`, `vacation`, `personal`, `emergency`, `maternity`, `paternity`
- **leave status**: `pending`, `approved`, `rejected`, `cancelled`
- **invoice status**: `draft`, `sent`, `paid`, `overdue`
- **site status**: `active`, `inactive`, `temp`
- **gst_type**: `GST`, `NGST`, `RCM`, `PERSONAL`
- **profile role**: `admin`, `supervisor`, `guard`, `ca`
- **rate_type**: `monthly`, `shift`

---

## Key Business Logic (Functions & Triggers)

| Function | Purpose |
|---|---|
| `handle_new_user()` | **Auth trigger** — auto-creates a profile row when a new user signs up (defaults role to `admin`) |
| `generate_badge_number()` | Auto-generates badge numbers like `SSF-25-001`, incrementing per year |
| `set_badge_number()` | **Trigger on guards INSERT** — calls `generate_badge_number()` if badge is null/empty |
| `check_monthly_invoice_constraint()` | **Trigger on invoices INSERT/UPDATE** — prevents duplicate invoices for the same site+month |
| `get_next_invoice_number()` | Generates sequential invoice numbers like `INV-2025-26-001` per financial year (April-March) |
| `get_current_financial_year()` | Returns Indian financial year string (e.g., `2025-26`) |
| `profile_is_admin()` | Checks if user has `admin` role |
| `is_admin_or_supervisor()` | Checks if user has `admin` or `supervisor` role |
| `get_user_role()` | Returns the user's role from profiles |
| `get_current_user_guard_id()` | Maps the current auth user to their guard record (via name/email matching) |
| `update_updated_at_column()` | **Trigger on all tables** — auto-updates `updated_at` timestamp |

---

## Row Level Security (RLS)

RLS is **enabled on all 14 tables**. The access pattern follows a 4-role hierarchy:

| Role | Access Level |
|---|---|
| **admin** | Full CRUD on everything |
| **supervisor** | Full CRUD on operational tables (guards, shifts, attendance, staffing, sites, leave) |
| **ca** (chartered accountant) | Read-only on invoices |
| **guard** | Read-only on their own records (attendance, payments, profile, leave requests); can create/manage their own leave requests |

---

## Unique Constraints & Business Rules

1. **One attendance record per guard per site per day per shift**: `(employee_id, employee_type, site_id, attendance_date, shift_type)` is unique
2. **One slot per position per day**: `(site_id, attendance_date, shift_type, role_type, slot_number)` is unique on `daily_attendance_slots`
3. **One shift per guard per site per type**: `(site_id, guard_id, type)` is unique on `shifts`
4. **One settings record per site**: `site_id` is unique on `attendance_settings`
5. **One invoice per site per month**: enforced by trigger `check_monthly_invoice_constraint`
6. **Unique badge numbers**: auto-generated as `SSF-YY-NNN`
7. **Unique invoice numbers**: auto-generated as `INV-YYYY-YY-NNN` per financial year

---

## Indexing Strategy

Well-indexed for the expected query patterns:

- `daily_attendance_slots`: indexed on `(site_id, attendance_date)`, `(attendance_date, shift_type)`, `(assigned_guard_id)`, and `(site_id, attendance_date, is_temporary)`
- `guards`: indexed on `badge_number`, `guard_type`, `status`
- `payments`: indexed on `guard_id`, `payment_date`, `payment_month`
- `invoices`: indexed on `(site_id, period_from, period_to)`
- `sites`: indexed on `site_name`, `organization_name`, `status`

---

## Notable Design Observations

1. **`leave_requests` has no FK to `guards`** — the `employee_id` column references guards conceptually but has no enforced foreign key constraint. This could allow orphaned records.

2. **`invoices` has no FK to `sites`** — the `site_id` column exists but there's no foreign key constraint. The invoice stores denormalized copies of `site_name`, `site_gst`, `company_name`, etc. (this is a common pattern for invoices that should remain immutable even if site details change).

3. **`site_utility_charges` has no FK to `sites`** — same pattern, the `site_id` column lacks a foreign key constraint.

4. **Guard-to-User mapping is name-based** — the `get_current_user_guard_id()` function matches guards to auth users by comparing `guards.name` to `profiles.full_name` or via fuzzy email matching. This is fragile — a direct `guard_id` FK on profiles would be more robust.

5. **`employee_type` column on attendance/leave tables** — defaults to `'guard'` suggesting the system was designed to potentially support other employee types beyond guards, but this isn't fully built out yet.

6. **Two scheduling models coexist**: `shifts` (recurring assignments) and `daily_attendance_slots` (materialized daily records). The slots appear to be generated from `staffing_requirements` and then linked to `attendance_records`.

7. **43 migrations** have been applied, all unnamed — suggests rapid iterative development.

8. **All tables are empty** — the schema is deployed but not yet in production use.
